'use strict';

const data = require('../lib/data');

module.exports = {
    get(req, res, next) {
        let options = {
            count: parseInt(req.query.count, 10) || 100
        };
        const project = req.path.replace(/^\/+|\/+$/g, '');
        data.get().getData(project, options, (err, data) => {
            if (err) return next(err);
            res.render('main', data);
        });
    }
};
