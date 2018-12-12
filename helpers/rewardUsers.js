const {
    SAT
} = require('./const');
const config = require('./configReader');
const adamant = require('./api');
const log = require('./log');
const {
    dbVoters,
    dbBlocks,
    dbRewards
} = require('./DB');
const notifier = require('./slackNotifier');
const periodData = require('./periodData');

module.exports = async (forged, delegateForged) => {
    try {
        const timeStamp = new Date().getTime();
        const delegate = adamant.get('full_account', config.address);
        if (!delegate) return;
        const poolname = delegate.delegate.username;
        const balance = +delegate.balance;
        const totalweight = +delegate.delegate.votesWeight;
        let blockId;

        if (delegateForged) {
            const blocks101 = adamant.get('blocks');
            if (!blocks101) return;

            const delegateBlocks = blocks101.filter(b => b.generatorId === config.address);
            const lastDelegateBlock = delegateBlocks[delegateBlocks.length - 1];
            if (!lastDelegateBlock) return;

            lastDelegateBlock.delegateForged = delegateForged;
            lastDelegateBlock.unixTimestamp = timeStamp;
            lastDelegateBlock.totalweight = totalweight;
            blockId = lastDelegateBlock.id;
            const resSetBlock = await dbBlocks.syncInsert(lastDelegateBlock);
            if (!resSetBlock) log.error(' Set new block');
        }

        const voters = delegate.voters;
        let usertotalreward = 0;

        for (let i = 0; i < voters.length; i++) {
            try {
                const v = voters[i];
                const address = v.address;

                if (address == config.address && !config.considerownvote) continue;
                const userADM = v.balance;
                const userVotesNumber = adamant.get('account_delegates', address).length;

                let voter = await dbVoters.syncFindOne({
                    address
                });

                if (!voter) {
                    log.info('New voter: ' + address);

                    voter = {
                        address: address,
                        pending: 0,
                        received: 0
                    };

                    const resCreateVoter = await dbVoters.syncInsert(voter);

                    if (!resCreateVoter) {
                        log.error(' Failed created voter ' + address);
                        continue;
                    }
                }

                const userWeight = userADM / userVotesNumber;
                const userReward = (userWeight / totalweight) * forged * config.reward_percentage / 100 / SAT;
                usertotalreward += userReward;
                const pending = (voter.pending || 0) + userReward;
                const resUpdatePending = await dbVoters.syncUpdate({
                    address
                }, {
                    $set: {
                        pending,
                        userWeight: userWeight / SAT,
                        userVotesNumber,
                        userADM: userADM / SAT
                    }
                });

                if (!delegateForged) continue;

                if (!resUpdatePending) log.error(" Updated pending " + address);
                const reward = {
                    address,
                    reward: userReward,
                    blockId,
                    timeStamp,
                    userWeight: userWeight / SAT,
                    userADM: userADM / SAT,
                    userVotesNumber
                }

                const resInsertReward = await dbRewards.syncInsert(reward);
                if(!resInsertReward) log.error(' resInsertReward: ');
            } catch (e) {
                log.error(' Reward Voter: ' + e);
            }

        };

        const currentPeriodForged = periodData.forged;
        periodData.rewards += usertotalreward;
        periodData.forged += forged / SAT;

        usertotalreward *= SAT;

        if (forged * config.reward_percentage < usertotalreward) {
            let msg = `Pool ${poolname}: _forged * percentage_ < sum of _usertotalreward_. Values: _forged_ — ${round(forged)} ADM, _percentage_ — ${config.reward_percentage}%, sum of _usertotalreward_ — ${round(usertotalreward)} ADM.`;
            log.warn(msg);
            notifier(msg, 1);
        }

        if (currentPeriodForged > balance) {
            let msg = `Pool ${poolname}: _totalforged_ > _balance of delegate_. Values: _totalforged_ —  ${round(currentPeriodForged)} ADM, _balance of delegate_ — ${round(balance)} ADM.`;
            log.warn(msg);
            notifier(msg, 1);
        }

        let msg = 'Forged: ' + round(forged) + ' User total reward:' + round(usertotalreward);
        if(forged) log.info(msg);

        return true;
    } catch (e) {
        log.error(' Reward Users: ' + e);
    }

}

function round(num) {
    return Number((num / SAT).toFixed(4));
}