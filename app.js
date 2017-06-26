'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const hmpoLogger = require('hmpo-logger');
const logger = require('./lib/logger');
const config = require('./lib/config');

const routes = {
    auth: require('./routes/auth'),
    list: require('./routes/list'),
    project: require('./routes/project')
};

config.reset();

let app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'jsx');
app.engine('jsx', require('express-react-views').createEngine());

app.use(express.static(__dirname + '/public'));
app.use(hmpoLogger.middleware());

app.get('/reset', routes.auth.reset);
app.post('/*', bodyParser.urlencoded({extended: true}), routes.auth.login);
app.use(routes.auth.checkCredentials);
app.get('/', routes.list.get);
app.get('/:project', routes.project.get);

let port = config.get('port');
app.listen(port, () => logger.info('Server started on port :port', { port }));

