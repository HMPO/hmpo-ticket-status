'use strict';

const Api = require('./api');
const _ = require('lodash');
const buildString = require('./build-string');

class Jira extends Api {
    constructor(options, name) {
        super({
            api: name || 'jira',
            auth: options.credentials,
            compactIgnorePattern: /(^customfield_|^comments$)/,
            baseUrl: options.baseUrl,
            canCache: true,
            saveCache: options.saveCache,
            redisCache: options.redisCache,
            statusMap: options.statusMap,
            issue: '{baseUrl}/rest/api/2/issue/{issueId:alpha}',
            issueLink: '{baseUrl}/browse/{issueId:alpha}'
        });
        this.type = 'ticket';
    }

    getIssue(options, cb) {
        options.ttl = body => this.config.statusMap[body.fields.status.name] === 'closed' ? false : 10000;
        options.url = this.config.issue;
        this.request(options, cb);
    }

    getIssueStatus(issueId, cb) {
        this.getIssue({ issueId }, (err, body) => {
            if (err) return cb(err);
            const statusClass = this.config.statusMap && this.config.statusMap[body.fields.status.name];
            cb(null, {
                key: body.key,
                title: body.fields.summary,
                status: body.fields.status.name,
                statusClass,
                parent: body.fields.parent ? {
                    key: body.fields.parent.key,
                    title: body.fields.parent.fields.summary,
                    status: body.fields.parent.fields.status.name,
                    link: buildString('{issueLink}', _.extend({issueId: body.fields.parent.key}, this.config))
                } : null,
                link: buildString('{issueLink}', _.extend({issueId: body.key}, this.config))
            });
        });
    }

}

module.exports = Jira;
