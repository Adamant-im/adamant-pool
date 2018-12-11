const {
	SAT
} = require('./const');
const _ = require('lodash');
const {
	dbTrans,
	dbBlocks,
	dbRewards
} = require('./DB');

module.exports = {
	forged: 0,
	startPeriod: 0,
	refresh: async function () {
		let lastTrans = (await dbTrans.syncFind({})).sort((a, b) => b.timeStamp - a.timeStamp)[0];
		let startPeriod = 0;
		if (lastTrans) startPeriod = lastTrans.timeStamp;
		this.startPeriod = startPeriod;

		const rewardsForPeriod = await dbRewards.syncFind({
			timeStamp: {
				$gte: startPeriod
			}
		});
		const usertotalreward = rewardsForPeriod.reduce((s, r) => {
			return r.reward + s
		}, 0);

		this.rewards = usertotalreward;

		const blocksPeriod = (await dbBlocks.syncFind({
			unixTimestamp: {
				$gte: startPeriod
			}
		})).sort((a, b) => a.unixTimestamp - b.unixTimestamp);
		if (!blocksPeriod.length) {
			this.forged = 0;
			return;
		}
		if (blocksPeriod.length == 1) {
			this.forged = +blocksPeriod[0].totalForged / SAT;
			return;
		}
		const firstBlock = blocksPeriod[0];
		const lastBlock = _.last(blocksPeriod);
		this.forged = (+lastBlock.delegateForged - firstBlock.delegateForged) / SAT + 0.5;

		console.log({
			usertotalreward,
			totalforged: this.forged
		});
	},
	zero() {
		this.forged = 0;
		this.startPeriod = new Date().getTime();
		this.rewards = 0;
	}
}

module.exports.refresh();