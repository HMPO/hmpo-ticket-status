'use strict';

const SCM = require('./scm');
const _ = require('lodash');
const buildString = require('./build-string');
const sortByArray = require('./sort-by-array');

class Gitlab extends SCM {
    constructor(options, name) {
        super({
            api: name || 'gitlab',
            baseUrl: options.baseUrl,
            linkUrl: options.linkUrl || options.baseUrl,
            auth: options.credentials,
            canCache: true,
            saveCache: options.saveCache,
            redisCache: options.redisCache,
            ttl: 10000,
            concurrent: options.concurrent || 10,
            ownModulesPattern: options.ownModulesPattern,
            formattedProject: options.projectFormat || '{project:alpha}',
            mergeLink: '{linkUrl}/{formattedProject}/merge_requests/{mergeId:alpha}',
            apiUrl: '{baseUrl}/api/v4/projects/{formattedProject:enc}/repository',
            headers: { 'PRIVATE-TOKEN': options.privateToken },
            params: { per_page: '{count}' },
            commits: '{apiUrl}/commits',
            commit: '{apiUrl}/commits/{sha}',
            tags: '{apiUrl}/tags',
            file: '{apiUrl}/files/{filename:enc}',
            fileParams: { ref: '{sha}' },
            projects: '{baseUrl}/api/v4/projects',
            projectsParams: { simple: true, membership: true, per_page: 100, page: '{page}' },
            projectTags: options.projectTags,
            releaseMatching: new RegExp(options.releaseMatching || '^v?(([0-9.]+\\.)?[0-9]+)$'),
            ticketMatching: options.ticketMatching,
            ticketsInBody: options.ticketsInBody
        });
    }

    getFile(options, cb) {
        super.getFile(options, (err, body) => {
            if (err) return cb(err);
            const fileText = body && body.content && new Buffer.from(body.content, 'base64').toString('utf8');
            cb(null, fileText);
        });
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

    getReleaseTags(project, count, cb) {
        this.getTags({ project, count }, (err, body) => {
            if (err) return cb(err);
            let releaseTags = {};

            _.each(body, tag => {
                let sha = tag.commit && tag.commit.id;
                if (!sha) return;

                let releaseNumber = tag.name && tag.name.match(this.config.releaseMatching);
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
                    status: 'NOTICKET',
                    title: commit.title
                });
            });

            cb(null, { tickets });
        });
    }
}

module.exports = Gitlab;
