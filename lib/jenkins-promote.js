'use strict';

const Api = require('./api');
const _ = require('lodash');

class JenkinsPromote extends Api {
    constructor(options) {
        let credentials = options.credentials ? options.credentials.split(':') : [];
        super({
            api: 'jenkinsPromote',
            environments: options.environments,
            promoteJob: options.promoteJob,
            baseUrl: options.baseUrl,
            auth: { user: credentials[0], pass: credentials[1] },
            formattedProject: options.projectFormat || '{project:alpha}',
            promotions: '{baseUrl}/job/{promoteJob}/api/json?depth=1&tree=builds[actions[parameters[name,value]],timestamp,url]',
            promoteLink: '{baseUrl}/job/{promoteJob}/promote/buildWithParameters?delay=20sec&&PROMOTED_JOB_NAME={project}.yml&ENVIRONMENT={environment}&AreYouSure=true&PROMOTED_NUMBER={buildId}'
        });
    }

    getPromotions(options, cb) {
        options.url = this.config.promotions;
        this.request(options, cb);
    }

    getPromoteLink(project, buildId, environment) {
        return this.buildString('{promoteLink}', _.extend({project, buildId, environment}, this.config));
    }

    getPromotePromotions(project, cb) {
        let formattedProject = this.buildString('{formattedProject}', _.extend({ project }, this.config));
        this.getPromotions({ project }, (err, body) => {
            // allow getting promotions to fail
            if (err) return cb(null, {});
            let data = {
                promotions: {}
            };
            _.each(body.builds, promotion => {
                let parameters = _.find(promotion.actions, { _class: 'hudson.model.ParametersAction' });
                if (!parameters) return;

                // check if this promotion is for this project
                let jobName = _.find(parameters.parameters, { name: 'PROMOTED_JOB_NAME' });
                jobName = jobName && jobName.value;
                if (jobName !== formattedProject) return;

                let env = _.find(parameters.parameters, { name: 'ENVIRONMENT' });
                env = env && this.config.environments[env.value];
                if (!env) return;

                // already found later promotion for this env
                if (data.promotions[env] && promotion.timestamp < data.promotions[env].timestamp) return;

                let buildId = _.find(parameters.parameters, { name: 'PROMOTED_NUMBER' });
                buildId = buildId && Number(buildId.value);
                if (!buildId) return;

                data.promotions[env] = {
                    buildId,
                    env,
                    timestamp: promotion.timestamp,
                    url: promotion.url
                };
            });
            cb(null, data);
        });
    }
}

module.exports = JenkinsPromote;
