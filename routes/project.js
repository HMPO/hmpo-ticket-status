'use strict';

const data = require('../lib/data');

module.exports = {
    get(req, res, next) {
        data.get().getData(req.params.project, (err, data) => {
            if (err) return next(err);
            res.render('main', data);
        });
    }
};
