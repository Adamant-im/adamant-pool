const {SAT} = require('./const');
const config = require('./configReader');
const api = require('./api');
const log = require('./log');
const {dbVoters, dbBlocks, dbRewards} = require('./DB');
const notifier = require('./slackNotifier');
const periodData = require('./periodData');
const Store = require('../modules/Store');

module.exports = async (forged, delegateForged) => {
    try {
        const timeStamp = new Date().getTime();
        const {poolname} = Store;
        const {voters, balance, votesWeight, address} = Store.delegate;
        console.log({balance, votesWeight, address});
        let blockId;

        if (delegateForged) {
            const blocks101 = await api.get('blocks');
            if (!blocks101) {
                return;
            }

            const delegateBlocks = blocks101.filter(b => b.generatorId === address);
            const lastDelegateBlock = delegateBlocks[delegateBlocks.length - 1];
            if (!lastDelegateBlock) {
                return;
            }

            lastDelegateBlock.delegateForged = delegateForged;
            lastDelegateBlock.unixTimestamp = timeStamp;
            lastDelegateBlock.votesWeight = votesWeight;
            blockId = lastDelegateBlock.id;
            const resSetBlock = await dbBlocks.syncInsert(lastDelegateBlock);
            if (!resSetBlock) {
                log.error(' Set new block');
            }
        }
        let usertotalreward = 0;

        for (let i = 0; i < voters.length; i++) {
            try {
                const v = voters[i];
                const address = v.address;

                if (address === Store.delegate.address && !config.considerownvote) {
                    continue;
                }
                const userADM = v.balance;
                const userVotesNumber = (await api.get('account_delegates', address)).length;

                let voter = await dbVoters.syncFindOne({address});

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
                const userReward = (userWeight / votesWeight) * forged * config.reward_percentage / 100 / SAT;
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

                if (!delegateForged) {
                    continue;
                }

                if (!resUpdatePending) {
                    log.error(" Updated pending " + address);
                }
                const reward = {
                    address,
                    reward: userReward,
                    blockId,
                    timeStamp,
                    userWeight: userWeight / SAT,
                    userADM: userADM / SAT,
                    userVotesNumber
                };

                const resInsertReward = await dbRewards.syncInsert(reward);
                if (!resInsertReward) {
                    log.error(' resInsertReward: ');
                }
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
            notifier(msg, 'error');
        }

        if (currentPeriodForged > balance) {
            let msg = `Pool ${poolname}: _totalforged_ > _balance of delegate_. Values: _totalforged_ —  ${round(currentPeriodForged)} ADM, _balance of delegate_ — ${round(balance)} ADM.`;
            log.warn(msg);
            notifier(msg, 'error');
        }

        let msg = 'Forged: ' + round(forged) + ' User total reward:' + round(usertotalreward);
        if (forged) {
            log.info(msg);
        }

        return true;
    } catch (e) {
        log.error(' Reward Users: ' + e);
    }

};

function round (num) {
    return Number((num / SAT).toFixed(4));
}