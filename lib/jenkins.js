'use strict';

const Api = require('./api');
const _ = require('lodash');
const buildString = require('./build-string');

class Jenkins extends Api {
    constructor(options) {
        let credentials = options.credentials.split(':');
        super({
            api: 'jenkins',
            environments: options.environments,
            baseUrl: options.baseUrl,
            canCache: false,
            formattedProject: options.projectFormat || '{project:alpha}',
            projectUrl: '{baseUrl}/job/{formattedProject}',
            auth: { user: credentials[0], pass: credentials[1] },
            roughPromotions: '{projectUrl}/api/json?depth=1&tree=allBuilds[number,actions[promotions[name,badges]]]',
            promotions: '{projectUrl}/promotion/api/json?depth=2&tree=processes[name,builds[result,timestamp,target[number]]]',
            builds: '{projectUrl}/api/json?tree=builds[number,result]',
            buildLink: '{projectUrl}/{buildId:alpha}'
        });
    }

    getPromotions(options, cb) {
        options.url = this.config.promotions;
        this.request(options, cb);
    }

    getRoughPromotions(options, cb) {
        options.url = this.config.roughPromotions;
        this.request(options, cb);
    }

    getBuilds(options, cb) {
        options.url = this.config.builds;
        this.request(options, cb);
    }

    getBuildStatuses(project, cb) {
        this.getBuilds({ project }, (err, body) => {
            if (err) return cb(err);
            let data = {
                builds: []
            };
            _.each(body.builds, build => {
                data.builds.push({
                    id: Number(build.number),
                    result: build.result,
                    link: buildString('{buildLink}', _.extend({project, buildId: build.number}, this.config))
                });
            });
            cb(null, data);
        });
    }

    getBuildPromotions(project, cb) {
        this.getPromotions({ project }, (err, body) => {
            if (err) return cb(err);
            let data = {
                promotions: {}
            };
            _.each(body.processes, env => {
                let promotion = _.find(env.builds, { result: 'SUCCESS' });
                let environment = this.config.environments[env.name];
                if (promotion && environment && promotion.target && promotion.target.number) {
                    data.promotions[environment] = {
                        releaseId: Number(promotion.target.number),
                        env: environment,
                        timestamp: promotion.timestamp
                    };
                }
            });
            cb(null, data);
        });
    }

    getRoughBuildPromotions(project, cb) {
        this.getRoughPromotions({ project }, (err, body) => {
            if (err) return cb(err);
            let data = {
                promotions: {}
            };
            _.each(body.allBuilds, build => {
                let action = _.find(build.actions, action => action.promotions);
                let promotions = action && action.promotions;
                _.each(promotions, promotion => {
                    if (!data.promotions[promotion.name]) {
                        data.promotions[promotion.name] = {
                            releaseId: Number(build.number),
                            env: promotion.name,
                            rough: true
                        };
                    }
                });
            });
            cb(null, data);
        });
    }

}

module.exports = Jenkins;
