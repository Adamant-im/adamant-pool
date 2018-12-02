const config=require('../config.json');
const express = require('express');
const app = express();
// const {dbVoters, dbTrans}= require('./DB');
const port = config.port;
const DIR_NAME='../'+__dirname+'/server';

app.get('/', (req, res) => res.sendFile(DIR_NAME + '/index.html'));



app.listen(port, () => console.log(`ADAMANT-pool app listening on port ${port}!`))
