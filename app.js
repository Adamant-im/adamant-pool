const {
	TIME_RATE,
	SAT
} = require('./helpers/const');
const config = require('./helpers/configReader');
const rewardUsers = require('./helpers/rewardUsers');
const adamant = require('./helpers/api');
const log = require('./helpers/log');
const cron = require('./helpers/cron');
const server = require('./server');

log.info('ADAMANT-pool started ' + config.address + '.');

const delegate = adamant.get('full_account', config.address);
let delegateForged = +delegate.delegate.forged;

setInterval(() => {
	try {
		const newForged = +adamant.get('delegate_forged', delegate.publicKey).forged;
		if (delegateForged < newForged) {
			const forged = +(newForged - delegateForged).toFixed(8);
			log.info('New Forged: ' + forged / SAT + ' ADM.');
			const resRewards = rewardUsers(forged, delegateForged);
			if (resRewards) delegateForged = newForged;
		}

	} catch (e) {

		log.error('Get new Forged!');
	}
}, TIME_RATE * 1000);