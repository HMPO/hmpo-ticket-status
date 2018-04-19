'use strict';

const config = require('config');
const _ = require('lodash');
const deepCloneMerge = require('deep-clone-merge');

let options = {};

module.exports = {
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
