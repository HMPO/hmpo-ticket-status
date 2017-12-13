'use strict';

const Gitlab = require('./gitlab');
const Jira = require('./jira');
const Jenkins = require('./jenkins');
const JenkinsPromote = require('./jenkins-promote');
const async = require('async');
const _ = require('lodash');
const logger = require('./logger');
const sortBuilds = require('./sortbuilds');

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
            builds: {},
            promotions: {},
            tickets: {}
        };

        async.series([
            done => this.getBuildsAndTickets(data, project, done),
            done => this.getBuildStatuses(data, project, done),
            done => this.getPromotions(data, project, done),
            done => this.getBuildPromotions(data, project, done),
            done => this.getRoughBuildPromotions(data, project, done),
            done => this.getBuildUpdatedModules(data, project, done),
            done => this.mergeDuplicateTickets(data, done),
            done => this.getPromoteLink(data, project, done),
            done => this.removeEmptyBuilds(data, project, done)
        ], err => {
            cb(err, data);
        });
    }

    getProjects(cb) {
        this.gitlabApi.getProjects(cb);
    }

    getBuildsAndTickets(data, project, cb) {
        this.gitlabApi.getBuildsAndTickets(project, data.options.count, (err, body) => {
            if (err) return cb(err);

            data.builds = body.builds;
            data.tickets = body.tickets;

            async.each(data.tickets, (ticket, done) => this.getJiraTicket(ticket, done), cb);
        });
    }

    getBuildUpdatedModules(data, project, cb) {
        this.gitlabApi.getBuildModules(project, data.builds, err => {
            if (err) return cb(err);

            let lastModules = {};

            let sortedBuilds = _.sortBy(_.values(data.builds), 'id');
            _.each(sortedBuilds, build => {
                build.updates = [];
                _.each(build.modules, (version, module) => {
                    if (lastModules[module] && lastModules[module] !== version) {
                        build.updates.push({ module, version });
                    }
                });
                build.updates = _.sortBy(build.updates, 'module');
                lastModules = build.modules;
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
                    duplicate.builds = _.uniq(duplicate.builds.concat(ticket.builds).sort(sortBuilds));
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


    getBuildStatuses(data, project, cb) {
        this.jenkinsApi.getBuildStatuses(project, (err, body) => {
            if (err) return cb(err);

            _.each(body.builds, (build, id) => _.extend(data.builds[id], build));

            cb();
        });
    }

    getPromotions(data, project, cb) {
        this.jenkinsPromoteApi.getPromotePromotions(project, (err, body) => {
            if (err) return cb(null,  data);

            data.promotions = _.defaults(data.promotions, body.promotions);

            cb(null, data);
        });
    }

    getBuildPromotions(data, project, cb) {
        this.jenkinsApi.getBuildPromotions(project, (err, body) => {
            if (err) return cb(null,  data);

            data.promotions = _.defaults(data.promotions, body.promotions);

            cb(null, data);
        });
    }

    getPromoteLink(data, project, cb) {
        let stgBuildId = data.promotions['stg'] && data.promotions['stg'].buildId;
        let stgBuild = data.builds[stgBuildId];
        let prdBuildId = data.promotions['prd'] && data.promotions['prd'].buildId;
        if (stgBuild && stgBuildId !== prdBuildId) {
            stgBuild.promoteLink = this.jenkinsPromoteApi.getPromoteLink(project, stgBuildId, 'prd');
        }
        cb(null, data);
    }

    getRoughBuildPromotions(data, project, cb) {
        this.jenkinsApi.getRoughBuildPromotions(project, (err, body) => {
            if (err) return cb(null,  data);

            data.promotions = _.defaults(data.promotions, body.promotions);

            cb(null, data);
        });
    }

    removeEmptyBuilds(data, project, cb) {
        let keepBuilds = {};
        _.each(data.tickets, ticket => {
            _.each(ticket.builds, id => keepBuilds[id] = true);
        });
        data.builds = _.filter(data.builds, build => {
            if (build.result === 'SUCCESS') return true;
            if (keepBuilds[build.id]) return true;
            if (build.updates && build.updates.length) return true;
        });
        cb(null, data);
    }
}

module.exports = MergedApis;


