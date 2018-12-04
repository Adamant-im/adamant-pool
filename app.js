const {TIME_RATE, SAT} = require('./helpers/const');
const _ = require('lodash');
const config = require('./config.json');
const adamant = require('adamant-rest-api')(config);
const rewardUsers = require('./helpers/rewardUsers');
const log = require('./helpers/log');
const cron= require('./helpers/cron');
const server = require('./server');
log.info('ADAMANT-pool started ' + config.address + '.');

const delegate = adamant.get('full_account', config.address);
let delegateForged = +delegate.delegate.forged;


setInterval(() => {	
	const newForged=+adamant.get('delegate_forged', delegate.publicKey).forged;
	
	if (delegateForged < newForged) {
		const forged = +(newForged - delegateForged).toFixed(8);
        log.info('New Forged: ' + forged/SAT + ' ADM.');
        delegateForged = newForged;
		
        rewardUsers(forged, delegateForged);
	}
}, TIME_RATE * 1000);

