const cron = require('cron');
const config = require('./configReader');
const payOut = require('../modules/payOut');
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
	case 'Mon':
	case 'Tue':
	case 'Wed':
	case 'Thu':
	case 'Fri':
	case 'Sat':
	case 'Sun':
		pattern = `0 0 * * ${config.payoutperiod}`;
		break;
	default:
		exit();
		
}

let payoutCronJob;
try {
	payoutCronJob = new cron.CronJob(pattern, function() {
		payOut();
	});
	payoutCronJob.start();	
} catch (e) {
	exit(e);
}

function exit (additionalInfo) {
	log.error(`Pool's ${config.address} config is wrong. Failed to validate payoutperiod: ${config.payoutperiod}${additionalInfo ? ', ' + additionalInfo : ''}. Cannot start Pool.`);		
	process.exit(-1);
}

module.exports = payoutCronJob;
