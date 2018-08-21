'use strict';

const Api = require('./api');
const _ = require('lodash');

class Jenkins extends Api {
    constructor(options) {
        super({
            api: 'jenkins',
            environments: options.environments,
            baseUrl: options.baseUrl,
            canCache: true,
            saveCache: options.saveCache,
            redisCache: options.redisCache,
            ttl: 10000,
            formattedProject: options.projectFormat || '{project:alpha}',
            projectUrl: '{baseUrl}/job/{formattedProject}',
            auth: options.credentials,
            roughPromotions: '{projectUrl}/api/json?depth=1&tree=allBuilds[number,url,actions[promotions[name,badges]]]',
            promotions: '{projectUrl}/promotion/api/json?depth=2&tree=processes[name,builds[result,timestamp,target[number,url]]]',
            builds: '{projectUrl}/api/json?tree=builds[number,result,url]'
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
                    link: build.url
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
                        buildId: Number(promotion.target.number),
                        env: environment,
                        link: promotion.target.url + 'promotion/',
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
                            buildId: Number(build.number),
                            env: promotion.name,
                            link: build.url + 'promotion/',
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
