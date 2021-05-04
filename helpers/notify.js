const axios = require('axios');
const config = require('./configReader');
const log = require('./log');
const api = require('./api');
const {
	adamant_notify,
	slack
} = config;


module.exports = (message, type, silent_mode = false) => {

	try {

		log[type](message.replace(/\*/g, '').replace(/_/g, ''));

		if (!silent_mode) {
			
			if (!slack && !adamant_notify) {
				return;
			}
			let color;
			switch (type) {
			case ('error'):
				color = '#FF0000';
				break;
			case ('warn'):
				color = '#FFFF00';
				break;
			case ('info'):
				color = '#00FF00';
				break;
			case ('log'):
				color = '#FFFFFF';
				break;
			}
			// const opts = {
			// 	json: true,
			// 	timeout: 10000,
			// 	body: {
			// 		'attachments': [{
			// 			'fallback': message,
			// 			'color': color,
			// 			'text': message,
			// 			'mrkdwn_in': ['text']
			// 		}]
			// 	}
			// };
			const params = {
				'attachments': [{
					'fallback': message,
					'color': color,
					'text': message,
					'mrkdwn_in': ['text']
				}]
			};

			if (slack && slack.length > 34) {
				axios.post(slack, params)
					.catch(function(error) {
						log.log(`Request to Slack with message ${message} failed. ${error}.`);
					});
			}
			if (adamant_notify && adamant_notify.length > 5 && adamant_notify.startsWith('U') && config.passPhrase && config.passPhrase.length > 30) {
				api.send(config.passPhrase, adamant_notify, `${type}| ${message.replace(/\*/g, '**')}`, 'message');
			}

		}

	} catch (e) {
		log.error('Notifier error: ' + e);
	}

};
