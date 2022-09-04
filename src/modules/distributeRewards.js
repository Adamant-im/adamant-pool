import Store from './Store.js';

import {dbVoters, dbBlocks} from '../helpers/DB.js';
import {notifier, config, utils, log} from '../helpers/index.js';
import {
  SAT,
  DEVIATION,
  RETRY_WHEN_UPDATING_VOTERS_TIMEOUT,
} from '../helpers/const.js';

export const distributeRewards = async (block) => {
  if (Store.isUpdatingVoters || Store.isDistributingRewards) {
    const intervalInSeconds = Math.round(RETRY_WHEN_UPDATING_VOTERS_TIMEOUT / 1000);

    log.info(
        'Delegate is updating voters or distributing rewards for another block. ' +
      `To distribute rewards on block ${block.id} (height ${block.height}), ` +
      `I'll wait for ${intervalInSeconds} seconds.`,
    );

    setTimeout(() => {
      module.exports.distributeRewards(block);
    }, RETRY_WHEN_UPDATING_VOTERS_TIMEOUT);

    return;
  }

  Store.isDistributingRewards = true;

  try {
    let distributedRewardsADM = 0;
    let distributedVotersCount = 0;
    let distributedPercent = 0;
    let isDistributionComplete = false;

    let eligibleVotersCount = 0;
    let voters = Store.delegate.voters;
    let votesWeight = Store.delegate.votesWeight;

    const blockTotalForged = +block.totalForged;

    const ownVote = voters.find((voter) => voter.address === config.address);

    if (!config.considerownvote && ownVote) {
      votesWeight -= (+ownVote.balance / ownVote.votesCount);
      voters = voters.filter((voter) => voter.address !== config.address);
    }

    for (const voter of voters) {
      try {
        const voterBalance = +voter.balance;

        if (!voter.votesCount || !votesWeight || voterBalance < DEVIATION) {
          continue;
        }

        eligibleVotersCount += 1;

        let pending = 0;

        const savedVoter = await dbVoters.findOne({address: voter.address});

        if (!savedVoter) {
          const addVoter = await dbVoters.insert({
            address: voter.address,
            pending: 0,
            received: 0,
          });

          if (addVoter) {
            log.info(
                `Successfully added new voter ${voter.address} on block ${block.id} (height ${block.height}).`,
            );
          } else {
            notifier(
                `Pool ${config.logName}: Failed to add voter ${voter.address} on block ${block.id} (height ${block.height}).`,
                'error',
            );
            continue;
          }
        } else {
          pending = savedVoter.pending;
        }

        const userWeight = voterBalance / voter.votesCount;
        const userPercent = ((userWeight / votesWeight) * config.reward_percentage * Store.delegate.productivity) / 100;
        const userReward = (blockTotalForged * userPercent) / (SAT * 100);

        pending += userReward;

        const updateVoter = await dbVoters.update(
            {address: voter.address},
            {
              pending,
              userWeight: userWeight / SAT,
              userVotesNumber: voter.votesCount,
              userADM: voterBalance / SAT,
            });

        if (updateVoter) {
          const userWeightInADM = utils.satsToADM(userWeight, 0);

          log.log(
              `Voter's rewards successfully updated on block ${block.id} (height ${block.height}): ` +
            `reward for this block ${userReward.toFixed(8)} ADM, ${pending.toFixed(8)} ADM payouts pending for ` +
            `${voter.address}. userWeight: ${userWeightInADM} ADM (${userPercent.toFixed(2)}%).`,
          );

          distributedVotersCount += 1;
          distributedRewardsADM += userReward;
          distributedPercent += userPercent;

          // Mark block processed, if any voter gets reward
          const updateBlock = await dbBlocks.update(
              {id: block.id},
              {
                processed: true,
                distributedRewardsADM,
                distributedVotersCount,
                distributedPercent,
              });

          if (updateBlock) {
            isDistributionComplete = true;
          }
        } else {
          log.error(`Failed to update rewards for ${voter.address} voter on block ${block.id}.`);
        }
      } catch (error) {
        log.error(
            `Error while distributing rewards for ${voter.address} on block ${block.id} (height ${block.height}): ${error}`,
        );
      }
    }

    if (isDistributionComplete) {
      if (distributedVotersCount === eligibleVotersCount) {
        log.info(
            `Block ${block.id} (height ${block.height}) rewards successfully updated — ` +
          `${distributedVotersCount} of ${eligibleVotersCount} eligible voters, ` +
          `distributedRewards: ${distributedRewardsADM.toFixed(4)} ADM (${distributedPercent.toFixed(2)}%).`,
        );
      } else {
        const blockTotalForgedInADM = utils.satsToADM(blockTotalForged * config.reward_percentage / 100, 4);

        notifier(
            `Pool ${config.logName}: Rewards on block ${block.id} (height ${block.height}) ` +
          `distributed partially — ${distributedVotersCount} of ${eligibleVotersCount} eligible voters, ` +
          `distributedRewards: ${distributedRewardsADM.toFixed(4)} of ${blockTotalForgedInADM} ADM.`,
            'warn',
        );
      }
    } else {
      notifier(
          `Pool ${config.logName}: Failed to distribute rewards on block ${block.id} (height ${block.height}). Check logs.`,
          'error',
      );
    }
  } catch (error) {
    log.error(`Error in distributeRewards() on block ${block.id} (height ${block.height}): ${error}`);
  }

  Store.isDistributingRewards = false;
};
