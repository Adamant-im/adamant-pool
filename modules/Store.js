const api = require('../helpers/api');
const utils = require('../helpers/utils');
const config = require('../helpers/configReader');
const log = require('../helpers/log');
const { UPDATE_DELEGATE_INTERVAL } = require('../helpers/const');

module.exports = {

	delegate: {
		address: config.address,
		publicKey: config.publicKey,
		balance: 0,
		voters: [],
		votesWeight: 0
	},

	async updateVoters() {
		try {

			const voters = await api.get('delegates/voters', { publicKey: config.publicKey });
			if (voters.success) {
				if (voters.result.success) {
					this.delegate.voters = voters.result.accounts;
					log.log(`Updated voters: ${this.delegate.voters.length} accounts`);
				} else {
					log.warn(`Unable to get voters for ${config.address}. Node's reply: ${voters.result.error}.`);
				}
			} else {
				log.warn(`Failed to get voters for ${config.address}, ${voters.error}. Message: ${voters.message}.`);
			}

		} catch (e) {
			log.error('Error while updating voters:', e);
		}
	},

	async updateBalance() {
		try {

			const account = await api.get('accounts', { publicKey: config.publicKey });
			if (account.success) {
				if (account.result.success) {
					this.delegate = Object.assign(this.delegate, account.result.account);
					this.delegate.balance = +this.delegate.balance;
					log.log(`Updated balance: ${utils.satsToADM(this.delegate.balance)} ADM`);
				} else {
					log.warn(`Unable to get account data for ${config.address}. Node's reply: ${account.result.error}.`);
				}
			} else {
				log.warn(`Failed to get account data for ${config.address}, ${account.error}. Message: ${account.message}.`);
			}

		} catch (e) {
			log.error('Error while updating account info:', e);
		}
	},

	async updateDelegate() {
		try {

			const delegate = await api.get('delegates/get', { publicKey: config.publicKey });
			if (delegate.success) {
				if (delegate.result.success) {
					this.delegate = Object.assign(this.delegate, delegate.result.delegate);
					this.delegate.votesWeight = +this.delegate.votesWeight;
					log.log(`Updated delegate ${this.delegate.username}: rank ${this.delegate.rank}, productivity ${this.delegate.productivity}%, votesWeight ${utils.satsToADM(this.delegate.votesWeight)} ADM`);
					return this.delegate
				} else {
					log.warn(`Unable to get delegate for ${config.address}. Node's reply: ${delegate.result.error}.`);
				}
			} else {
				log.warn(`Failed to get delegate for ${config.address}, ${delegate.error}. Message: ${delegate.message}.`);
			}

		} catch (e) {
			log.error('Error while updating delegate info:', e);
		}
	}

};

setInterval(() => {

	module.exports.updateDelegate();
	module.exports.updateVoters();
	module.exports.updateBalance();

}, UPDATE_DELEGATE_INTERVAL);
