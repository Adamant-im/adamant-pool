const config = require('./helpers/configReader');
const log = require('./helpers/log');
const notifier = require('./helpers/notify');
const Store = require('./modules/Store');
const blocksChecker = require('./modules/blocksChecker');

setTimeout(async () => {

	require('./helpers/cron');
	require('./server');
	await initDelegate();
	blocksChecker();
	
}, 0);

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
	Store.updateBalance();
	Store.updateVoters();
	Store.updateStats();
}
