'use strict';

const Api = require('./api');
const async = require('async');

class SCM extends Api {
    constructor(options, name) {
        super(options, name);
        if (typeof this.config.ownModulesPattern === 'string') {
            this.config.ownModulesPattern = new RegExp(this.config.ownModulesPattern);
        }
        this.type = 'scm';
    }

    getTicketProjects(project, tickets, cb) {
        async.each(tickets, (ticket, done) => {
            this.cache.get('ticketProjects:' + ticket.id, (err, ticketProjects) => {
                ticket.projects = ticketProjects;
                if (!ticket.projects) ticket.projects = [];
                if (!ticket.projects.includes(project)) ticket.projects.push(project);
                this.cache.set('ticketProjects:' + ticket.id, ticket.projects, null, done);
            });
        }, cb);
    }

    getFile(options, cb) {
        options.url = this.config.file;
        options.params =  this.config.fileParams;
        options.sha = options.sha || 'master';
        options.ttl = (options.sha === 'master') && 5000;
        this.request(options, cb);
    }

    getCommits(options, cb) {
        options.url = this.config.commits;
        this.request(options, cb);
    }

    getCommit(options, cb) {
        options.ttl = false;
        options.url = this.config.commit;
        this.request(options, cb);
    }

    getTags(options, cb) {
        options.url = this.config.tags;
        this.request(options, cb);
    }

    getTicketIds(text) {
        if (typeof text !== 'string') return [];
        let reTicketNumber = /^(\s*([A-Z]{3,8})-([1-9][0-9]*)\s*)/m;
        let tickets = [];
        let ticket;
        while ((ticket = reTicketNumber.exec(text))) {
            text = text.replace(ticket[1], '');
            let proj = ticket[2].toUpperCase();
            if (this.config.ticketMatching) {
                proj = this.config.ticketMatching[proj] || proj;
            }
            let ticketId = proj+ '-' + parseInt(ticket[3], 10);
            tickets.push(ticketId);
        }
        return tickets;
    }

    getPackageModules(body) {
        const packageJson = JSON.parse(body);
        const modules = {};
        for (let module in packageJson.dependencies) {
            const version = packageJson.dependencies[module];
            if (this.config.ownModulesPattern) {
                const moduleMatch = module.match(this.config.ownModulesPattern);
                const versionMatch = version.match(/(\d+\.\d+\.\d+)/);
                if (moduleMatch && versionMatch) {
                    modules[moduleMatch[1] || module] = 'v' + versionMatch[1];
                    continue;
                }
            }
            const gitVersionMatch = version.match(/\.git#(v\d+\.\d+\.\d+)/);
            if (gitVersionMatch) {
                modules[module] = gitVersionMatch[1];
            }
        }
        return modules;
    }

    getReleaseModules(project, releases, cb) {
        async.eachLimit(releases, this.config.concurrent, (release, done) => {
            this.getFile({ project, filename: 'package.json', sha: release.sha }, (err, body) => {
                if (err) return done(err);
                try {
                    release.modules = this.getPackageModules(body);
                } catch (e) { return done(e); }
                done();
            });
        }, cb);
    }

    getReleasesAndTickets(project, count, cb) {
        this.getReleaseTags(project, count, (err, releaseTags, promotions) => {
            if (err) return cb(err);
            this.getReleasesAndMerges(project, releaseTags, count, (err, body) => {
                if (err) return cb(err);
                body.promotions = promotions;
                body.tickets = {};
                async.allLimit(body.merges, this.config.concurrent, (merge, done) => {
                    this.getMergeTickets(project, merge, body, done);
                }, err => {
                    if (err) return cb(err);
                    cb(null, body);
                });
            });
        });
    }
}

module.exports = SCM;
