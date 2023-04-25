'use strict';

const async = require('async');
const _ = require('lodash');
const logger = require('./logger');
const sortByArray = require('./sort-by-array');

const engineClasses = {
    Bitbucket: require('./bitbucket'),
    Gitlab: require('./gitlab'),
    Jira: require('./jira'),
    Jenkins: require('./jenkins'),
    JenkinsPromote: require('./jenkins-promote')
};

class MergedApis {
    constructor(config) {
        this.engines = {};
        for (let engineName in config.get('engines')) {
            const engineConfig = config.api(engineName);
            if (!engineConfig.class) continue;
            const Class = engineClasses[engineConfig.class];
            if (!Class) throw new Error('Unknown engine class for ' + engineName + ': ' + engineConfig.class);
            this.engines[engineName] = new Class(engineConfig, engineName);
        }
        this.projects = [];
        const projects = config.get('projects');
        for (let projectPatern in projects) {
            const project = projects[projectPatern];
            const set = {
                name: projectPatern,
                pattern: new RegExp('^' + projectPatern + '$'),
                api: {}
            };
            project.engines.forEach(engineName => {
                const engine = this.engines[engineName];
                if (!engine || !engine.type) throw new Error('Engine not found for project ' + projectPatern + ': ' + engineName);
                engine.addEngine(set.api);
            });
            this.projects.push(set);
        }
    }

    log() {
        logger.log.apply(logger, arguments);
    }
    error() {
        logger.error.apply(logger, arguments);
    }

    getApis(project) {
        for (let set of this.projects) {
            if (project.match(set.pattern)) {
                return set.api;
            }
        }
    }

    getData(project, options, cb) {
        options = _.extend({
            count: 200
        }, options);

        const api = this.getApis(project);
        if (!api) return cb(new Error('No project set found for: ' + project));

        const data = {
            api,
            options,
            project,
            releases: [],
            promotions: {},
            tickets: {}
        };

        async.series([
            done => this.getReleasesAndTickets(data, project, done),
            done => this.getTicketProjects(data, project, done),
            done => this.getBuilds(data, project, done),
            done => this.getProductionPromotions(data, project, done),
            done => this.getPromotions(data, project, done),
            done => this.getRoughPromotions(data, project, done),
            done => this.getReleaseUpdatedModules(data, project, done),
            done => this.mergeDuplicateTickets(data, done),
            done => this.getProductionPromoteLink(data, project, done),
            done => this.removeEmptyReleases(data, project, done)
        ], err => {
            cb(err, data);
        });
    }

    getReleasesAndTickets(data, project, cb) {
        if (!data.api.scm) return cb();
        data.api.scm.getReleasesAndTickets(project, data.options.count, (err, body) => {
            if (err) return cb(err);

            data.releases = body.releases;
            data.tickets = body.tickets;
            data.promotions = body.promotions;

            async.eachLimit(data.tickets, data.api.scm.config.concurrent, (ticket, done) => this.getTicket(data, ticket, done), cb);
        });
    }

    getTicketProjects(data, project, cb) {
        if (!data.api.scm) return cb();
        data.api.scm.getTicketProjects(project, data.tickets, cb);
    }

    getReleaseUpdatedModules(data, project, cb) {
        if (!data.api.scm) return cb();
        data.api.scm.getReleaseModules(project, data.releases, err => {
            if (err) return cb();

            let lastModules = {};
            data.releases.slice().reverse().forEach(release => {
                release.updates = [];
                _.each(release.modules, (version, module) => {
                    if (lastModules[module] && lastModules[module] !== version) {
                        release.updates.push({ module, version });
                    }
                });
                release.updates = _.sortBy(release.updates, 'module');
                lastModules = release.modules || {};
            });

            cb();
        });
    }

    mergeDuplicateTickets(data, cb) {
        let tickets = {};

        _.each(data.tickets, ticket => {
            if (ticket.key) {
                ticket.id = ticket.key;
                let duplicate = tickets[ticket.id];
                if (duplicate) {
                    duplicate.releases = _.uniq(duplicate.releases.concat(ticket.releases));
                    duplicate.releases.sort(sortByArray(data.releases, 'id'));
                    duplicate.commits = duplicate.commits.concat(ticket.commits).sort((a, b) => b.date - a.date);
                    _.extend(duplicate.merges, ticket.merges);
                    return;
                }
            }
            tickets[ticket.id] = ticket;
        });

        data.tickets = tickets;

        cb();
    }

    getTicket(data, ticket, cb) {
        if (!data.api.ticket) return cb();
        if (ticket.status === 'NOTICKET') return cb();

        const engine = data.api.ticket.getAlternativeEngine(ticket.id);

        engine.getIssueStatus(ticket.id, (err, body) => {
            if (err) return cb(/*err*/);

            _.extend(ticket, body);
            cb();
        });
    }

    getBuilds(data, project, cb) {
        if (!data.api.ci) return cb();
        data.api.ci.getBuildStatuses(project, (err, body) => {
            if (err) return cb(/*err*/);

            _.each(data.releases, release => {
                release.builds = _.map(release.builds, releaseBuild => {
                    if (releaseBuild.link) {
                        let build = _.find(body.builds, { link: releaseBuild.link });
                        if (build) return build;
                    }
                    let build = _.find(body.builds, { id: releaseBuild.id });
                    if (build) return build;
                    return releaseBuild;
                });
            });

            cb();
        });
    }

    getProductionPromotions(data, project, cb) {
        if (!data.api.productionCI) return cb();
        data.api.productionCI.getPromotePromotions(project, (err, body) => {
            if (err) return cb(/*err*/);

            data.promotions = _.defaults(data.promotions, body.promotions);

            cb();
        });
    }

    getProductionPromoteLink(data, project, cb) {
        if (!data.api.productionCI) return cb();
        let stgBuildId = data.promotions['stg'] && data.promotions['stg'].buildId;
        let stgBuild;
        _.find(data.releases, release => stgBuild = _.find(release.builds, { id: stgBuildId }));
        let prdBuildId = data.promotions['prd'] && data.promotions['prd'].buildId;
        if (stgBuild && stgBuildId !== prdBuildId) {
            stgBuild.promoteLink = data.api.productionCI.getPromoteLink(project, stgBuildId, 'prd');
        }
        cb();
    }


    getPromotions(data, project, cb) {
        if (!data.api.ci) return cb();
        data.api.ci.getBuildPromotions(project, (err, body) => {
            if (err) return cb(/*err*/);

            data.promotions = _.defaults(data.promotions, body.promotions);

            cb();
        });
    }

    getRoughPromotions(data, project, cb) {
        if (!data.api.ci) return cb();
        data.api.ci.getRoughBuildPromotions(project, (err, body) => {
            if (err) return cb(/*err*/);

            data.promotions = _.defaults(data.promotions, body.promotions);

            cb();
        });
    }

    removeEmptyReleases(data, project, cb) {
        let keepBuilds = {};
        _.each(data.tickets, ticket => {
            _.each(ticket.releases, id => keepBuilds[id] = true);
        });
        data.releases = _.filter(data.releases, release => {
            if (keepBuilds[release.id]) return true;
            if (_.find(release.builds, build => build.result === 'SUCCESS')) return true;
            if (release.updates && release.updates.length) return true;
        });
        cb();
    }
}

module.exports = MergedApis;


