const syncNedb = require('./syncNedb');
const Datastore = require('nedb');

module.exports = {

	dbTrans: syncNedb(new Datastore({
		filename: 'db/transactions',
		autoload: true
	})),

	dbRewards: syncNedb(new Datastore({
		filename: 'db/rewards',
		autoload: true
	})),

	dbBlocks: syncNedb(new Datastore({
		filename: 'db/blocks',
		autoload: true
	})),

	dbVoters: syncNedb(new Datastore({
		filename: 'db/voters',
		autoload: true
	}), 60 * 1000 * 60),

}
