const request = require('request');
const url='https://hooks.slack.com/services/';

module.exports=(message, error)=>{
	var color = '#36a64f';
	if (error)
	color = '#FF0000';
	if (error == 'yellow')
	color = '#FFFF00';
	if (error == 'green')
	color = '#00FF00';
	if (error == 'white')
	color = '#FFFFFF';
	var opts = {
		uri:url,
		method: 'POST',
		json: true,
		body: {
			'attachments': [{
				'fallback': message,
				'color': color,
				'text': message,
				'mrkdwn_in': ['text']
			}]
		}
		
	};
	request(opts)
}
