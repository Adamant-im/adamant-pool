import {distributeRewards} from './distributeRewards.js';

import {dbBlocks} from '../helpers/DB.js';
import {log, utils} from '../helpers/index.js';

const takenInProcessBlocks = {}; // cache for blocks

export default async (block) => {
  const errorTemplate = `Error while processing ${block.id} (height ${block.height})`;

  if (block?.id && !takenInProcessBlocks[block.id]) {
    let savedBlock;

    try {
      savedBlock = await dbBlocks.findOne({id: block.id});
    } catch (error) {
      return log.error(`${errorTemplate}: ${error}`);
    }

    if (savedBlock) {
      if (!savedBlock.processed) {
        log.info(`Re-trying to distribute rewards for block ${block.id} (height ${block.height})…`);

        distributeRewards(block);
      }

      return;
    }

    log.info(`New block forged: ${block.id} (height ${block.height}).`);

    let insertBlock;

    try {
      insertBlock = await dbBlocks.insert(block);
    } catch (error) {
      return log.error(`${errorTemplate}: ${error}`);
    }

    if (insertBlock) {
      log.info(
          `Block successfully saved: ${block.id} (height ${block.height}). Distributing rewards…`,
      );

      distributeRewards(block);
      takenInProcessBlocks[block.id] = utils.unix();
    } else {
      log.warn(`Failed to save block ${block.id} (height ${block.height}).`);
    }
  }
};
