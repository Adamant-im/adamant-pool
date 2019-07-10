const log = require('./log');
const config = require('./configReader');
module.exports = require('adamant-api')(config, log);