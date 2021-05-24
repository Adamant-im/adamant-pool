const api = require('../helpers/api');
const utils = require('../helpers/utils');
const config = require('../helpers/configReader');
const log = require('../helpers/log');
const { UPDATE_DELEGATE_INTERVAL } = require('../helpers/const');

module.exports = {

	isUpdatingVoters: false,

	periodInfo: {
		totalForged: 0,
		userRewards: 0,
		forgedBlocks: 0
	},

	delegate: {
		address: config.address,
		publicKey: config.publicKey,
		balance: 0,
		voters: [],
		votesWeight: 0
	},

	async updateVotes(voter) {
			const votes = await api.get('accounts/delegates', { address: voter.address });
			if (votes.success) {
				let votesCount = votes.data.delegates.length;
				return votesCount
			} else {
				log.warn(`Failed to get votes for ${voter.address}. ${votes.errorMessage}.`);
			}
	},

	async updateVoters() {
		this.isUpdatingVoters = true;
		try {

			const voters = await api.get('delegates/voters', { publicKey: config.publicKey });
			if (voters.success) {
				this.delegate.voters = voters.data.accounts;
				for (const voter of this.delegate.voters) {
					voter.votesCount = await this.updateVotes(voter)
				}
				log.log(`Updated voters: ${this.delegate.voters.length} accounts`);
			} else {
				log.warn(`Failed to get voters for ${config.address}. ${voters.errorMessage}.`);
			}

		} catch (e) {
			log.error('Error while updating voters:', e);
		}
		this.isUpdatingVoters = false;
	},

	async updateBalance() {
			const account = await api.get('accounts', { publicKey: config.publicKey });
			if (account.success) {
				this.delegate = Object.assign(this.delegate, account.data.account);
				this.delegate.balance = +this.delegate.balance;
				log.log(`Updated balance: ${utils.satsToADM(this.delegate.balance)} ADM`);
			} else {
				log.warn(`Failed to get account data for ${config.address}. ${account.errorMessage}.`);
			}
	},

	async updateDelegate() {
			const delegate = await api.get('delegates/get', { publicKey: config.publicKey });
			if (delegate.success) {
				this.delegate = Object.assign(this.delegate, delegate.data.delegate);
				this.delegate.votesWeight = +this.delegate.votesWeight;
				log.log(`Updated delegate ${this.delegate.username}: rank ${this.delegate.rank}, productivity ${this.delegate.productivity}%, votesWeight ${utils.satsToADM(this.delegate.votesWeight)} ADM`);
				return this.delegate
			} else {
				log.warn(`Failed to get delegate for ${config.address}. ${delegate.errorMessage}.`);
			}
	}

};

setInterval(() => {

	module.exports.updateDelegate();
	module.exports.updateVoters();
	module.exports.updateBalance();

}, UPDATE_DELEGATE_INTERVAL);
