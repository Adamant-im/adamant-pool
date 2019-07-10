const jsonminify = require('jsonminify');
const fs = require('fs');
const log = require('./log');
const isDev = process.argv.reverse()[0] === 'dev';
let config = {};

try {
    if (isDev) {
        config = require('../tests');
    } else {
        config = JSON.parse(jsonminify(fs.readFileSync('./config.json', 'utf-8')));
    }
    config.isDev = isDev;
    if (!config.node) {
        exit('Not defined required value node!');
    }
    if (!config.reward_percentage) {
        config.reward_percentage = 80;
    }
    if (!config.minpayout) {
        config.minpayout = 10;
    }
    if (!config.payoutperiod) {
        config.payoutperiod = '10d';
    }
    if (!config.port) {
        config.port = 36668;
    }

} catch (e) {
    console.log('Err config:' + e);
    exit('Create config: ' + e);
}

module.exports = config;

function exit(msg) {
    log.error(msg);
    process.exit(-1);
}