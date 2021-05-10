const { UPDATE_FORGE_INTERVAL, SAT } = require('./helpers/const');
const config = require('./helpers/configReader');
const api = require('./helpers/api');
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
	require('./server');
	await initDelegate();
	require('./modules/blocksChecker');
	// console.log('config', config)
	// delegateForged = + (await adamant.get('delegate_forged', Store.delegate.publicKey)).forged;
	// await Store.updateDelegate(true);
	// notifier(`Pool ${Store.poolname} started for address _${Store.delegate.address}_ (ver. ${Store.version}).`, 'info');
	// iterat();
}, 000);

async function initDelegate() {
	const pool = await Store.updateDelegate();
	if (pool) {
		config.poolName = pool.username;
	} else {
		log.error(`Failed to get delegate for ${config.address}. Cannot start Pool.`);
		process.exit(-1);
	}
	config.logName = `_${config.poolName}_ (${config.address})`
	config.infoString = `distributes _${config.reward_percentage}_% rewards with payouts every _${config.payoutperiod}_. Minimum payout is _${config.minpayout}_ ADM.`
	notifier(`Pool ${config.logName} started on v${config.version} software and listens port ${config.port}. It ${config.infoString}`, 'info');
}

function exit(msg) {
	log.error(msg);
	process.exit(-1);
}

function iterat() {
	setTimeout(async () => {
		try {
			const newForged = + (await api.get('delegate_forged', Store.delegate.publicKey)).forged;
			if (isNaN(newForged)) {
				const msg = `Pool ${Store.poolName} _newForged_ value _isNaN_! Please check Internet connection.`;
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
	}, UPDATE_FORGE_INTERVAL);
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
