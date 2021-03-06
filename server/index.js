const config = require('../helpers/configReader');
const express = require('express');
const app = express();
const { dbVoters, dbTrans } = require('../helpers/DB');
const log = require('../helpers/log');
const DIR_NAME = __dirname + '/public/';
const Store = require('../modules/Store');

app.use('*.js', (req, res, next) => {
	res.set('Content-Type', 'text/javascript')
	next();
})

app.use('/', express.static(__dirname + '/public/'));

app.get('/', (req, res) => res.sendFile(DIR_NAME + 'index.html'));

app.get('/api/get-transactions', (req, res) => {
	dbTrans.find({}, (err, docs) => res.send(docs));
});

app.get('/api/get-voters', (req, res) => {
	dbVoters.find({}, (err, docs) => res.send(docs));
});

app.get('/api/get-delegate', async (req, res) => res.send(Store));

app.get('/api/get-config', async (req, res) => res.send({
	version: config.version,
	reward_percentage: config.reward_percentage,
	donate_percentage: config.donate_percentage,
	minpayout: config.minpayout,
	payoutperiod: config.payoutperiod,
	payoutperiodForged: Store.periodInfo.totalForgedADM,
	payoutperiodRewards: Store.delegate.pendingRewardsADM,
	payoutperiodPreviousRunTimestamp: Store.periodInfo.previousRunTimestamp,
	payoutperiodNextRunTimestamp: Store.periodInfo.nextRunTimestamp
}));

app.listen(config.port, () => log.log(`Pool ${config.address} successfully started a web server.`));
