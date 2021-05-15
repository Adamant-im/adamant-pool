const { SAT, RETRY_PAYOUTS_TIMEOUT, RETRY_PAYOUTS_COUNT, FEE } = require('../helpers/const');
const { dbVoters, dbTrans } = require('../helpers/DB');
const log = require('../helpers/log');
const api = require('../helpers/api');
const config = require('../helpers/configReader');
const notifier = require('../helpers/notify');
const Store = require('./Store');
const utils = require('../helpers/utils');

module.exports = {

  async payOut(retryNo = 0) {

    function doRetry(retry, timeout) {
      console.log('retry payout')
      if (retry > RETRY_PAYOUTS_COUNT) {
        notifier(`Pool ${config.logName}: After ${RETRY_PAYOUTS_COUNT} re-tries, I didn't finished with payouts. Check the log file.`, 'error')
      } else {
        log.log(`Re-trying payouts ${retry} time in ${timeout / 1000} seconds.`)
        setTimeout(() => {
          module.exports.payOut(retry);
          }, timeout);
      }
    }

    try {

      console.log('payout')

      let isPayoutComplete = false;

      let balance = Store.delegate.balance / SAT;
      const periodTotalForged = Store.periodInfo.totalForged;
      const periodUserRewards = Store.periodInfo.userRewards;
      const periodForgedBlocks = Store.periodInfo.forgedBlocks;
      
      const voters = await dbVoters.syncFind({});
      const votersToReward = voters.filter((voter) => voter.pending >= config.minpayout);
      const votersBelowMin = voters.filter((voter) => voter.pending < config.minpayout);

      const pendingUserRewards = votersToReward.reduce((sum, voter) => { return sum + voter.pending; }, 0);
      const belowMinRewards = votersBelowMin.reduce((sum, voter) => { return sum + voter.pending; }, 0);

      let infoString = `Pending ${pendingUserRewards.toFixed(4)} ADM rewards for ${votersToReward.length} voters.`;
      infoString += `\n${votersBelowMin.length} voters forged less, than minimum ${config.minpayout} ADM, their pending rewards are ${belowMinRewards.toFixed(4)} ADM.`;
      infoString += `\nThe pool forged ${periodTotalForged.toFixed(4)} ADM from ${periodForgedBlocks} blocks this period; ${periodUserRewards.toFixed(4)} ADM distributed to users.`;
      infoString += `\nThe pool's balance — ${balance.toFixed(4)} ADM.`;

      if (!votersToReward.length) {
        notifier(`Pool ${config.logName}: No pending payouts.\n${infoString}`, 'warn');
        isPayoutComplete = true;
        return;
      }

      if (pendingUserRewards < balance) {
        notifier(`Pool ${config.logName}: Unable to do payouts, retryNo: ${retryNo}. Balance of the pool is less, then pending payouts. Top up the pool's balance.\n${infoString}`, 'error');
        doRetry(++retryNo, ++retryNo * RETRY_PAYOUTS_TIMEOUT);
        return;
      }

      if (retryNo) {
        notifier(`Pool ${config.logName}: Re-tying (${retryNo+1} of ${RETRY_PAYOUTS_COUNT}) to do payouts.`, 'log');
      } else {
        notifier(`Pool ${config.logName}: Ready to do periodical payouts.\n${infoString}`, 'log');
      }

      let payedUserRewards = 0;
      let payedCount = 0;
      let paymentFees = 0;
      // let payment;
      // let transaction;
      // let amount = 0;
      // let address = '';

      let updatedVoters = 0;
      let savedTransactions = 0;

      for (const voter of votersToReward) {
        try {

          const pending = voter.pending;
          const amount = voter.pending - FEE;
          const address = voter.address;
          const received = voter.received;

          console.log(`Processing payment of ${amount.toFixed(8)} ADM reward to ${address}…`);

          const payment = await api.send(config.passPhrase, address, amount);
          if (payment.success) {
            if (payment.result.success) {
              payedUserRewards += amount;
              paymentFees += FEE;
              payedCount += 1;
              log.log(`Successfully payed ${amount.toFixed(8)} ADM reward to ${address}.`);

              let transaction = payment.result;
              delete transaction.success;

              received += pending;
              transaction.timeStamp = new Date().getTime();
              transaction.address = address;
              transaction.payoutcount = pending; // user received this time, including Tx fee
              transaction.received = received; // user received in total, including fees

              const updateVoter = await dbVoters.syncUpdate({ address }, {
                $set: {pending: 0, received}
              });
              if (updateVoter) {
                log.log(`Voter's rewards successfully updated after payout: ${received.toFixed(8)} ADM received in total, 0 ADM pending for ${address}.`);      
                updatedVoters += 1;
              } else {
                log.error(`Failed to update rewards for ${address} after successful payout. Do it manually: ${received.toFixed(8)} ADM received in total, 0 ADM pending.`);
              }

              const insertTransaction = await dbTrans.syncInsert(transaction);
              if (insertTransaction) {
                log.log(`Successfully saved transaction ${transaction.id} after payout: ${pending.toFixed(8)} ADM payed to ${address}.`);      
                savedTransactions += 1;
              } else {
                log.error(`Failed to save transaction ${transaction.id} after successful payout. Do it manually: ${pending.toFixed(8)} ADM payed to ${address}.`);
              }

            } else {
              log.warn(`Unable to pay ${amount} ADM reward to ${address}. Node's reply: ${payment.result.error}.`);
            }
          } else {
            log.warn(`Failed to process payment of ${amount} ADM reward to ${address}, ${payment.error}. Message: ${payment.message}.`);
          }

        } catch (e) {
          log.error(`Error while doing payouts for ${address}: ${e}.`);
          continue;
        }

      } // for (const voter of votersToReward)

      // Wait 1 minute to update pool's balance and notify
      setTimeout(async () => {
        try {

          await Store.updateBalance();
          balance = Store.delegate.balance / SAT;
    
          let payoutInfo = '';
          let notifyType = '';

          if (payedCount === votersToReward.length) {
    
            if (updatedVoters === payedCount && savedTransactions === payedCount) {
              payoutInfo = `I've successfully payed and saved all of ${payedCount} payouts, ${payedUserRewards.toFixed(4)} ADM plus ${paymentFees.toFixed(1)} ADM fees in total.`;
              notifyType = 'info';
            } else {
              payoutInfo = `I've successfully payed of ${payedCount} payouts, ${payedUserRewards.toFixed(4)} ADM plus ${paymentFees.toFixed(1)} ADM fees in total.`;
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
            payoutInfo += `\nI'll re-try to pay the rest of voters in ${((++retryNo * RETRY_PAYOUTS_TIMEOUT) / 1000 / 60).toFixed(1)} minutes, retryNo: ${++retryNo}.`;
            notifier(`Pool ${config.logName}: ${payoutInfo}`, notifyType);
            doRetry(++retryNo, ++retryNo * RETRY_PAYOUTS_TIMEOUT);
      
          }

        } catch (e) {
          log.error(`Error in composing notification message for payOut(). Error: ${e}.`);
        }
      }, 60 * 1000);

    } catch (e) {
      log.error(`Error in payOut(), retryNo: ${retryNo}. Error: ${e}.`);
      doRetry(++retryNo, ++retryNo * RETRY_PAYOUTS_TIMEOUT);
    }
    
  }

}
