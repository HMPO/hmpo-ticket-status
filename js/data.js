'use strict';

const config = require('../config');
const MergedApis = require('./merged-apis');

let data;

module.exports = {
    reset() {
        data = null;
    },

    get() {
        if (!data) data = new MergedApis(config);
        return data;
    }
};
