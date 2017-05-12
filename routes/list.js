'use strict';

const data = require('../lib/data');

module.exports = {
    get(req, res, next) {
        data.get().getProjects((err, data) => {
            if (err) return next(err);
            res.render('list', data);
        });
    }
};
