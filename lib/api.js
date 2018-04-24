'use strict';

const request = require('request');
const _ = require('lodash');
const debug = require('debug')('hmpo:api');
const compact = require('./compact');
const buildString = require('./build-string');
const Storage = require('./storage');
const logger = require('./logger');

class Api {
    constructor(options) {
        this.config = _.extend({
            api: 'generic'
        }, options);
        if (this.config.canCache) {
            this.cache = new Storage(this.config.api, this.config.saveCache);
        }
    }

    request(options, cb) {
        options = _.defaults({}, options, this.config, { privateToken: this.privateToken });
        options.params = _.defaults({}, options.params, this.config.params);

        let url = buildString(options.url, options);
        let params = _.compact(_.map(
            _.keys(options.params),
            key => {
                let value = buildString(options.params[key], options, '');
                if (value) return encodeURIComponent(key) + '=' + encodeURIComponent(value);
            }
        ));
        if (params.length) url += '?' + params.join('&');

        if  (this.cache) {
            let cached = this.cache.get(url);
            if (cached) {
                debug('API Cached', url);
                return cb(null, cached);
            }
        }

        if (options.auth && typeof options.auth === 'string') {
            let [username, password] = options.auth.split(':');
            options.auth = { username, password };
        }

        let req = {
            uri: url,
            json: true,
            headers: _.mapValues(options.headers, value => buildString(value)),
            auth: options.auth
        };

        debug('API Request', url);
        logger.outbound('API Request', { url });

        request(req, (err, httpResponse, body) => {
            if (!err && body && body.error) {
                err = new Error(body.error);
            }
            if (!err && body && body.errorMessages && body.errorMessages.length) {
                err = new Error(body.errorMessages.join(', '));
            }
            if (!err && typeof body !== 'object') {
                let summary = String(body).replace(/^[\s\S]*<title>([\s\S]*)<\/title>[\s\S]*$/i, '$1').substr(0, 30);
                err = new Error('Bad JSON response from ' + url + ' ' + summary);
            }
            if (err) {
                debug('API Error', err);
                err.url = url;
                return cb(err);
            }

            if (options.compact !== false) {
                body = compact(body, options.compactIgnorePattern);
            }

            if (this.cache && (options.canCache === true || typeof options.canCache === 'function' && options.canCache(body, url))) {
                let ttl = typeof options.ttl === 'function' ? options.ttl(body, url) : options.ttl;
                this.cache.set(url, body, ttl);
                this.cache.save();
            }

            cb(err, body);
        });
    }
}

module.exports = Api;
