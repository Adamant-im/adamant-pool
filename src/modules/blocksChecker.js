import blockParser from './blockParser.js';

import {api, config, log} from '../helpers/index.js';
import {UPDATE_BLOCKS_INTERVAL} from '../helpers/const.js';

async function getBlocks() {
  try {
    const blocks = await api.get('blocks', {limit: 100});

    if (blocks.success) {
      const delegateBlocks = blocks.data.blocks.filter(
          (block) => block.generatorPublicKey === config.publicKey,
      );

      delegateBlocks.forEach((block) => blockParser(block));
    } else {
      log.warn(`Failed to get blocks. ${blocks.errorMessage}.`);
    }
  } catch (error) {
    log.error(`Error while checking new blocks: ${error}`);
  }
}

export default () => {
  getBlocks();
  if (process.env.NODE_ENV !== 'test') {
    setInterval(getBlocks, UPDATE_BLOCKS_INTERVAL);
  }
};
