const { UPDATE_BLOCKS_INTERVAL } = require('../helpers/const');
const api = require('../helpers/api');
const blockParser = require('./blockParser');
const config = require('../helpers/configReader');
const log = require('../helpers/log');

async function getBlocks() {
	try {

    const blocks = await api.get('blocks', { limit: 100 });
		if (blocks.success) {
      const delegateBlocks = blocks.data.blocks.filter(block => block.generatorPublicKey === config.publicKey);
      delegateBlocks.forEach(block => {
        blockParser(block)
      });
		} else {
      log.warn(`Failed to get blocks. ${blocks.errorMessage}.`);
    }

	} catch (e) {
		log.error('Error while checking new blocks: ' + e);
	}
}

module.exports = () => {
  getBlocks();
	setInterval(getBlocks, UPDATE_BLOCKS_INTERVAL);
};
