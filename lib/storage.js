'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class Storage {
    constructor(name, saveCache) {
        this.name = name;
        let dir = (typeof saveCache === 'string') ? saveCache : './cache';
        if (saveCache) this.filename = path.resolve(__dirname, '..',  dir, this.name + '.json');
        this.load();
    }

    load() {
        if (this.filename) {
            try {
                let data = fs.readFileSync(this.filename, 'utf8');
                this.cache = JSON.parse(data);
            } catch (err) {
                logger.warn('No cache file found for :api', { api: this.name });
            }
        }

        if (!this.cache) this.cache = {};

        if (this.cache.VERSION < 2.0) return;
        for (let url in this.cache) {
            let record = this.cache[url];
            if (record.expires && record.expires < Date.now()) {
                delete this.cache[url];
            }
        }
    }

    save() {
        if (!this.filename) return;
        if (!this._lazySaveCache) this._lazySaveCache = _.debounce(this._save, 10000, this);
        this._lazySaveCache();
    }

    _save() {
        this.cache.VERSION = Storage.VERSION;
        fs.writeFile(
            this.filename,
            JSON.stringify(this.cache, (key, val) => val === null ? undefined : val, 2),
            'utf8',
            err => {
                if (err) logger.error('Error saving cache', { err });
            }
        );
    }

    set(url, data, ttl) {
        this.cache[url] = {
            expires: ttl ? Date.now() + ttl: undefined,
            data
        };
    }

    get(url) {
        if (!this.cache) this.load();
        let record = this.cache[url];
        if (!record) return;
        if (this.cache.VERSION < 2.0) return record;
        if (record.expires && record.expires < Date.now()) {
            delete this.cache[url];
            return;
        }
        return record.data;
    }
}

Storage.VERSION = 2.0;

module.exports = Storage;
