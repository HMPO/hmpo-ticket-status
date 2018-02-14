'use strict';

const config = require('config');
const hmpoLogger = require('hmpo-logger');
const express = require('express');

let logger = hmpoLogger.config(config.get('config.logs')).get();

let app = express();
app.use(express.static(__dirname + '/dist'));
app.use(hmpoLogger.middleware());

let port = config.get('config.port');
app.listen(port, () => logger.info('Server started on port :port', { port }));

