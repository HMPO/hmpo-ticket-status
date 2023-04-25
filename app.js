'use strict';

module.exports = function (configData, app) {
    const config = require('./lib/config');
    config.reset(configData);

    const express = require('express');
    const bodyParser = require('body-parser');
    const hmpoLogger = require('hmpo-logger');
    const logger = require('./lib/logger');
    const engine = require('./engine');

    const routes = {
        auth: require('./routes/auth'),
        list: require('./routes/list'),
        project: require('./routes/project')
    };

    app = app || express();

    app.set('views', __dirname + '/views');
    app.set('view engine', 'jsx');
    app.engine('jsx', engine.createEngine());

    app.use(express.static(__dirname + '/public'));
    app.use(hmpoLogger.middleware());

    app.get('/reset', routes.auth.reset);
    app.get('/', routes.list.get);
    app.get('/*', routes.auth.checkCredentials);
    app.post('/*', bodyParser.urlencoded({extended: true}), routes.auth.login);

    app.get('/*', routes.project.get);

    let port = config.get('port');
    app.listen(port, () => logger.info('Server started on port :port', { port }));

    return app;
};

if (require.main === module) module.exports();
