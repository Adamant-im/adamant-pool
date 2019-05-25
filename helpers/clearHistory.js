const config = require('./configReader');
const log = require('./log');

const {
    dbBlocks,
    dbRewards
} = require('./DB');

module.exports = async () => {
    const savedTime = new Date().getTime() - (parseInt(config.payoutperiod) * config.store_history || 5) 
        * 86400 * 1000 - 3600 * 1000;
  
    dbRewards.remove(({timeStamp: {$lt: savedTime}}), {multi: true}, (err, n) =>{
        log.info('Rewards removed: ' + n);
        dbBlocks.remove(({unixTimestamp: {$lt: savedTime}}), {multi: true}, (err, n) =>{
            log.info('Blocks removed: ' + n);
        });
    });
};