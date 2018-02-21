'use strict';

const _ = require('lodash');

function sortByArray(array, id) {
    if (id) array = _.map(array, id);
    let order = _.invert(array);
    return (a, b) => order[a] - order[b];
}

module.exports = sortByArray;
