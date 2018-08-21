'use strict';

const Gitlab = require('./gitlab');
const Jira = require('./jira');
const Jenkins = require('./jenkins');
const JenkinsPromote = require('./jenkins-promote');
const async = require('async');
const _ = require('lodash');
const logger = require('./logger');
const sortByArray = require('./sort-by-array');

class MergedApis {
    constructor(config) {
        this.gitlabApi = new Gitlab(config.get('gitlab'));
        this.jiraApi = new Jira(config.get('jira'));
        this.jenkinsApi = new Jenkins(config.get('jenkins'));
        if (config.get('jenkinsOld.credentials')) {
            this.jenkinsOldApi = new Jenkins(config.get('jenkinsOld'));
        }
        this.jenkinsPromoteApi = new JenkinsPromote(config.get('jenkinsPromote'));
    }

    log() {
        logger.log.apply(logger, arguments);
    }
    error() {
        logger.error.apply(logger, arguments);
    }

    getData(project, options, cb) {
        options = _.extend({
            count: 200
        }, options);
        let data = {
            options,
            project,
            releases: [],
            promotions: {},
            tickets: {}
        };

        async.series([
            done => this.getReleasesAndTickets(data, project, done),
            done => this.getTicketProjects(data, project, done),
            done => this.getBuilds(data, project, this.jenkinsApi, done),
            done => this.getBuilds(data, project, this.jenkinsOldApi, done),
            done => this.getProductionPromotions(data, project, done),
            done => this.getPromotions(data, project, this.jenkinsApi, done),
            done => this.getPromotions(data, project, this.jenkinsOldApi, done),
            done => this.getRoughPromotions(data, project, this.jenkinsApi, done),
            done => this.getRoughPromotions(data, project, this.jenkinsOldApi, done),
            done => this.getReleaseUpdatedModules(data, project, done),
            done => this.mergeDuplicateTickets(data, done),
            done => this.getProductionPromoteLink(data, project, done),
            done => this.removeEmptyReleases(data, project, done)
        ], err => {
            cb(err, data);
        });
    }

    getProjects(cb) {
        this.gitlabApi.getProjects(cb);
    }

    getReleasesAndTickets(data, project, cb) {
        this.gitlabApi.getReleasesAndTickets(project, data.options.count, (err, body) => {
            if (err) return cb(err);

            data.releases = body.releases;
            data.tickets = body.tickets;

            async.each(data.tickets, (ticket, done) => this.getJiraTicket(ticket, done), cb);
        });
    }

    getTicketProjects(data, project, cb) {
        this.gitlabApi.getTicketProjects(project, data.tickets, cb);
    }

    getReleaseUpdatedModules(data, project, cb) {
        this.gitlabApi.getReleaseModules(project, data.releases, err => {
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
                lastModules = release.modules;
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

    getJiraTicket(ticket, cb) {
        if (ticket.status === 'NOJIRA') return cb();

        this.jiraApi.getIssueStatus(ticket.id, (err, body) => {
            if (err) return cb(/*err*/);

            _.extend(ticket, body);
            cb();
        });
    }


    getBuilds(data, project, jenkinsApi, cb) {
        if (!jenkinsApi) return cb();
        jenkinsApi.getBuildStatuses(project, (err, body) => {
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
        this.jenkinsPromoteApi.getPromotePromotions(project, (err, body) => {
            if (err) return cb(/*err*/);

            data.promotions = _.defaults(data.promotions, body.promotions);

            cb();
        });
    }

    getProductionPromoteLink(data, project, cb) {
        let stgBuildId = data.promotions['stg'] && data.promotions['stg'].buildId;
        let stgBuild;
        _.find(data.releases, release => stgBuild = _.find(release.builds, { id: stgBuildId }));
        let prdBuildId = data.promotions['prd'] && data.promotions['prd'].buildId;
        if (stgBuild && stgBuildId !== prdBuildId) {
            stgBuild.promoteLink = this.jenkinsPromoteApi.getPromoteLink(project, stgBuildId, 'prd');
        }
        cb();
    }


    getPromotions(data, project, jenkinsApi, cb) {
        if (!jenkinsApi) return cb();
        jenkinsApi.getBuildPromotions(project, (err, body) => {
            if (err) return cb(/*err*/);

            data.promotions = _.defaults(data.promotions, body.promotions);

            cb();
        });
    }

    getRoughPromotions(data, project, jenkinsApi, cb) {
        if (!jenkinsApi) return cb();
        jenkinsApi.getRoughBuildPromotions(project, (err, body) => {
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


