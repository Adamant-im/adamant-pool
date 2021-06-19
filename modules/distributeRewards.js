const { SAT, DEVIATION, RETRY_WHEN_UPDATING_VOTERS_TIMEOUT } = require('../helpers/const');
const { dbVoters, dbBlocks } = require('../helpers/DB');
const config = require('../helpers/configReader');
const log = require('../helpers/log');
const notifier = require('../helpers/notify');
const Store = require('./Store');
const utils = require('../helpers/utils');

module.exports = {

  async distributeRewards(block) {

    if (Store.isUpdatingVoters) {
      log.info(`Delegate is updating voters. To distribute rewards on block ${block.id} (height ${block.height}), I'll wait for ${Math.round(RETRY_WHEN_UPDATING_VOTERS_TIMEOUT / 1000)} seconds.`);
      setTimeout(() => {
        module.exports.distributeRewards(block);
        }, RETRY_WHEN_UPDATING_VOTERS_TIMEOUT);
      return;
    }

    let distributedRewardsADM = 0;
    let eligibleVotersCount = 0;
    let distributedVotersCount = 0;
    let distributedPercent = 0;
    let isDistributionComplete = false;

    let voters = Store.delegate.voters;
    let votesWeight = Store.delegate.votesWeight;
    const blockTotalForged = +block.totalForged;

    const onwVote = voters.find(voter => voter.address === config.address);
    if (!config.considerownvote && onwVote) {
      votesWeight -= (+onwVote.balance / onwVote.votesCount);
      voters = voters.filter(voter => voter.address !== config.address);
    }

    for (const voter of voters) {
      try {

        const voterBalance = +voter.balance;
        if (!voter.votesCount || !votesWeight || voterBalance < DEVIATION) continue;
        eligibleVotersCount += 1;

        let pending = 0;
        const savedVoter = await dbVoters.syncFindOne({ address: voter.address });

        if (!savedVoter) {

          const addVoter = await dbVoters.syncInsert({
            address: voter.address,
            pending: 0,
            received: 0
          });

          if (addVoter) {
            log.info(`Successfully added new voter ${voter.address} on block ${block.id} (height ${block.height}).`);
          } else {
            notifier(`Pool ${config.logName}: Failed to add voter ${voter.address} on block ${block.id} (height ${block.height}).`, 'error');
            continue;
          }
    
        } else {
          pending = savedVoter.pending;
        }

        const userWeight = voterBalance / voter.votesCount;
        const userPercent = userWeight / votesWeight * config.reward_percentage * Store.delegate.productivity / 100;
        const userReward = blockTotalForged * userPercent / 100 / SAT;
        pending += userReward;

        const updateVoter = await dbVoters.syncUpdate({ address: voter.address },
          {
            $set: {
              pending,
              userWeight: userWeight / SAT,
              userVotesNumber: voter.votesCount,
              userADM: voterBalance / SAT
            }
          });

        if (updateVoter) {

          log.log(`Voter's rewards successfully updated on block ${block.id} (height ${block.height}): reward for this block ${userReward.toFixed(8)} ADM, ${pending.toFixed(8)} ADM payouts pending for ${voter.address}. userWeight: ${utils.satsToADM(userWeight, 0)} ADM (${userPercent.toFixed(2)}%).`);
          distributedVotersCount += 1;
          distributedRewardsADM += userReward;
          distributedPercent += userPercent;

          // Mark block processed, if any voter gets reward
          const updateBlock = await dbBlocks.syncUpdate({
            id: block.id
            }, {
              $set: {
                processed: true,
                distributedRewardsADM,
                distributedVotersCount,
                distributedPercent
              }
            });
    
          if (updateBlock) {
            isDistributionComplete = true;
            // log.info(`Block ${block.id} (height ${block.height}) rewards successfully updated: ${distributedVotersCount} voters, distributedRewards: ${distributedRewardsADM.toFixed(4)} ADM (${distributedPercent.toFixed(2)}%).`);
          } else {
            continue;
          }

        } else {
          log.error(`Failed to update rewards for ${voter.address} voter on block ${block.id}.`);
          continue;
        }

      } catch (e) {
        log.error(`Error while distributing rewards for ${voter.address} on block ${block.id} (height ${block.height}): ` + e);
        continue;
      }

    } // for (const voter of voters)

    if (isDistributionComplete) {
      if (distributedVotersCount === eligibleVotersCount) {
        log.info(`Block ${block.id} (height ${block.height}) rewards successfully updated — ${distributedVotersCount} of ${eligibleVotersCount} eligible voters, distributedRewards: ${distributedRewardsADM.toFixed(4)} ADM (${distributedPercent.toFixed(2)}%).`);
      } else {
        notifier(`Pool ${config.logName}: Rewards on block ${block.id} (height ${block.height}) distributed partially — ${distributedVotersCount} of ${eligibleVotersCount} eligible voters, distributedRewards: ${distributedRewardsADM.toFixed(4)} of ${utils.satsToADM(blockTotalForged * config.reward_percentage / 100, 4)} ADM.`, 'warn');
      }
    } else {
      notifier(`Pool ${config.logName}: Failed to distribute rewards on block ${block.id} (height ${block.height}). Check logs.`, 'error');
    }

  }

}
