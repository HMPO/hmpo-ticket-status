'use strict';

const Api = require('./api');
const _ = require('lodash');

class Jenkins extends Api {
    constructor(options) {
        let credentials = options.credentials.split(':');
        super({
            api: 'jenkins',
            baseUrl: options.baseUrl,
            saveCache: options.saveCache,
            formattedProject: options.projectFormat || '{project:alpha}',
            projectUrl: '{baseUrl}/job/{formattedProject}',
            auth: { user: credentials[0], pass: credentials[1] },
            promotions: '{projectUrl}/promotion/api/json?depth=2&tree=processes[name,builds[result,timestamp,target[number]]]',
            builds: '{projectUrl}/api/json?tree=builds[number,result]',
            buildLink: '{projectUrl}/{buildId:alpha}'
        });
    }

    getPromotions(options, cb) {
        options.url = this.config.promotions;
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
                builds: {}
            };
            _.each(body.builds, build => {
                data.builds[build.number] = {
                    id: build.number,
                    result: build.result,
                    link: this.buildString('{buildLink}', _.extend({project, buildId: build.number}, this.config))
                };
            });
            cb(null, data);
        });
    }

    getBuildPromotions(project, cb) {
        this.getPromotions({ project }, (err, body) => {
            if (err) return cb(err);
            let data = {
                builds: {}
            };
            _.each(body.processes, env => {
                let promotion = _.find(env.builds, { result: 'SUCCESS' });
                if (promotion && promotion.target && promotion.target.number) {
                    let buildId = promotion.target.number;
                    let build = data.builds[buildId] = data.builds[buildId] || { promotions: {} };
                    build.promotions[env.name] = {
                        buildId,
                        env: env.name,
                        timestamp: promotion.timestamp
                    };
                }
            });
            cb(null, data);
        });
    }

}

module.exports = Jenkins;
