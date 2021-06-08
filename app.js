const config = require('./helpers/configReader');
const log = require('./helpers/log');
const notifier = require('./helpers/notify');
const Store = require('./modules/Store');
const blocksChecker = require('./modules/blocksChecker');

setTimeout(async () => {

	require('./helpers/cron');
	require('./server');


	// const api = require('./helpers/api');

	// api.get('transactions/get', { id: '12154642911137703318', returnAsset: 1 }).then(response => {
	// 	if (response.success) {
	// 		const chat = response.data.transaction.asset.chat;
	// 		if (chat) {
	// 			console.log(1)
	// 			msg = api.decodeMsg(chat.message, response.data.transaction.senderPublicKey, config.passPhrase, chat.own_message);
	// 			console.log(msg)
	// 		}
	// 	}
	// })

	// let address = 'U14984117450827398783'
	// let amount = 0.0000000114

	// let payment = await api.sendTokens(config.passPhrase, address, amount);
	// if (payment.success) {
	// 		log.log(`Successfully payed ${amount.toFixed(8)} ADM reward to ${address} with Tx ${payment.data.transactionId}.`);
	// } else {
	// 	log.warn(`Failed to process payment of ${amount} ADM reward to ${address}. ${payment.errorMessage}.`);
	// }

	// let pub = await api.getPublicKey(address);
	// console.log('pub', pub)


	// payment = await api.sendMessage(config.passPhrase, address, '{"type":"eth_transaction","amount":"0.0021","hash":"10xfa46db3c99878f1f9863fcbdb0bc27d220d7065c6528543cbb83ced84487deb","comments":"I like to send it, send it"}', 'basic', amount);
	// if (payment.success) {
	// 		log.log(`Successfully sent message to ${address} with Tx ${payment.data.transactionId}.`);
	// } else {
	// 	log.warn(`Failed to sent message to ${address}. ${payment.errorMessage}`);
	// }


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
