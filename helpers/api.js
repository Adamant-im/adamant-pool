const config = require('./configReader');
const log = require('./log');
module.exports = require('adamant-api')({ node: config.node_ADM, logLevel: config.log_level }, log);
