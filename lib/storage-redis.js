'use strict';

const Storage = require('./storage');
const redisClient = require('./redis-client');

class StorageRedis extends Storage {
    constructor(name, config) {
        super(name);
        this.config = config;
    }

    key(url)  {
        return 'PTS:' + this.name + ':' + url;
    }

    set(url, data, ttl, cb) {
        super.set(url, data, ttl);
        let redis = redisClient.getClient(this.config);
        let redisData = JSON.stringify(data);
        if (ttl) {
            redis.setex(this.key(url), Math.ceil(ttl/1000), redisData, cb);
        } else {
            redis.set(this.key(url), redisData, cb);
        }
    }

    get(url, cb) {
        let redis = redisClient.getClient(this.config);
        redis.get(this.key(url), (err, data) => {
            try {
                data = JSON.parse(data);
            } catch (e) {
                data = null;
            }
            if (data) return cb(null, data);
            return super.get(url, cb);
        });
    }
}

module.exports = StorageRedis;
