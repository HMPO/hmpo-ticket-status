'use strict';

const Api = require('./api');
const _ = require('lodash');

class Jira extends Api {
    constructor(options) {
        let credentials = options.credentials.split(':');
        super();
        _.extend(this.config, {
            auth: { user: credentials[0], pass: credentials[1] },
            baseUrl: options.baseUrl,
            issue: '{baseUrl}/rest/api/2/issue/{issueId:alpha}',
            issueLink: '{baseUrl}/browse/{issueId:alpha}'
        });
    }

    getIssue(options, cb) {
        options.canCache = body => (body.fields.status.name === 'Done') || (body.fields.status.name === 'Closed');
        options.url = this.config.issue;
        this.request(options, cb);
    }

    getIssueStatus(issueId, cb) {
        this.getIssue({ issueId }, (err, body) => {
            if (err) return cb(err);
            cb(null, {
                key: body.key,
                title: body.fields.summary,
                status: body.fields.status.name,
                parent: body.fields.parent ? {
                    key: body.fields.parent.key,
                    title: body.fields.parent.fields.summary,
                    status: body.fields.parent.fields.status.name,
                    link: this.buildString('{issueLink}', _.extend({issueId: body.fields.parent.key}, this.config))
                } : null,
                link: this.buildString('{issueLink}', _.extend({issueId: body.key}, this.config))
            });
        });
    }

}

module.exports = Jira;
