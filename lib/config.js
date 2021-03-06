'use strict';
const resolve = require('path').resolve;

process.env.NODE_CONFIG_DIR = resolve(__dirname, '..', 'config');
const config = require('config');

const _ = require('lodash');
const deepCloneMerge = require('deep-clone-merge');

let options = {};

module.exports = {
    api(name) {
        return deepCloneMerge(
            _.get(options, 'engines.all'),
            _.get(options, 'engines.' + name)
        );
    },

    get(name) {
        return _.get(options, name);
    },

    set(name, value) {
        _.set(options, name, value);
    },

    reset(configData) {
        options = deepCloneMerge(config.get('config'), configData);
    }
};
