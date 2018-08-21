'use strict';

const redis = require('redis');
const logger = require('./logger');

const redisClient = {
    client: null,

    getClient({port, host}) {
        if (!redisClient.client || !redisClient.client.connected) {
            redisClient.client = redis.createClient(port, host);
            redisClient.client.on('error', e => {
                throw e;
            });
        }
        return redisClient.client;
    },

    close(cb) {
        if (!redisClient.client || !redisClient.client.connected) {
            redisClient.client = null;
            return cb();
        }

        logger.info('Closing Redis connection');
        redisClient.client.once('end', cb);
        redisClient.client.quit();
        redisClient.client = null;
    }
};

module.exports = redisClient;
