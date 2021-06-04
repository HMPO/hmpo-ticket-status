'use strict';

const SCM = require('./scm');
const _ = require('lodash');
const async = require('async');
const buildString = require('./build-string');
const sortByArray = require('./sort-by-array');

class Bitbucket extends SCM {
    constructor(options, name) {
        super({
            api: name || 'bitbucket',
            baseUrl: options.baseUrl,
            linkUrl: options.linkUrl || options.baseUrl,
            auth: options.credentials,
            canCache: true,
            saveCache: options.saveCache,
            redisCache: options.redisCache,
            environments: options.environments || {},
            ttl: 10000,
            concurrent: options.concurrent || 10,
            projectFormat: options.projectFormat || { '(.*)/(.*)': 'projects/{1:alpha}/repos/{2:alpha}' },
            ownModulesPattern: options.ownModulesPattern,
            buildPattern: options.buildPattern,
            mergeLink: '{linkUrl}/{formattedProject}/pull-requests/{mergeId:alpha}',
            apiUrl: '{baseUrl}/rest/api/latest/{formattedProject}',
            params: { limit: '{count}', merges: 'include' },
            commits: '{apiUrl}/commits',
            commit: '{apiUrl}/commits/{sha}',
            tags: '{apiUrl}/tags',
            file: '{apiUrl}/browse/{filename:enc}',
            fileParams: { at: '{sha}' },
            projects: '{baseUrl}/api/v4/projects',
            projectsParams: { simple: true, membership: true, per_page: 100, page: '{page}' },
            projectTags: options.projectTags,
            builds: '{baseUrl}/rest/build-status/latest/commits/{sha}',
            ticketMatching: options.ticketMatching,
            ticketsInBody: options.ticketsInBody
        });
        this.config.formattedProject = this.projectFormatLookup;
        if (typeof this.config.buildPattern === 'string') {
            this.config.buildPattern = new RegExp(this.config.buildPattern);
        }
    }

    getFile(options, cb) {
        super.getFile(options, (err, body) => {
            if (err) return cb(err);
            const fileText = body && body.lines && body.lines.map(line => line.text).join('\n');
            cb(null, fileText);
        });
    }

    getBuilds(options, cb) {
        options.ttl = false;
        options.url = this.config.builds;
        this.request(options, cb);
    }

    getMergeCommits(project, from, commits, cb) {
        let mergeCommits = [];
        let leafs = [ from ];
        let getNextLeaf = () => {
            let sha = leafs.shift();
            if (mergeCommits.length > 5) return cb(null, mergeCommits);
            if (!sha) return cb(null, mergeCommits);
            this.getCommit({ project, sha }, (err, body) => {
                if (err) return cb(err);
                body.title = body.title || body.message.split('\n')[0];
                if (commits[sha]) mergeCommits.push(body);
                _.each(body.parents, next => {
                    if (commits[next.id]) leafs.push(next.id);
                });
                setImmediate(getNextLeaf);
            });
        };
        getNextLeaf();
    }

    getReleaseTags(project, count, cb) {
        this.getTags({ project, count }, (err, body) => {
            if (err) return cb(err);

            const releaseTags = {};

            _.each(body.values, tag => {
                const sha = tag.latestCommit;
                if (!sha) return;

                let releaseNumber = tag.displayId && tag.displayId.match(/^v?(([0-9.]+\.)?[0-9]+)$/);
                releaseNumber = releaseNumber && 'v' + releaseNumber[1];
                if (!releaseNumber) return;

                let release = releaseTags[sha];
                if (!release) {
                    release = releaseTags[sha] = {
                        id: releaseNumber,
                        ids: [],
                        builds: [],
                        sha
                    };
                }
                release.ids.push();
                if (releaseNumber > release.id) {
                    release.id = releaseNumber;
                }
            });

            const hashes = Object.keys(releaseTags);

            async.eachLimit(hashes, this.config.concurrent, (sha, done) => {
                this.getBuilds({ sha }, (err, body) => {
                    if (err) return done(err);
                    _.each(body.values, build => {
                        if (build.state !== 'SUCCESSFUL') return;
                        if (this.config.buildPattern && !build.key.match(this.config.buildPattern)) return;
                        let link = build.url;
                        const linkMatch = link.match(/^((.*)(job\/master)?\/\d+)(\/display\/redirect)?$/);
                        let promoteProjectLink;
                        if (linkMatch) {
                            link = linkMatch[1];
                            promoteProjectLink = linkMatch[2] + '-promote';
                        }
                        releaseTags[sha].builds.push({
                            id: build.name.split('#')[1],
                            link,
                            promoteProjectLink,
                            result: 'SUCCESS',
                            timestamp: new Date(build.dateAdded)
                        });
                    });
                    done();
                });
            }, err => {

                const promotions = {};
                _.each(body.values, tag => {
                    const sha = tag.latestCommit;
                    if (!sha) return;

                    let env = tag.displayId && tag.displayId.match(/^env_([a-z0-9]+)$/);
                    env = env && env[1];
                    if (!env) return;

                    const release = releaseTags[sha];
                    if (!release) return;
                    const build = release.builds[0] || {};
                    if (!build) return;

                    promotions[env] = {
                        buildId: build.id,
                        env,
                        envClass: this.config.environments[env] || env,
                        link: build.promoteProjectLink || build.link || '#'
                    };
                });

                cb(err, releaseTags, promotions);
            });
        });
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

            _.each(body.values, commit => {

                // process release tags
                let releaseTag = releaseTags[commit.id];
                if (releaseTag) {
                    releaseTag.date = new Date(commit.committerTimestamp);
                    latestRelease = releaseTag.id;
                    releases.push(releaseTag);
                }

                // process merges

                let merge = commit.message.match(/^Merge pull request #(\d+) in .* to master\n/);
                if (merge) {
                    let mergeId = Number(merge[1]);
                    merges.push({
                        id: mergeId,
                        sha: commit.id,
                        releaseId: latestRelease,
                        link: buildString('{mergeLink}', _.extend({project, mergeId}, this.config))
                    });
                    return;
                }

                commits[commit.id] = commit;
            });

            cb(null, { releases, merges, commits });
        });
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
                        date: new Date(commit.authorTimestamp),
                        author: commit.author.name
                    });

                    return ticketItem;
                };

                const ticketIds = this.getTicketIds(commit.message);
                // const ticketIds = commit.properties && commit.properties['jira-key'] || [];
                _.each(ticketIds, ticketId => addTicketInfo(ticketId));

                if (ticketIds.length === 0) addTicketInfo(commit.id, {
                    status: 'NOTICKET',
                    title: commit.title
                });
            });

            cb(null, { tickets });
        });
    }
}

module.exports = Bitbucket;
