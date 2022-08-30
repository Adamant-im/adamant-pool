import Store from './Store.js';

import {notifier, api, config, log} from '../helpers/index.js';
import {dbVoters, dbTrans} from '../helpers/DB.js';
import {
  SAT,
  RETRY_PAYOUTS_TIMEOUT,
  RETRY_PAYOUTS_COUNT,
  UPDATE_AFTER_PAYMENT_DELAY,
  FEE,
} from '../helpers/const.js';

export const payOut = async (retryNo = 0, previousPeriodInfo) => {
  const nextRetryNo = retryNo + 1;

  let periodInfo = previousPeriodInfo;

  try {
    if (!periodInfo) {
      const {
        totalForgedADM,
        userRewardsADM,
        forgedBlocks,
      } = Store.periodInfo;

      periodInfo = {
        periodTotalForged: totalForgedADM,
        periodUserRewards: userRewardsADM,
        periodForgedBlocks: forgedBlocks,
        donatePaid: false,
        maintenancePaid: false,
      };
    }

    let balance = Store.delegate.balance / SAT;
    const periodTotalForged = periodInfo.periodTotalForged;
    const periodUserRewards = periodInfo.periodUserRewards;
    const periodForgedBlocks = periodInfo.periodForgedBlocks;

    const voters = await dbVoters.find({});
    const votersToReward = voters.filter((voter) => voter.pending >= config.minpayout);
    const votersBelowMin = voters.filter((voter) => voter.pending < config.minpayout);

    const pendingUserRewards = getRewards(votersToReward);
    const belowMinRewards = getRewards(votersBelowMin);

    let infoString = `Pending ${pendingUserRewards.toFixed(4)} ADM rewards for ${votersToReward.length} voters.`;
    infoString += `\n${votersBelowMin.length} voters forged less, than minimum ${config.minpayout} ADM, their pending rewards are ${belowMinRewards.toFixed(4)} ADM.`;
    infoString += `\nThis period the pool forged ${periodTotalForged.toFixed(4)} ADM from ${periodForgedBlocks} blocks; ${periodUserRewards.toFixed(4)} ADM distributed to users.`;
    infoString += `\nThe pool's balance — ${balance.toFixed(4)} ADM.`;

    if (!votersToReward.length) {
      return notifier(`Pool ${config.logName}: No pending payouts.\n${infoString}`, 'warn');
    }

    if (pendingUserRewards > balance) {
      notifier(
          `Pool ${config.logName}: Unable to do payouts, retryNo: ${retryNo}. ` +
        `Balance of the pool is less, than pending payouts. Top up the pool's balance.\n${infoString}`,
          'error',
      );

      return doRetry(nextRetryNo, nextRetryNo * RETRY_PAYOUTS_TIMEOUT, periodInfo);
    }

    notifier(
      retryNo ?
        `Pool ${config.logName}: Re-tying (${nextRetryNo} of ${RETRY_PAYOUTS_COUNT + 1}) to do payouts.` :
        `Pool ${config.logName}: Ready to do periodical payouts.\n${infoString}`,
      'log',
    );

    let payedUserRewards = 0;
    let payedCount = 0;
    let paymentFees = 0;

    let updatedVoters = 0;
    let savedTransactions = 0;

    for (const voter of votersToReward) {
      try {
        const res = await rewardVoter(voter);

        payedUserRewards += res.amount;
        paymentFees += FEE;
        payedCount += 1;

        if (res.isUpdated) {
          updatedVoters += 1;
        }

        if (res.isTransactionSaved) {
          savedTransactions += 1;
        }
      } catch (error) {
        log.error(`Error while doing payouts for ${voter.address}: ${error}`);
      }
    }

    // If we paid to all voters successfully, we can pay donation and maintenance
    const donateADM = config.donate_percentage * periodTotalForged / 100;
    const maintenanceADM = periodTotalForged - periodUserRewards - donateADM;

    let donateString = '';
    let maintenanceString = '';

    if (payedCount === votersToReward.length) {
      if (config.maintenancewallet) {
        if (!periodInfo.maintenancePaid) {
          if (maintenanceADM - FEE > 0) {
            log.log(
                `Processing payment of ${maintenanceADM.toFixed(8)} ADM (${config.poolsShare.toFixed(2)}%) pool's share to ` +
              `maintenance wallet ${config.maintenancewallet}…`,
            );

            const paymentMaintenance = await api.sendTokens(config.passPhrase, config.maintenancewallet, maintenanceADM - FEE);

            if (paymentMaintenance.success) {
              periodInfo.maintenancePaid = true;
              log.log(`Successfully payed ${maintenanceADM.toFixed(8)} ADM (${config.poolsShare.toFixed(2)}%) pool's share to maintenance wallet ${config.maintenancewallet} with Tx ${paymentMaintenance.data.transactionId}.`);
              maintenanceString = `\nSent ${maintenanceADM.toFixed(4)} ADM (${config.poolsShare.toFixed(2)}%) pool's share to maintenance wallet ${config.maintenancewallet}.`;
            } else {
              maintenanceString = `\nUnable to send ${maintenanceADM.toFixed(4)} ADM (${config.poolsShare.toFixed(2)}%) pool's share to maintenance wallet ${config.maintenancewallet}, do it manually. ${paymentMaintenance.errorMessage}.`;
            }
          } else {
            maintenanceString = `\nPool's share ${maintenanceADM.toFixed(4)} ADM (${config.poolsShare.toFixed(2)}%) is less, than Tx fee.`;
          }
        }
      } else {
        if (maintenanceADM > 0) {
          maintenanceString = `\nMaintenance wallet is not set. Leaving pool's share of ${maintenanceADM.toFixed(4)} ADM (${config.poolsShare.toFixed(2)}%) on the pool's wallet ${config.address}.`;
        } else {
          maintenanceString = `\nMaintenance wallet is not set; Pool's share ${maintenanceADM.toFixed(4)} ADM (${config.poolsShare.toFixed(2)}%) is less, than Tx fee.`;
        }
      }

      if (config.donatewallet && config.donate_percentage) {
        if (!periodInfo.donatePaid) {
          if (donateADM - FEE > 0) {
            log.log(`Processing payment of ${donateADM.toFixed(8)} ADM (${config.donate_percentage.toFixed(2)}%) donation to ${config.donatewallet}…`);

            const paymentDonate = await api.sendTokens(config.passPhrase, config.donatewallet, donateADM - FEE);
            if (paymentDonate.success) {
              periodInfo.danatePaid = true;
              log.log(`Successfully payed ${donateADM.toFixed(8)} ADM (${config.donate_percentage.toFixed(2)}%) donation to ${config.donatewallet} with Tx ${paymentDonate.data.transactionId}.`);
              donateString = `\nSent ${donateADM.toFixed(4)} ADM (${config.donate_percentage.toFixed(2)}%) donation to ${config.donatewallet}.`;
            } else {
              donateString = `\nUnable to send ${donateADM.toFixed(4)} ADM (${config.donate_percentage.toFixed(2)}%) donation to ${config.donatewallet}, do it manually. ${paymentDonate.errorMessage}.`;
            }
          } else {
            donateString = `\nDonation amount ${donateADM.toFixed(4)} ADM (${config.donate_percentage.toFixed(2)}%) is less, than Tx fee.`;
          }
        }
      }
    }

    // Wait to update pool's balance and notify
    setTimeout(async () => {
      try {
        await Store.updateBalance();
        balance = Store.delegate.balance / SAT;

        let payoutInfo = '';
        let notifyType = '';

        if (payedCount === votersToReward.length) {
          if (updatedVoters === payedCount && savedTransactions === payedCount) {
            payoutInfo = `I've successfully payed and saved all of ${payedCount} payouts, ${payedUserRewards.toFixed(4)} ADM plus ${paymentFees.toFixed(1)} ADM fees in total.`;
            payoutInfo += maintenanceString;
            payoutInfo += donateString;
            notifyType = 'info';
          } else {
            payoutInfo = `I've successfully payed of ${payedCount} payouts, ${payedUserRewards.toFixed(4)} ADM plus ${paymentFees.toFixed(1)} ADM fees in total.`;
            payoutInfo += maintenanceString;
            payoutInfo += donateString;
            payoutInfo += `\nThere is an issue.`;
            if (updatedVoters < payedCount) {
              payoutInfo += ` I've updated only ${updatedVoters} voters.`;
            }
            if (savedTransactions < payedCount) {
              payoutInfo += ` I've saved only ${savedTransactions} transactions.`;
            }
            payoutInfo += ` You better do these updates in database manually. Check log file for details.`;
            notifyType = 'warn';
          }

          payoutInfo += `\nThe pool's balance — ${balance.toFixed(4)} ADM.`;
          notifier(`Pool ${config.logName}: ${payoutInfo}`, notifyType);
        } else {
          if (updatedVoters === payedCount && savedTransactions === payedCount) {
            payoutInfo = `I've payed and saved only ${payedCount} of ${votersToReward.length} payouts, ${(payedUserRewards + paymentFees).toFixed(4)} of ${pendingUserRewards.toFixed(4)} ADM.`;
            notifyType = 'log';
          } else {
            payoutInfo = `I've payed only ${payedCount} of ${votersToReward.length} payouts, ${(payedUserRewards + paymentFees).toFixed(4)} of ${pendingUserRewards.toFixed(4)} ADM.`;
            payoutInfo += `\nThere is an issue with database also.`;
            if (updatedVoters < payedCount) {
              payoutInfo += ` I've updated only ${updatedVoters} voters.`;
            }
            if (savedTransactions < payedCount) {
              payoutInfo += ` I've saved only ${savedTransactions} transactions.`;
            }
            payoutInfo += ` You better do these updates in database manually. Check log file for details.`;
            notifyType = 'warn';
          }

          payoutInfo += `\nThe pool's balance — ${balance.toFixed(4)} ADM.`;
          payoutInfo += `\nI'll re-try to pay the remaining voters in ${((nextRetryNo * RETRY_PAYOUTS_TIMEOUT) / 1000 / 60).toFixed(1)} minutes, retryNo: ${nextRetryNo}.`;
          notifier(`Pool ${config.logName}: ${payoutInfo}`, notifyType);
          doRetry(nextRetryNo, nextRetryNo * RETRY_PAYOUTS_TIMEOUT, periodInfo);
        }
      } catch (error) {
        log.error(`Error in composing notification message for payOut(): ${error}`);
      }
    }, UPDATE_AFTER_PAYMENT_DELAY);
  } catch (error) {
    log.error(`Error in payOut(), retryNo: ${retryNo}. ${error}`);
    doRetry(nextRetryNo, nextRetryNo * RETRY_PAYOUTS_TIMEOUT, periodInfo);
  }
};

async function rewardVoter(voter) {
  let {pending, address, received} = voter;
  const amount = voter.pending - FEE;

  const result = {amount};

  log.log(`Processing payment of ${amount.toFixed(8)} ADM reward to ${address}…`);

  const payment = await api.sendTokens(config.passPhrase, address, amount);

  if (!payment.success) {
    return log.warn(
        `Failed to process payment of ${amount} ADM reward to ${address}. ${payment.errorMessage}.`,
    );
  }

  log.log(`Successfully payed ${amount.toFixed(8)} ADM reward to ${address} with Tx ${payment.data.transactionId}.`);

  received += pending;

  const transaction = {
    ...payment.data,
    address,
    received, // user received in total, including fees
    payoutcount: pending, // user received this time, including Tx fee
    timeStamp: new Date().getTime(),
  };
  delete transaction.success;

  const updateVoter = await dbVoters.update({address}, {
    received, pending: 0,
  });

  if (updateVoter) {
    log.log(
        `Voter's rewards successfully updated after payout: ${received.toFixed(8)} ADM received in total, ` +
      `0 ADM pending for ${address}.`,
    );
    result.isUpdated = true;
  } else {
    log.error(
        `Failed to update rewards for ${address} after successful payout. ` +
      `Do it manually: ${received.toFixed(8)} ADM received in total, 0 ADM pending.`,
    );
  }

  const insertTransaction = await dbTrans.insert(transaction);

  if (insertTransaction) {
    log.log(
        `Successfully saved transaction ${transaction.transactionId} ` +
      `after payout: ${pending.toFixed(8)} ADM payed to ${address}.`,
    );
    result.isTransactionSaved = true;
  } else {
    log.error(
        `Failed to save transaction ${transaction.transactionId} after successful payout. ` +
      `Do it manually: ${pending.toFixed(8)} ADM payed to ${address}.`,
    );
  }

  return result;
}

function doRetry(retry, timeout, periodInfo) {
  if (retry > RETRY_PAYOUTS_COUNT) {
    setTimeout(() => {
      notifier(
          `Pool ${config.logName}: After ${RETRY_PAYOUTS_COUNT + 1} tries, ` +
        'I didn\'t finished with payouts. Check the log file.',
          'error',
      );
    }, 1000);
  } else {
    log.log(`Re-trying payouts ${retry} time in ${timeout / 1000} seconds.`);

    setTimeout(() => {
      module.exports.payOut(retry, periodInfo);
    }, timeout);
  }
}

function getRewards(voters) {
  return voters.reduce((sum, voter) => sum + voter.pending, 0);
}
