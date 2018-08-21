'use strict';

class Storage {
    constructor(name) {
        this.name = name;
        this.cache = {};
    }

    set(url, data, ttl, cb) {
        this.cache[url] = {
            expires: ttl ? Date.now() + ttl: undefined,
            data
        };
        if (cb) cb();
    }

    get(url, cb) {
        let record = this.cache[url];
        if (!record) return cb(null);
        if (record.expires && record.expires < Date.now()) {
            delete this.cache[url];
            return cb(null);
        }
        return cb(null, record.data);
    }
}

module.exports = Storage;
