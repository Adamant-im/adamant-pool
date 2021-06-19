const api = require('../helpers/api');
const utils = require('../helpers/utils');
const config = require('../helpers/configReader');
const log = require('../helpers/log');
const { dbVoters, dbTrans, dbBlocks } = require('../helpers/DB');
const { UPDATE_DELEGATE_INTERVAL, FORMAT_PAYOUT } = require('../helpers/const');

module.exports = {

	isUpdatingVoters: false,
	isDistributingRewards: false,

	periodInfo: {
		totalForgedSats: 0,
		totalForgedADM: 0,
		userRewardsADM: 0,
		forgedBlocks: 0,
		previousRunTimestamp: 0,
		previousRunEpochtime: 0,
		nextRunMoment: {},
		nextRunTimestamp: 0,
		nextRunDateString: ''
	},

	delegate: {
		address: config.address,
		publicKey: config.publicKey,
		balance: 0,
		voters: [],
		votesWeight: 0,
		forged: 0,
		rewards: 0,
		fees: 0,
		pendingRewardsADM: 0
	},

	async updateStats() {
		try {

			const delegateForgedInfo = await api.get('delegates/forging/getForgedByAccount', { generatorPublicKey: config.publicKey });
			if (delegateForgedInfo.success) {
				this.delegate.forged = +delegateForgedInfo.data.forged;
				this.delegate.rewards = +delegateForgedInfo.data.rewards;
				this.delegate.fees = +delegateForgedInfo.data.fees;
				log.log(`Updated forged info for delegate ${this.delegate.username}: total ${utils.satsToADM(this.delegate.forged)} ADM, block rewards ${utils.satsToADM(this.delegate.rewards)} ADM, fees ${utils.satsToADM(this.delegate.fees)} ADM.`);
			} else {
				log.warn(`Failed to get forged info for delegate for ${config.address}. ${delegateForgedInfo.errorMessage}.`);
			}

			const cron = require('../helpers/cron').payoutCronJob;
			this.periodInfo.nextRunMoment = cron.nextDate();
			this.periodInfo.nextRunTimestamp = this.periodInfo.nextRunMoment.valueOf();
			this.periodInfo.nextRunDateString = this.periodInfo.nextRunMoment.format(FORMAT_PAYOUT);

			// Assume previous run is the last saved transaction
			const lastTransaction = (await dbTrans.syncFind({})).sort((a, b) => b.timeStamp - a.timeStamp)[0];
			if (lastTransaction) {
				this.periodInfo.previousRunTimestamp = lastTransaction.timeStamp;
				this.periodInfo.previousRunEpochtime = utils.epochTime(this.periodInfo.previousRunTimestamp);
			}

			const periodBlocks = (await dbBlocks.syncFind({
				timestamp: {
						$gte: this.periodInfo.previousRunEpochtime
				}
			}));

			if (periodBlocks) {
				this.periodInfo.forgedBlocks = periodBlocks.length;
				this.periodInfo.totalForgedSats = periodBlocks.reduce((sum, block) => { return sum + +block.totalForged; }, 0);
				this.periodInfo.totalForgedADM = utils.satsToADM(this.periodInfo.totalForgedSats)
				this.periodInfo.userRewardsADM = periodBlocks.reduce((sum, block) => { return sum + (block.distributedRewardsADM ? +block.distributedRewardsADM : 0); }, 0);
			}

			const voters = await dbVoters.syncFind({});
      this.delegate.pendingRewardsADM = voters.reduce((sum, voter) => { return sum + voter.pending; }, 0);

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
