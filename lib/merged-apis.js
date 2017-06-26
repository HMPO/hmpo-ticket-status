'use strict';

const Gitlab = require('./gitlab');
const Jira = require('./jira');
const Jenkins = require('./jenkins');
const async = require('async');
const _ = require('lodash');
const logger = require('./logger');

class MergedApis {
    constructor(config) {
        this.gitlabApi = new Gitlab(config.get('gitlab'));
        this.jiraApi = new Jira(config.get('jira'));
        this.jenkinsApi = new Jenkins(config.get('jenkins'));
    }

    log() {
        logger.log.apply(logger, arguments);
    }
    error() {
        logger.error.apply(logger, arguments);
    }

    getData(project, cb) {
        let data = {
            project,
            builds: {},
            tickets: {}
        };

        async.series([
            done => this.getBuildsAndTickets(data, project, done),
            done => this.getBuildStatuses(data, project, done),
            done => this.getBuildPromotions(data, project, done),
            done => this.getBuildUpdatedModules(data, project, done),
            done => this.mergeDuplicateTickets(data, done)
        ], err => {
            cb(err, data);
        });
    }

    getProjects(cb) {
        this.gitlabApi.getProjects(cb);
    }

    getBuildsAndTickets(data, project, cb) {
        this.gitlabApi.getBuildsAndTickets(project, 150, (err, body) => {
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
                    duplicate.builds = duplicate.builds.concat(ticket.builds).sort();
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

    getBuildPromotions(data, project, cb) {
        this.jenkinsApi.getBuildPromotions(project, (err, body) => {
            if (err) return cb(null,  data);

            _.each(body.builds, (build, id) => _.extend(data.builds[id], build));

            cb(null, data);
        });
    }
}

module.exports = MergedApis;


