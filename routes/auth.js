'use strict';

const data = require('../lib/data');
const config = require('../lib/config');

module.exports = {
    reset(req, res, next) {
        config.reset();
        res.redirect('/');
    },

    login(req, res, next) {
        const engines = config.get('engines');
        for (let engineName in engines) {
            if (req.body[engineName + '_username'] && req.body[engineName + '_password']) {
                config.set(
                    'engines.' + engineName + '.credentials',
                    {
                        username: req.body[engineName + '_username'],
                        password: req.body[engineName + '_password']
                    }
                );
            }
            if (req.body[engineName + '_token']) {
                config.set(
                    'engines.' + engineName + '.privateToken',
                    req.body[engineName + '_token']
                );
            }
        }

        data.reset();

        res.redirect(req.originalUrl);
    },

    checkCredentials(req, res, next) {
        const engines = config.get('engines');
        const missingCredentials = {};
        for (let engineName in engines) {
            let engine = engines[engineName];

            if (engine.class && engine.credentials && !engine.credentials.password) {
                missingCredentials[engineName] = { username: engine.credentials.username || '' };
            }
            if (engine.class && !engine.credentials && !engine.privateToken && !engine.noCredentials) {
                missingCredentials[engineName] = { token: '' };
            }
        }

        if (Object.keys(missingCredentials).length) {
            return res.render('login', { missingCredentials });
        }
        next();
    }
};

