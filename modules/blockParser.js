const { dbVoters, dbBlocks, dbRewards } = require('../helpers/DB');
const log = require('../helpers/log');
const api = require('../helpers/api');
const config = require('../helpers/configReader');
const notify = require('../helpers/notify');

module.exports = async (block) => {
  try {

    const savedBlock = await dbBlocks.syncFindOne({ id: block.id });
    if (savedBlock !== null) {
      return;
    };

    log.info(`New block forged: ${block.id}`);

    const insertBlock = await dbBlocks.syncInsert(block);
    if (insertBlock) {
      log.info(`Block successfully saved: ${block.id}`);
      // distributeRewards(block)
    } else {
      log.warn(`Failed to save block ${block.id}. Will try again, if I'll receive it.`);
    }

  } catch (e) {
    log.error('Error while processing block:', block, e);
  }
}
