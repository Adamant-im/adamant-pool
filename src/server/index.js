import express from 'express';

import {join, dirname} from 'path';
import {fileURLToPath} from 'url';

import Store from '../modules/Store.js';

import {dbVoters, dbTrans} from '../helpers/DB.js';
import config from '../helpers/config/reader.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

const publicDirectoryPath = join(__dirname, '/public');

app.use('*.js', (req, res, next) => {
  res.set('Content-Type', 'text/javascript');
  next();
});

app.use('/', express.static(publicDirectoryPath));

app.get('/', (req, res) => res.sendFile(`${publicDirectoryPath}/index.html`));

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
  payoutperiodNextRunTimestamp: Store.periodInfo.nextRunTimestamp,
}));

export default app;
