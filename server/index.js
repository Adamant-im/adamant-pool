const config = require('../config.json');
const adamant = require('adamant-rest-api')(config);
const express = require('express');
const app = express();
const {dbVoters, dbTrans} = require('../helpers/DB');
const log = require('../helpers/log');
const periodData=require('../helpers/periodData');
const port = config.port || 36668;
const DIR_NAME = __dirname + '/';

let Forged=0;
app.use('/assets', express.static(__dirname + '/public'));

app.get('/', (req, res) => res.sendFile(DIR_NAME + '/index.html'));

app.get('/api/get-transactions', (req, res) => {
	dbTrans.find({}, (err, docs)=>{
		res.send(docs);
	});	
	
});

app.get('/api/get-voters', (req, res) => {
	dbVoters.find({}, (err, docs)=>{
		res.send(docs);
	});		
});

app.get('/api/get-delegate', async(req, res) => res.send(adamant.get('full_account', config.address)));

app.get('/api/get-config', async(req, res) => res.send({
	reward_percentage: config.reward_percentage,
	minpayout: config.minpayout, 
	payoutperiod: config.payoutperiod,
	payoutperiodForged:periodData.forged,
	payoutperiodRewards:periodData.rewards,
	payoutperiodStart:periodData.startPeriod	
}));

app.listen(port, () => log.info('ADAMANT-pool server listening on port ' + port));



// async function refreshForged(){
// Forged=await periodData();
// }

// refreshForged();

// setInterval(()=>{
// refreshForged();
// }, 300*1000);