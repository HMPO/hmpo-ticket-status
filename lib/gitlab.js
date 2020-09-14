'use strict';

const Api = require('./api');
const _ = require('lodash');
const async = require('async');
const buildString = require('./build-string');
const sortByArray = require('./sort-by-array');

class Gitlab extends Api {
    constructor(options) {
        super({
            api: 'gitlab',
            baseUrl: options.baseUrl,
            linkUrl: options.linkUrl || options.baseUrl,
            auth: options.credentials,
            canCache: true,
            saveCache: options.saveCache,
            redisCache: options.redisCache,
            ttl: 10000,
            formattedProject: options.projectFormat || '{project:alpha}',
            mergeLink: '{linkUrl}/{formattedProject}/merge_requests/{mergeId:alpha}',
            apiUrl: '{baseUrl}/api/v4/projects/{formattedProject:enc}/repository',
            headers: { 'PRIVATE-TOKEN': options.privateToken },
            params: { per_page: '{count}' },
            commits: '{apiUrl}/commits',
            commit: '{apiUrl}/commits/{sha}',
            tags: '{apiUrl}/tags',
            file: '{apiUrl}/files',
            fileParams: { ref: '{sha}', file_path: '{filename}' },
            projects: '{baseUrl}/api/v4/projects',
            projectsParams: { simple: true, membership: true, per_page: 100, page: '{page}' },
            projectTags: options.projectTags,
            ticketMatching: options.ticketMatching,
            ticketsInBody: options.ticketsInBody
        });
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

    getProjects(cb) {
        let options = {
            ttl: 600000,
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
                if (body && body.length > 0) {
                    return getPage();
                }
                projects = _.filter(projects, project => project && !_.isEmpty(_.intersection(project.tag_list, this.config.projectTags)));
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

    getReleaseTags(project, count, cb) {
        this.getTags({ project, count }, (err, body) => {
            if (err) return cb(err);
            let releaseTags = {};

            _.each(body, tag => {
                let sha = tag.commit && tag.commit.id;
                if (!sha) return;

                let releaseNumber = tag.name && tag.name.match(/^v?(([0-9.]+\.)?[0-9]+)$/);
                releaseNumber = releaseNumber && 'v' + releaseNumber[1];
                if (!releaseNumber) return;

                let release = releaseTags[sha];
                if (!release) {
                    release = releaseTags[sha] = {
                        id: releaseNumber,
                        ids: [],
                        date: new Date(tag.commit.committed_date),
                        sha
                    };
                }

                release.ids.push(releaseNumber);

                if (releaseNumber > release.id) {
                    release.id = releaseNumber;
                }
            });

            _.each(body, tag => {
                let sha = tag.commit && tag.commit.id;
                if (!sha) return;

                let releaseTag = releaseTags[sha];
                if (!releaseTag) return;

                let buildId = tag.name && tag.name.match(/^b([0-9.]+)$/);
                buildId = buildId && buildId[1];

                if (!buildId) return;

                let buildLink = tag.message && tag.message.match(/(https?:.*)$/);
                buildLink = buildLink && buildLink[1];

                releaseTag.builds = releaseTag.builds || [];
                releaseTag.builds.push({
                    id: buildId,
                    link: buildLink,
                    result: 'NOTFOUND'
                });
            });

            // support old release tags with no build tags
            _.each(releaseTags, releaseTag => {
                if (releaseTag.builds && releaseTag.builds.length) return;

                let buildId = releaseTag.id.match(/^v([0-9.]+\.)?([0-9]+)$/);
                buildId = buildId && Number(buildId[2]);
                if (!buildId) return;

                releaseTag.builds = releaseTag.builds || [];
                releaseTag.builds.push({
                    id: buildId,
                    result: 'OLDTAG'
                });
            });

            cb(null, releaseTags);
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

    getReleasesAndMerges(project, releaseTags, count, cb) {
        this.getCommits({ project, count }, (err, body) => {
            if (err) return cb(err);

            let merges = [];
            let commits = [];
            let latestRelease = 'HEAD';
            let releases = [];

            releases.push({
                id: latestRelease,
                date: null
            });

            _.each(body, commit => {

                // process release tags
                let releaseTag = releaseTags[commit.id];
                if (releaseTag) {
                    latestRelease = releaseTag.id;
                    releases.push(releaseTag);
                }

                // ignore jenkins build commits
                let jenkinsBuildCommit = commit.title && commit.title.match(/^(Build|Release) v\d+\.\d+\.(\d+)/);
                if (jenkinsBuildCommit) return;

                // process merges
                let merge = commit.title && commit.message.match(/^Merge branch '.*' into 'master'\n/);
                if (merge) {
                    let mergeMessage = commit.message.match(/See merge request .*!(\d+)/);
                    if (mergeMessage) {
                        let mergeId = Number(mergeMessage[1]);
                        merges.push({
                            id: mergeId,
                            sha: commit.id,
                            releaseId: latestRelease,
                            link: buildString('{mergeLink}', _.extend({project, mergeId}, this.config))
                        });
                        return;
                    }
                }

                commits[commit.id] = commit;
            });

            cb(null, { releases, merges, commits });
        });
    }

    getReleaseModules(project, releases, cb) {
        async.eachSeries(releases, (release, done) => {
            this.getFile({ project, filename: 'package.json', sha: release.sha }, (err, body) => {
                if (err) return done(err);
                try {
                    let fileText = new Buffer.from(body.content, 'base64').toString('utf8');
                    let packageJson = JSON.parse(fileText);
                    let modules = _.pickBy(_.mapValues(packageJson.dependencies, version => {
                        let moduleVersion = version.match(/\.git#(v\d+\.\d+\.\d+)/);
                        return moduleVersion && moduleVersion[1];
                    }), _.identity);
                    release.modules = modules;
                } catch (e) { return done(e); }
                done();
            });
        }, cb);
    }

    getMergeTickets(project, merge, body, cb) {
        let tickets = body.tickets = body.tickets || {};

        this.getMergeCommits(project, merge.sha, body.commits, (err, commits) => {
            if (err) return cb(err);
            _.each(commits, commit => {
                let addTicketInfo = (ticketId, defaults) => {
                    let ticketItem = tickets[ticketId];

                    if (!ticketItem) ticketItem = tickets[ticketId] = _.extend({
                        id: ticketId,
                        releases: [],
                        merges: {},
                        commits: []
                    }, defaults);

                    ticketItem.releases.push(merge.releaseId);
                    ticketItem.releases = _.uniq(ticketItem.releases);
                    ticketItem.releases.sort(sortByArray(body.releases, 'id'));

                    ticketItem.merges[merge.releaseId] = {
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
                _.each(ticketIds, ticketId => addTicketInfo(ticketId));

                if (ticketIds.length === 0) addTicketInfo(commit.id, {
                    status: 'NOJIRA',
                    title: commit.title
                });
            });

            cb(null, { tickets });
        });
    }

    getReleasesAndTickets(project, count, cb) {
        this.getReleaseTags(project, count, (err, releaseTags) => {
            if (err) return cb(err);
            this.getReleasesAndMerges(project, releaseTags, count, (err, body) => {
                if (err) return cb(err);
                body.tickets = {};
                async.each(body.merges, (merge, done) => {
                    this.getMergeTickets(project, merge, body, done);
                }, err => {
                    if (err) return cb(err);
                    cb(null, body);
                });
            });
        });
    }
}

module.exports = Gitlab;
