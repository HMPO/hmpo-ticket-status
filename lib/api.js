'use strict';

const request = require('request');
const _ = require('lodash');
const debug = require('debug')('hmpo:api');

const rePlaceholder = /\{([a-z]+)(:date|:enc|:alpha)?\}/ig;

class Api {
    constructor() {
        this.config = {
        };

        this.cache = {};
    }

    setCache(url, data) {
        this.cache[url] = data;
    }

    getCache(url) {
        return this.cache[url];
    }

    buildString(str, options, defaultValue) {
        if (typeof str !== 'string') return str;
        return str.replace(rePlaceholder, (match, key, encoding) => {
            let val = this.buildString(options[key], options);
            if (encoding === ':alpha')
                return String(val).replace(/[^a-z0-9-]/gi, '');
            if (encoding === ':enc')
                return encodeURIComponent(String(val));
            if (encoding === ':date')
                return val !== undefined ? new Date(val).toISOString() : '';
            return String(val === undefined ? defaultValue : val);
        });
    }

    request(options, cb) {
        options = _.defaults({}, options, this.config, { privateToken: this.privateToken });
        options.params = _.defaults({}, options.params, this.config.params);

        let url = this.buildString(options.url, options);
        let params = _.compact(_.map(
            _.keys(options.params),
            key => {
                let value = this.buildString(options.params[key], options, '');
                if (value) return encodeURIComponent(key) + '=' + encodeURIComponent(value);
            }
        ));
        if (params.length) url += '?' + params.join('&');

        let cached = this.getCache(url);
        if (options.canCache && cached) {
            debug('API Cached', url);
            return cb(null, cached);
        }

        let req = {
            uri: url,
            json: true,
            headers: _.mapValues(options.headers, value => this.buildString(value)),
            auth: options.auth
        };

        debug('API Request', url);

        request(req, (err, httpResponse, body) => {
            if (!err && body.error) {
                err = new Error(body.error);
            }
            if (!err && body.errorMessages && body.errorMessages.length) {
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

            if (options.canCache === true || typeof options.canCache === 'function' && options.canCache(body, url)) {
                this.setCache(url, body);
            }

            cb(err, body);
        });
    }
}

module.exports = Api;
