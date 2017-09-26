'use strict';

const Api = require('./api');
const _ = require('lodash');
const async = require('async');

class Gitlab extends Api {
    constructor(options) {
        super({
            api: 'gitlab',
            baseUrl: options.baseUrl,
            saveCache: options.saveCache,
            formattedProject: options.projectFormat || '{project:alpha}',
            mergeLink: '{baseUrl}/{formattedProject}/merge_requests/{mergeId:alpha}',
            apiUrl: '{baseUrl}/api/v3/projects/{formattedProject:enc}/repository',
            headers: { 'PRIVATE-TOKEN': options.privateToken },
            params: { per_page: '{count}' },
            commits: '{apiUrl}/commits',
            commit: '{apiUrl}/commits/{sha}',
            tags: '{apiUrl}/tags',
            file: '{apiUrl}/files',
            fileParams: { ref: '{sha}', file_path: '{filename}' },
            projects: '{baseUrl}/api/v3/projects',
            projectsParams: { simple: true, membership: true, per_page: 100, page: '{page}' },
            projectTags: options.projectTags,
            ticketMatching: options.ticketMatching,
            ticketsInBody: options.ticketsInBody
        });
    }

    getProjects(cb) {
        let options = {
            url: this.config.projects,
            params: this.config.projectsParams,
            page: 0
        };

        let projects = [];
        let getPage = () => {
            options.page++;
            this.request(options, (err, body) => {
                if (err) return cb(err);
                projects = projects.concat(body);
                if (body.length > 0) {
                    return getPage();
                }
                projects = _.filter(projects, project => !_.isEmpty(_.intersection(project.tag_list, this.config.projectTags)));
                projects = _.sortBy(projects, 'last_activity_at').reverse();
                cb(null, { projects });
            });
        };

        getPage();
    }

    getFile(options, cb) {
        options.url = this.config.file;
        options.params =  this.config.fileParams;
        options.sha = options.sha || 'master';
        options.canCache = (options.sha !== 'master');
        this.request(options, cb);
    }

    getCommits(options, cb) {
        options.url = this.config.commits;
        this.request(options, cb);
    }

    getCommit(options, cb) {
        options.canCache = true;
        options.url = this.config.commit;
        this.request(options, cb);
    }

    getMergeCommits(project, from, commits, cb) {
        let mergeCommits = [];
        let leafs = [ from ];
        let getNextLeaf = () => {
            let sha = leafs.shift();
            if (mergeCommits.length > 15) return cb(null, mergeCommits);
            if (!sha) return cb(null, mergeCommits);
            this.getCommit({ project, sha }, (err, body) => {
                if (err) return cb(err);
                if (commits[sha]) mergeCommits.push(body);
                _.each(body.parent_ids, next => {
                    if (commits[next]) leafs.push(next);
                });
                setImmediate(getNextLeaf);
            });
        };
        getNextLeaf();
    }

    getTags(options, cb) {
        options.url = this.config.tags;
        this.request(options, cb);
    }

    getBuildTags(project, count, cb) {
        this.getTags({ project, count }, (err, body) => {
            if (err) return cb(err);
            let buildTags = {};

            _.each(body, tag => {
                let buildNumber = tag.name && tag.name.match(/^v([0-9\.]+\.)?([0-9]+)$/);
                buildNumber = buildNumber && Number(buildNumber[2]);

                let sha = tag.commit.id;

                if (sha && buildNumber) {
                    buildTags[sha] = {
                        id: buildNumber,
                        date: new Date(tag.commit.committed_date),
                        sha
                    };
                }
            });

            cb(null, buildTags);
        });
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

    getBuildsAndMerges(project, buildTags, count, cb) {
        this.getCommits({ project, count }, (err, body) => {
            if (err) return cb(err);

            let merges = [];
            let commits = [];
            let latestBuild = 'HEAD';
            let builds = {};
            builds[latestBuild] = {
                id: latestBuild,
                date: null
            };

            _.each(body, commit => {

                // process jenkins build tags
                let buildTag = buildTags[commit.id];
                if (buildTag) {
                    latestBuild = buildTag.id;
                    builds[buildTag.id] = buildTag;
                }

                // ignore jenkins build commits
                let build = commit.title && commit.title.match(/^Build v\d+\.\d+\.(\d+)/);
                if (build) return;

                // process merges
                let merge = commit.title && commit.message.match(/^Merge branch '.*' into 'master'\n/);
                if (merge) {
                    let mergeMessage = commit.message.match(/See merge request !(\d+)/);
                    if (mergeMessage) {
                        let mergeId = mergeMessage[1];
                        merges.push({
                            id: mergeId,
                            sha: commit.id,
                            buildId: latestBuild,
                            link: this.buildString('{mergeLink}', _.extend({project, mergeId}, this.config))
                        });
                        return;
                    }
                }

                commits[commit.id] = commit;
            });

            cb(null, { builds, merges, commits });
        });
    }

    getBuildModules(project, builds, cb) {
        async.each(builds, (build, done) => {
            this.getFile({ project, filename: 'package.json', sha: build.sha }, (err, body) => {
                if (err) return done();
                try {
                    let fileText = new Buffer(body.content, 'base64').toString('utf8');
                    let packageJson = JSON.parse(fileText);
                    let modules = _.pickBy(_.mapValues(packageJson.dependencies, version => {
                        let moduleVersion = version.match(/\.git#v\d+\.\d+\.(\d+)/);
                        return moduleVersion && moduleVersion[1];
                    }), _.identity);
                    build.modules = modules;
                } catch (e) { /**/ }
                done();
            });
        }, cb);
    }

    getMergeTickets(project, merge, commits, tickets, cb) {
        tickets = tickets || {};

        this.getMergeCommits(project, merge.sha, commits, (err, commits) => {
            if (err) return cb(err);
            _.each(commits, commit => {
                let addTicketInfo = (ticketId, defaults) => {
                    let ticketItem = tickets[ticketId];

                    if (!ticketItem) ticketItem = tickets[ticketId] = _.extend({
                        id: ticketId,
                        builds: [],
                        merges: {},
                        commits: []
                    }, defaults);

                    ticketItem.builds.push(merge.buildId);
                    ticketItem.builds = _.uniq(ticketItem.builds.sort());
                    ticketItem.merges[merge.buildId] = {
                        id: merge.id,
                        link: merge.link
                    };

                    ticketItem.commits.push({
                        sha: commit.id,
                        title: commit.title,
                        date: new Date(commit.created_at),
                        author: commit.author_name
                    });

                    return ticketItem;
                };

                let ticketIds = this.getTicketIds(this.config.ticketsInBody ? commit.message : commit.title);
                _.each(ticketIds, addTicketInfo);

                if (ticketIds.length === 0) addTicketInfo(commit.id, {
                    status: 'NOJIRA',
                    title: commit.title
                });
            });

            cb(null, { tickets });
        });
    }

    getBuildsAndTickets(project, count, cb) {
        this.getBuildTags(project, count, (err, buildTags) => {
            if (err) return cb(err);
            this.getBuildsAndMerges(project, buildTags, count, (err, body) => {
                if (err) return cb(err);
                body.tickets = {};
                async.each(body.merges, (merge, done) => {
                    this.getMergeTickets(project, merge, body.commits, body.tickets, done);
                }, err => {
                    if (err) return cb(err);
                    cb(null, body);
                });
            });
        });
    }
}

module.exports = Gitlab;
