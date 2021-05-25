const jsonminify = require('jsonminify');
const fs = require('fs');
const keys = require('adamant-api/helpers/keys');
const isDev = process.argv.includes('dev');
const { version } = require('../package.json');
const { MIN_PAYOUT } = require('./const');
let config = {};

// Validate config fields
const fields = {
	passPhrase: {
		type: String,
		isRequired: true
	},
	node_ADM: {
		type: Array,
		isRequired: true
	},
	reward_percentage: {
		type: Number,
		default: 80
	},
	minpayout: {
		type: Number,
		default: 10
	},
	port: {
		type: Number,
		default: 36667
	},
	payoutperiod: {
		type: String,
		default: '10d'
	},
	maintenancewallet: {
		type: String,
		default: ''
	},
	considerownvote: {
		type: Boolean,
		default: false
	},
	adamant_notify: {
		type: String,
		default: null
	},
	slack: {
		type: String,
		default: null
	},
	log_level: {
		type: String,
		default: 'log'
	},
	silent_mode: {
		type: Boolean,
		default: false
	}
};

try {

	if (isDev) {
		config = JSON.parse(jsonminify(fs.readFileSync('./config.test', 'utf-8')));
	} else {
		config = JSON.parse(jsonminify(fs.readFileSync('./config.json', 'utf-8')));
	}

	config.version = version;

	if (!config.node_ADM) {
		exit(`Pool's config is wrong. ADM nodes are not set. Cannot start Pool.`);
	}
	if (!config.passPhrase) {
		exit(`Pool's config is wrong. No passPhrase. Cannot start Pool.`);
	}

	let keysPair;
	try {
		keysPair = keys.createKeypairFromPassPhrase(config.passPhrase);
	} catch (e) {
		exit(`Pool's config is wrong. Invalid passPhrase. Error: ${e}. Cannot start Pool.`);
	}
	const address = keys.createAddressFromPublicKey(keysPair.publicKey);
	config.publicKey = keysPair.publicKey.toString('hex');
	config.address = address;

	Object.keys(fields).forEach(f => {
		if (!config[f] && fields[f].isRequired) {
			exit(`Pool's ${address} config is wrong. Field _${f}_ is not valid. Cannot start Pool.`);
		} else if (!config[f] && config[f] !== 0 && fields[f].default) {
			config[f] = fields[f].default;
		}
		if (config[f] && fields[f].type !== config[f].__proto__.constructor) {
			exit(`Pool's ${address} config is wrong. Field type _${f}_ is not valid, expected type is _${fields[f].type.name}_. Cannot start Pool.`);
		}
	});

	if (config.minpayout < MIN_PAYOUT) {
		exit(`Pool's ${address} config is wrong. Parameter minpayout cannot be less, than ${MIN_PAYOUT} (ADM). Cannot start Pool.`);
	}

	config.payoutperiod = config.payoutperiod[0].toUpperCase() + config.payoutperiod.slice(1).toLowerCase();

	console.error(`Pool ${address} successfully read a config-file${isDev ? ' (dev)' : ''}.`);

} catch (e) {
	console.error('Error reading config: ' + e);
}

config.isDev = isDev;
module.exports = config;

function exit(msg) {
	console.error(msg);
	process.exit(-1);
}