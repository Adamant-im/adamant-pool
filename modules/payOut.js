const { SAT, RETRY_PAYOUTS_TIMEOUT, RETRY_PAYOUTS_COUNT, UPDATE_AFTER_PAYMENT_DELAY, FEE } = require('../helpers/const');
const { dbVoters, dbTrans } = require('../helpers/DB');
const log = require('../helpers/log');
const api = require('../helpers/api');
const config = require('../helpers/configReader');
const notifier = require('../helpers/notify');
const Store = require('./Store');

module.exports = {

  async payOut(retryNo = 0, periodInfo) {

    function doRetry(retry, timeout, periodInfo) {
      if (retry > RETRY_PAYOUTS_COUNT) {
        setTimeout(() => {
          notifier(`Pool ${config.logName}: After ${RETRY_PAYOUTS_COUNT+1} tries, I didn't finished with payouts. Check the log file.`, 'error')
        }, 1000);
      } else {
        log.log(`Re-trying payouts ${retry} time in ${timeout / 1000} seconds.`)
        setTimeout(() => {
          module.exports.payOut(retry, periodInfo);
          }, timeout);
      }
    }

    try {

      let balance = Store.delegate.balance / SAT;
      let periodTotalForged, periodUserRewards, periodForgedBlocks;
      if (!periodInfo) {
        periodInfo = {};
        periodInfo.periodTotalForged = Store.periodInfo.totalForgedADM;
        periodInfo.periodUserRewards = Store.periodInfo.userRewardsADM;
        periodInfo.periodForgedBlocks = Store.periodInfo.forgedBlocks;
        periodInfo.maintenancePaid = false;
        periodInfo.donatePaid = false;
      }
      periodTotalForged = periodInfo.periodTotalForged;
      periodUserRewards = periodInfo.periodUserRewards;
      periodForgedBlocks = periodInfo.periodForgedBlocks;
      
      const voters = await dbVoters.syncFind({});
      const votersToReward = voters.filter((voter) => voter.pending >= config.minpayout);
      const votersBelowMin = voters.filter((voter) => voter.pending < config.minpayout);

      const pendingUserRewards = votersToReward.reduce((sum, voter) => { return sum + voter.pending; }, 0);
      const belowMinRewards = votersBelowMin.reduce((sum, voter) => { return sum + voter.pending; }, 0);

      let infoString = `Pending ${pendingUserRewards.toFixed(4)} ADM rewards for ${votersToReward.length} voters.`;
      infoString += `\n${votersBelowMin.length} voters forged less, than minimum ${config.minpayout} ADM, their pending rewards are ${belowMinRewards.toFixed(4)} ADM.`;
      infoString += `\nThis period the pool forged ${periodTotalForged.toFixed(4)} ADM from ${periodForgedBlocks} blocks; ${periodUserRewards.toFixed(4)} ADM distributed to users.`;
      infoString += `\nThe pool's balance — ${balance.toFixed(4)} ADM.`;

      if (!votersToReward.length) {
        notifier(`Pool ${config.logName}: No pending payouts.\n${infoString}`, 'warn');
        return;
      }

      if (pendingUserRewards > balance) {
        notifier(`Pool ${config.logName}: Unable to do payouts, retryNo: ${retryNo}. Balance of the pool is less, than pending payouts. Top up the pool's balance.\n${infoString}`, 'error');
        doRetry(retryNo+1, (retryNo+1) * RETRY_PAYOUTS_TIMEOUT, periodInfo);
        return;
      }

      if (retryNo) {
        notifier(`Pool ${config.logName}: Re-tying (${retryNo+1} of ${RETRY_PAYOUTS_COUNT+1}) to do payouts.`, 'log');
      } else {
        notifier(`Pool ${config.logName}: Ready to do periodical payouts.\n${infoString}`, 'log');
      }

      let payedUserRewards = 0;
      let payedCount = 0;
      let paymentFees = 0;

      let updatedVoters = 0;
      let savedTransactions = 0;

      for (const voter of votersToReward) {
        try {

          let pending = voter.pending;
          let amount = voter.pending - FEE;
          let address = voter.address;
          let received = voter.received;

          log.log(`Processing payment of ${amount.toFixed(8)} ADM reward to ${address}…`);

          let payment = await api.sendTokens(config.passPhrase, address, amount);
          if (payment.success) {
            payedUserRewards += amount;
            paymentFees += FEE;
            payedCount += 1;
            log.log(`Successfully payed ${amount.toFixed(8)} ADM reward to ${address} with Tx ${payment.data.transactionId}.`);

            let transaction = payment.data;
            delete transaction.success;

            received += pending;
            transaction.timeStamp = new Date().getTime();
            transaction.address = address;
            transaction.payoutcount = pending; // user received this time, including Tx fee
            transaction.received = received; // user received in total, including fees

            let updateVoter = await dbVoters.syncUpdate({ address }, {
              $set: {pending: 0, received}
            });
            if (updateVoter) {
              log.log(`Voter's rewards successfully updated after payout: ${received.toFixed(8)} ADM received in total, 0 ADM pending for ${address}.`);
              updatedVoters += 1;
            } else {
              log.error(`Failed to update rewards for ${address} after successful payout. Do it manually: ${received.toFixed(8)} ADM received in total, 0 ADM pending.`);
            }

            let insertTransaction = await dbTrans.syncInsert(transaction);
            if (insertTransaction) {
              log.log(`Successfully saved transaction ${transaction.transactionId} after payout: ${pending.toFixed(8)} ADM payed to ${address}.`);      
              savedTransactions += 1;
            } else {
              log.error(`Failed to save transaction ${transaction.transactionId} after successful payout. Do it manually: ${pending.toFixed(8)} ADM payed to ${address}.`);
            }
          } else {
            log.warn(`Failed to process payment of ${amount} ADM reward to ${address}. ${payment.errorMessage}.`);
          }

        } catch (e) {
          log.error(`Error while doing payouts for ${address}: ` + e);
          continue;
        }

      } // for (const voter of votersToReward)

      // If we paid to all voters successfully, we can pay donation and maintenance
      const donateADM = config.donate_percentage * periodTotalForged / 100;
      let donateString = '';
      const maintenanceADM = periodTotalForged - periodUserRewards - donateADM;
      let maintenanceString = '';
      if (payedCount === votersToReward.length) {

        if (config.maintenancewallet) {
          if (!periodInfo.maintenancePaid) {
            if (maintenanceADM - FEE > 0) {

              log.log(`Processing payment of ${maintenanceADM.toFixed(8)} ADM (${config.poolsShare.toFixed(2)}%) pool's share to maintenance wallet ${config.maintenancewallet}…`);

              let paymentMaintenance = await api.sendTokens(config.passPhrase, config.maintenancewallet, maintenanceADM - FEE);
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

              let paymentDonate = await api.sendTokens(config.passPhrase, config.donatewallet, donateADM - FEE);
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
              payoutInfo += `\nThere is an issue.`
              if (updatedVoters < payedCount) {
                payoutInfo += ` I've updated only ${updatedVoters} voters.`
              } 
              if (savedTransactions < payedCount) {
                payoutInfo += ` I've saved only ${savedTransactions} transactions.`
              }
              payoutInfo += ` You better do these updates in database manually. Check log file for details.`
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
              payoutInfo += `\nThere is an issue with database also.`
              if (updatedVoters < payedCount) {
                payoutInfo += ` I've updated only ${updatedVoters} voters.`
              } 
              if (savedTransactions < payedCount) {
                payoutInfo += ` I've saved only ${savedTransactions} transactions.`
              }
              payoutInfo += ` You better do these updates in database manually. Check log file for details.`
              notifyType = 'warn';
            }
    
            payoutInfo += `\nThe pool's balance — ${balance.toFixed(4)} ADM.`;
            payoutInfo += `\nI'll re-try to pay the remaining voters in ${(((retryNo+1) * RETRY_PAYOUTS_TIMEOUT) / 1000 / 60).toFixed(1)} minutes, retryNo: ${retryNo+1}.`;
            notifier(`Pool ${config.logName}: ${payoutInfo}`, notifyType);
            doRetry(retryNo+1, (retryNo+1) * RETRY_PAYOUTS_TIMEOUT, periodInfo);
      
          }

        } catch (e) {
          log.error(`Error in composing notification message for payOut(): ` + e);
        }
      }, UPDATE_AFTER_PAYMENT_DELAY);

    } catch (e) {
      log.error(`Error in payOut(), retryNo: ${retryNo}. ` + e);
      doRetry(retryNo+1, (retryNo+1) * RETRY_PAYOUTS_TIMEOUT, periodInfo);
    }
    
  }

}
