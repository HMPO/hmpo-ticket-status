'use strict';

const _ = require('lodash');
const debug = require('./debug')('hmpo:api');
const storage = require('./storage');

const rePlaceholder = /\{([a-z]+)(:date|:enc|:alpha)?\}/ig;

class Api {
    constructor(options) {
        this.config = _.extend({
            api: 'generic',
            headers: {
                'Accept': 'application/json'
            }
        }, options);
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
        options = _.defaults({}, options, this.config);
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

        if (options.canCache) {
            let cached = storage.get(url);
            if (cached) {
                debug('API Cached', url);
                return cb(null, cached);
            }
        }

        let opts = _.extend({
            cache: 'reload',
            headers: _.mapValues(options.headers, value => this.buildString(value)),
            credentials: 'include',
            modde: 'cors'
        }, options.fetch);

        debug('API Request', url);

        fetch(url, opts)
        .then(response => {
            if (!response.ok) {
                let err = new Error('Not OK. Status: ' + response.status + ' ' + response.statusText);
                err.statusCode = response.status;
                err.url = url;
                throw err;
            }
            return response.json();
        })
        .then(body => {
            let err;
            if (body && body.error) {
                err = new Error(body.error);
            }
            if (body && body.errorMessages && body.errorMessages.length) {
                err = new Error(body.errorMessages.join(', '));
            }
            if (typeof body !== 'object') {
                let summary = String(body).replace(/^[\s\S]*<title>([\s\S]*)<\/title>[\s\S]*$/i, '$1').substr(0, 30);
                err = new Error('Bad JSON response from ' + url + ' ' + summary);
            }
            if (err) {
                err.url = url;
                throw err;
            }

            if (options.compact !== false) {
                body = storage.compact(body, options.compactIgnorePattern);
            }

            if (options.canCache === true || typeof options.canCache === 'function' && options.canCache(body, url)) {
                storage.set(url, body);
            }

            debug('API Response', url);
            cb(null, body);
        })
        .catch(err => {
            err.url = url;
            debug('API Error', err);
            cb(err);
        });
    }
}

module.exports = Api;
