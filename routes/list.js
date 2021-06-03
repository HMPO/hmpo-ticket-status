'use strict';

const data = require('../lib/data');

module.exports = {
    get(req, res, next) {
        const projects = data.getProjects();
        res.render('list', { projects });
    }
};
