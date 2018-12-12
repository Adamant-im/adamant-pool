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
let lastForg = unixTime();
log.info('ADAMANT-pool started ' + config.address + '.');

const delegate = adamant.get('full_account', config.address);
let delegateForged = +delegate.delegate.forged;

iterat();

function iterat() {
	
	setTimeout(() => {
		try {
			const newForged = +adamant.get('delegate_forged', delegate.publicKey).forged;
			if (delegateForged < newForged) {
				lastForg = unixTime();
				const forged = newForged - delegateForged;
				log.info('New Forged: ' + forged / SAT + ' ADM.');
				const resRewards = rewardUsers(forged, delegateForged);
				if (resRewards) delegateForged = newForged;
			}

		} catch (e) {
			log.error('Get new Forged!');
		}

		iterat();
	}, TIME_RATE * 1000);
}

// refresh dbVoters if no forged
setTimeout(() => {
	rewardUsers(0);
}, 5000);

setInterval(() => {
	if (unixTime() - lastForg > 3600) rewardUsers(0);
}, 600 * 1000);

function unixTime() {
	return new Date().getTime() / 1000
}