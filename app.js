const { UPDATE_FORGE_INTERVAL, SAT } = require('./helpers/const');
const config = require('./helpers/configReader');
const api = require('./helpers/api');
const log = require('./helpers/log');
const notifier = require('./helpers/notify');
const Store = require('./modules/Store');
const delegateInfo = require('./modules/delegateInfo');
const blocksChecker = require('./modules/blocksChecker');

// let lastForg = unixTime(),
// 	delegateForged;
// Init
setTimeout(async () => {
	require('./helpers/cron');
	require('./server');

	let address = 'U14984117450827398783'
	let amount = 0.0000000114
	// const payment = await api.sendTokens(config.passPhrase, address, amount);
	// if (payment.success) {
	// 	if (payment.result.success) {
	// 		log.log(`Successfully payed ${amount.toFixed(8)} ADM reward to ${address}.`);

	// 	} else {
	// 		log.warn(`Unable to pay ${amount} ADM reward to ${address}. Node's reply: ${payment.result.error}.`);
	// 	}
	// } else {
	// 	log.warn(`Failed to process payment of ${amount} ADM reward to ${address}, ${payment.error}. Message: ${payment.message}.`);
	// }

	let pub = await api.getPublicKey(address);
	console.log('pub', pub)

	let payment = await api.sendMessage(config.passPhrase, address, '{"type":"eth_transaction","amount":"0.002","hash":"0xfa46db3c99878f1f9863fcbdb0bc27d220d7065c6528543cbb83ced84487deb","comments":"I like to send it, send it"}');
	if (payment.success) {
			log.log(`Successfully sent message to ${address}.`);
	} else {
		log.warn(`Failed to sent message to ${address}. ${payment.errorMessage}`);
	}
	// process.exit(-1)
	
	await initDelegate();
	blocksChecker();
	// console.log('config', config)
	// delegateForged = + (await adamant.get('delegate_forged', Store.delegate.publicKey)).forged;
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
	Store.updateBalance();
	Store.updateVoters();
}

// function iterat() {
// 	setTimeout(async () => {
// 		try {
// 			const newForged = + (await api.get('delegate_forged', Store.delegate.publicKey)).forged;
// 			if (isNaN(newForged)) {
// 				const msg = `Pool ${Store.poolName} _newForged_ value _isNaN_! Please check Internet connection.`;
// 				notifier(msg, 'error');
// 				log.error(msg);
// 				iterat();
// 				return;
// 			}
// 			Store.delegate.totalForged = delegateForged;
// 			if (delegateForged < newForged) {
// 				lastForg = unixTime();
// 				const forged = newForged - delegateForged;
// 				log.info('New Forged: ' + forged / SAT + ' ADM.');
// 				const resRewards = rewardUsers(forged, delegateForged);
// 				if (resRewards) {
// 					delegateForged = newForged;
// 				}
// 			}

// 		} catch (e) {
// 			log.error('Get new Forged!');
// 		}
// 		iterat();
// 	}, UPDATE_FORGE_INTERVAL);
// }

// refresh dbVoters if no forged
// setTimeout(() => {
// 	rewardUsers(0);
// }, 10000);

// setInterval(() => {
// 	if (unixTime() - lastForg > 600) {
// 		rewardUsers(0);
// 	}
// }, 600 * 1000);

// function unixTime() {
// 	return new Date().getTime() / 1000;
// }
