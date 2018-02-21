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
            done => this.getJenkinsBuildStatuses(data, project, done),
            done => this.getProductionPromotions(data, project, done),
            done => this.getJenkinsPromotions(data, project, done),
            done => this.getJenkinsRoughPromotions(data, project, done),
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

    getReleaseUpdatedModules(data, project, cb) {
        this.gitlabApi.getReleaseModules(project, data.releases, err => {
            if (err) return cb(err);

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


    getJenkinsBuildStatuses(data, project, cb) {
        this.jenkinsApi.getBuildStatuses(project, (err, body) => {
            if (err) return cb(err);

            _.each(body.builds, build => {
                let release = _.find(data.releases, { id: build.id });
                _.extend(release, build);
            });

            cb();
        });
    }

    getProductionPromotions(data, project, cb) {
        this.jenkinsPromoteApi.getPromotePromotions(project, (err, body) => {
            if (err) return cb(null,  data);

            data.promotions = _.defaults(data.promotions, body.promotions);

            cb(null, data);
        });
    }

    getProductionPromoteLink(data, project, cb) {
        let stgBuildId = data.promotions['stg'] && data.promotions['stg'].releaseId;
        let stgBuild = _.find(data.releases, { id: stgBuildId });
        let prdBuildId = data.promotions['prd'] && data.promotions['prd'].releaseId;
        if (stgBuild && stgBuildId !== prdBuildId) {
            stgBuild.promoteLink = this.jenkinsPromoteApi.getPromoteLink(project, stgBuildId, 'prd');
        }
        cb(null, data);
    }


    getJenkinsPromotions(data, project, cb) {
        this.jenkinsApi.getBuildPromotions(project, (err, body) => {
            if (err) return cb(null,  data);

            data.promotions = _.defaults(data.promotions, body.promotions);

            cb(null, data);
        });
    }

    getJenkinsRoughPromotions(data, project, cb) {
        this.jenkinsApi.getRoughBuildPromotions(project, (err, body) => {
            if (err) return cb(null,  data);

            data.promotions = _.defaults(data.promotions, body.promotions);

            cb(null, data);
        });
    }

    removeEmptyReleases(data, project, cb) {
        let keepBuilds = {};
        _.each(data.tickets, ticket => {
            _.each(ticket.releases, id => keepBuilds[id] = true);
        });
        data.releases = _.filter(data.releases, release => {
            if (release.result === 'SUCCESS') return true;
            if (keepBuilds[release.id]) return true;
            if (release.updates && release.updates.length) return true;
        });
        cb(null, data);
    }
}

module.exports = MergedApis;


