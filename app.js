const { TIME_RATE, SAT } = require('./helpers/const');
const config = require('./helpers/configReader');
const adamant = require('./helpers/api');
const rewardUsers = require('./helpers/rewardUsers');
const log = require('./helpers/log');
const notifier = require('./helpers/notify');
const Store = require('./modules/Store');
const delegateInfo = require('./modules/delegateInfo');

let lastForg = unixTime(),
	delegateForged;
// Init
setTimeout(async () => {
	require('./helpers/cron');
	await initDelegate();
	require('./server');
	// console.log('config', config)
	// delegateForged = + (await adamant.get('delegate_forged', Store.delegate.publicKey)).forged;
	// await Store.updateDelegate(true);
	// notifier(`Pool ${Store.poolname} started for address _${Store.delegate.address}_ (ver. ${Store.version}).`, 'info');
	// iterat();
}, 000);

async function initDelegate() {
	const pool = await delegateInfo.getDelegate(config.publicKey)
	if (pool.success) {
		if (pool.result.success) {
			config.poolName = pool.result.delegate.username;
			// config.poolInfo = Object.assign(config.delegate, pool.result.delegate);
		} else {
			exit(`Unable to get delegate for ${config.address}. Node's reply: ${pool.result.error}. Cannot start Pool.`);
		}
	} else {
		exit(`Failed to get delegate for ${config.address}, ${pool.error}. Message: ${pool.message}. Cannot start Pool.`);
	}
	config.logName = `_${config.poolName}_ (${config.address})`
	notifier(`Pool ${config.logName} started on v${config.version} software. Payouts every ${config.payoutperiod}`, 'info');
}

function exit(msg) {
	log.error(msg);
	process.exit(-1);
}

function iterat() {
	setTimeout(async () => {
		try {
			const newForged = + (await adamant.get('delegate_forged', Store.delegate.publicKey)).forged;
			if (isNaN(newForged)) {
				const msg = `Pool ${Store.poolname} _newForged_ value _isNaN_! Please check Internet connection.`;
				notifier(msg, 'error');
				log.error(msg);
				iterat();
				return;
			}
			Store.delegate.totalForged = delegateForged;
			if (delegateForged < newForged) {
				lastForg = unixTime();
				const forged = newForged - delegateForged;
				log.info('New Forged: ' + forged / SAT + ' ADM.');
				const resRewards = rewardUsers(forged, delegateForged);
				if (resRewards) {
					delegateForged = newForged;
				}
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
}, 10000);

setInterval(() => {
	if (unixTime() - lastForg > 600) {
		rewardUsers(0);
	}
}, 600 * 1000);

function unixTime() {
	return new Date().getTime() / 1000;
}
