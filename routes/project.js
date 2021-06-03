'use strict';

const data = require('../lib/data');

module.exports = {
    get(req, res, next) {
        let options = {
            count: parseInt(req.query.count, 10) || 100
        };
        const project = req.path.toLowerCase().replace(/^\/+|\/+$/g, '');
        data.get().getData(project, options, (err, props) => {
            if (err) return next(err);
            if (!props.releases.length) {
                return res.render('notfound', props);
            }
            data.addProject(project);
            res.render('main', props);
        });
    }
};
