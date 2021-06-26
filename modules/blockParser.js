const { dbBlocks } = require('../helpers/DB');
const log = require('../helpers/log');
const { distributeRewards } = require('./distributeRewards');
const utils = require('../helpers/utils');

const takenInProcessBlocks = {}; // cache for blocks

module.exports = async (block) => {

  if (!block || !block.id || takenInProcessBlocks[block.id]) return;

  try {

    const savedBlock = await dbBlocks.syncFindOne({ id: block.id });
    if (savedBlock) {
      if (savedBlock.processed) {
        return
      } else {
        log.info(`Re-trying to distribute rewards for block ${block.id} (height ${block.height})…`);
        distributeRewards(block);
        return
      }
    };

    log.info(`New block forged: ${block.id} (height ${block.height}).`);

    const insertBlock = await dbBlocks.syncInsert(block);
    if (insertBlock) {
      log.info(`Block successfully saved: ${block.id} (height ${block.height}). Distributing rewards…`);
      distributeRewards(block);
      takenInProcessBlocks[block.id] = utils.unix();
    } else {
      log.warn(`Failed to save block ${block.id} (height ${block.height}).`);
    }

  } catch (e) {
    log.error(`Error while processing ${block.id} (height ${block.height}): ` + e);
  }
}
