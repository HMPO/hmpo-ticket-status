'use strict';

const _ = require('lodash');
const data = require('../lib/data');
const config = require('../lib/config');

module.exports = {
    reset(req, res, next) {
        config.reset();
        res.redirect('/');
    },

    login(req, res, next) {
        if (req.body.jira_username && req.body.jira_password) {
            config.set(
                'jira.credentials',
                req.body.jira_username + ':' + req.body.jira_password
            );
        }

        if (req.body.jenkins_username && req.body.jenkins_password) {
            config.set(
                'jenkins.credentials',
                req.body.jenkins_username + ':' + req.body.jenkins_password
            );
        }

        if (req.body.old_jenkins_username && req.body.old_jenkins_password) {
            config.set(
                'oldJenkins.credentials',
                req.body.old_jenkins_username + ':' + req.body.old_jenkins_password
            );
        }

        if (req.body.jenkins_promote_username && req.body.jenkins_promote_password) {
            config.set(
                'jenkinsPromote.credentials',
                req.body.jenkins_promote_username + ':' + req.body.jenkins_promote_password
            );
        }

        if (req.body.gitlab_token) {
            config.set(
                'gitlab.privateToken',
                req.body.gitlab_token
            );
        }

        data.reset();

        res.redirect(req.originalUrl);
    },

    checkCredentials(req, res, next) {
        let missingCredentials = {
            jira: !config.get('jira.credentials'),
            jenkins: !config.get('jenkins.credentials'),
            oldJenkins: !config.get('oldJenkins.credentials') === false,
            jenkinsPromote: config.get('jenkinsPromote.credentials') === false,
            gitlab: !config.get('gitlab.privateToken')
        };
        if (_.some(missingCredentials)) {
            return res.render('login', missingCredentials);
        }
        next();
    }
};

