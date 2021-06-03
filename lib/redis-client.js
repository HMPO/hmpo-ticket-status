'use strict';

const redis = require('redis');
const logger = require('./logger');

const redisClient = {
    client: null,

    retry_strategy: function (options) {
        if (options.error && options.error.code === 'ECONNREFUSED') {
            return new Error('REDIS: The server refused the connection');
        }
        if (options.total_retry_time > 1000 * 60 * 5) {
            return new Error('REDIS: Retry time exhausted');
        }
        if (options.attempt > 10) {
            return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
    },

    getClient(redisOptions = {}) {
        if (!redisClient.client || !redisClient.client.connected) {
            redisOptions = Object.assign(
                { retry_strategy: redisClient.retry_strategy },
                redisOptions
            );
            redisClient.client = redis.createClient(redisOptions);
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
