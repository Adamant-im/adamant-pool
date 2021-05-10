const { UPDATE_BLOCKS_INTERVAL } = require('../helpers/const');
const api = require('../helpers/api');
const blockParser = require('./blockParser');
const log = require('../helpers/log');
const config = require('../helpers/configReader');

async function getBlocks() {
	try {

    const blocks = await api.get('blocks');
		if (blocks.success) {
      if (blocks.result.success) {
        const delegateBlocks = blocks.result.blocks.filter(block => block.generatorPublicKey === config.publicKey);
        delegateBlocks.forEach(block => {
          blockParser(block)
        });
      } else {
        log.warn(`Failed to get blocks. Node's reply: ${blocks.result.error}.`);
      }
		} else {
      log.warn(`Failed to get blocks, ${blocks.error}. Message: ${blocks.message}.`);
    }

	} catch (e) {
		log.error('Error while checking new blocks:', e);
	}
}

getBlocks();
module.exports = () => {
	setInterval(getBlocks, UPDATE_BLOCKS_INTERVAL);
};
