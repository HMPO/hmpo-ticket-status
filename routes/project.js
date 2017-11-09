'use strict';

const data = require('../lib/data');

module.exports = {
    get(req, res, next) {
        let options = {
            count: parseInt(req.query.count, 10) || 100
        };
        data.get().getData(req.params.project, options, (err, data) => {
            if (err) return next(err);
            res.render('main', data);
        });
    }
};
