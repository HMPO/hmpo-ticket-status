'use strict';

const config = require('config');
const _ = require('lodash');

let options = {};

module.exports = {
    get(name) {
        return _.get(options, name);
    },

    set(name, value) {
        _.set(options, name, value);
    },

    reset() {
        options = config.util.cloneDeep(config.get('config'));
    }
};
