const cron = require('node-cron');
const config = require('./configReader');
const payOut = require('./payOut');
const log = require('./log');

let pattern;

// sec(optional) min(0-59) hours(0-23) d_mon(1-31) mon(1-12/names) d_week(0-7/names)
switch (config.payoutperiod) {

	case '1d':
		pattern = '0 0 1-31 * *';
		break;
	case '5d':
		pattern = '0 0 1,5,10,15,20,25 * *';
		break;
	case '10d':
		pattern = '0 0 1,10,20 * *';
		break;
	case ('15d'):
		pattern = '0 0 1,15 * *';
		break;
	case '30d':
		pattern = '0 0 1 * *';
		break;
	case 'Monday':
	case 'Tuesday':
	case 'Wednesday':
	case 'Thursday':
	case 'Friday':
	case 'Saturday':
	case 'Sunday':
		pattern = `0 0 * * ${config.payoutperiod}`;
		break;
	default:
		exit();
}

if (!cron.validate(pattern))
	exit();

cron.schedule(pattern, () => {
	payOut();
});

function exit () {
	log.error(`Pool's ${config.address} config is wrong. Failed to validate payoutperiod: ${config.payoutperiod}. Cannot start Pool.`);		
	process.exit(-1);
}