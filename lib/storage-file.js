'use strict';

const _ = require('lodash');
const Storage = require('./storage');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class StorageFile extends Storage {
    constructor(name, saveCache) {
        super(name);
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

        for (let url in this.cache) {
            let record = this.cache[url];
            if (record.expires && record.expires < Date.now()) {
                delete this.cache[url];
            }
        }
    }

    save() {
        if (!this.filename) return;
        if (!this._lazySaveCache) this._lazySaveCache = _.debounce(this._save, 20000, this);
        this._lazySaveCache();
    }

    _save() {
        fs.writeFile(
            this.filename,
            JSON.stringify(this.cache, (key, val) => val === null ? undefined : val, 2),
            'utf8',
            err => {
                if (err) logger.error('Error saving cache', { err });
            }
        );
    }

    set(url, data, ttl, cb) {
        super.set(url, data, ttl);
        this.save();
        if (cb) cb();
    }
}

module.exports = StorageFile;
