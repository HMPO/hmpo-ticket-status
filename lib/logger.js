'use strict';

const config = require('./config');
const hmpoLogger = require('hmpo-logger');
let logger = hmpoLogger.config(config.get('logs')).get();

module.exports = logger;
