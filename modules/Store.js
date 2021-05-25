const api = require('../helpers/api');
const utils = require('../helpers/utils');
const config = require('../helpers/configReader');
const log = require('../helpers/log');
const cron = require('../helpers/cron');
const { UPDATE_DELEGATE_INTERVAL } = require('../helpers/const');

module.exports = {

	isUpdatingVoters: false,

	periodInfo: {
		totalForged: 0,
		userRewards: 0,
		forgedBlocks: 0,
		previousRun: 0,
		nextRun: 0
	},

	delegate: {
		address: config.address,
		publicKey: config.publicKey,
		balance: 0,
		voters: [],
		votesWeight: 0
	},

	async updateStats() {
		try {

			const delegateForgedInfo = await api.get('delegates/forging/getForgedByAccount', { generatorPublicKey: config.publicKey });
			if (delegateForgedInfo.success) {
				this.delegate = Object.assign(this.delegate, delegateForgedInfo.data.delegate);
				this.delegate.forged = +this.delegate.forged;
				this.delegate.rewards = +this.delegate.rewards;
				this.delegate.fees = +this.delegate.fees;
				log.log(`Updated forged info for delegate ${this.delegate.username}: total ${utils.satsToADM(this.delegate.forged)} ADM, block rewards ${utils.satsToADM(this.delegate.rewards)}, fees ${utils.satsToADM(this.delegate.fees)} ADM.`);
			} else {
				log.warn(`Failed to get forged info for delegate for ${config.address}. ${delegateForgedInfo.errorMessage}.`);
			}
			
		} catch (e) {
			log.error(`Error while updating forging and period stats: ` + e);
		}
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
			log.error('Error while updating voters: ' + e);
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
	module.exports.updateStats();

}, UPDATE_DELEGATE_INTERVAL);
