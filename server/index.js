const config = require('../config.json');
const adamant = require('adamant-rest-api')(config);
const express = require('express');
const app = express();
const {
	dbVoters,
	dbTrans
} = require('../helpers/DB');
const log = require('../helpers/log');
const port = config.port;
const DIR_NAME = __dirname + '/';

app.use('/assets', express.static(__dirname + '/public'));

app.get('/', (req, res) => res.sendFile(DIR_NAME + '/index.html'));

app.get('/api/get-transactions', async(req, res) => res.send(await dbTrans.syncFind({})));

app.get('/api/get-voters', async(req, res) => res.send(await dbVoters.syncFind({})));

app.get('/api/get-delegate', async(req, res) => res.send(adamant.get('full_account', config.address)));

app.get('/api/get-config', async(req, res) => res.send({
	reward_percentage: config.reward_percentage,
	minpayout: config.minpayout,
	payoutperiod: config.payoutperiod
}));

app.listen(port, () => log.info('ADAMANT-pool server listening on port ' + port));
