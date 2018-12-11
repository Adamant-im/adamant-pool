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
        const delegate = adamant.get('full_account', config.address);
        const poolname = delegate.delegate.username;
        const balance = +delegate.balance;
        const blocks101 = adamant.get('blocks');
        if (!blocks101) return;
        let timeStamp = new Date().getTime();

        const delegateBlocks = blocks101.filter(b => b.generatorId === config.address);
        const lastDelegateBlock = delegateBlocks[delegateBlocks.length - 1];
        if (!lastDelegateBlock) return;

        lastDelegateBlock.delegateForged = delegateForged;
        lastDelegateBlock.unixTimestamp = timeStamp;

        const blockId = lastDelegateBlock.id
        const resSetBlock = await dbBlocks.syncInsert(lastDelegateBlock);
        if (!resSetBlock) log.error(' Set new block');


        const totalweight = +delegate.delegate.votesWeight;
        lastDelegateBlock.totalweight = totalweight;
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
                        return;
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

            } catch (e) {
                log.error(' Reward Voter: ' + e);
            }

        };

        const currentPeriodForged = periodData.forged;
        periodData.rewards += usertotalreward;
        periodData.forged += forged / SAT;

        usertotalreward *= SAT;
        if (forged * config.reward_percentage < usertotalreward) {
            let msg = `Pool ${poolname}: forged * percentage < sum of usertotalreward. Values: forged — ${round(forged)} ADM, percentage — ${config.reward_percentage}%, sum of usertotalreward — ${round(usertotalreward)} ADM.`;
            log.warn(msg);
            notifier(msg, 1);
        }

        if (balance < usertotalreward) {
            let msg = `Pool ${poolname}: userbalance < usertotalreward for user <ID>. Values: userbalance — ${round(balance)} ADM, usertotalreward — ${round(usertotalreward)} ADM.`
            log.warn(msg);
            notifier(msg, 1);
        }
        
        if (currentPeriodForged > balance) {
            let msg = ` Pool ${poolname}: totalforged < balance of delegate.Values: totalforged— ${round(currentPeriodForged)} ADM, balance of delegate— ${round(balance)} ADM.`;
            log.warn(msg);
            notifier(msg, 1);
        }

        let msg = 'Forged: ' + round(forged) + ' User total reward:' + round(usertotalreward);
        log.info(msg);

        return true;
    } catch (e) {
        log.error(' Reward Users: ' + e);
    }

}

function round(num) {
    return Number((num / SAT).toFixed(3));
}