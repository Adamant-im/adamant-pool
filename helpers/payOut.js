const {
    SAT,
    FEE
} = require('./const');
const config = require('./configReader');
const adamant = require('./api');
const log = require('./log');
const {dbVoters, dbTrans} = require('./DB');
const Store = require('../modules/Store');
const notifier = require('./slackNotifier');
const periodData = require('./periodData');
const clearHistory = require('./clearHistory');


module.exports = async () => {
    log.info('Pay out period!');
    try {
        let balance = Store.delegate.balance / SAT;
        const {poolname} = Store;

        if (!config.passPhrase) {
            let msg = 'Pool ' + poolname + ' is in read-only mode. To enable payouts, set _passPhrase_ in config.';
            notifier(msg, 'warn');
            return;
        }
        const totalforged = periodData.forged;
        const usertotalreward = periodData.rewards; // 80%
        periodData.zero();

        const voters = await dbVoters.syncFind({});
        const votersToReceived = voters.filter((v) => v.pending >= (config.minpayout || 10));
        const votersMinPayout = voters.filter((v) => v.pending < (config.minpayout || 10));

        if (!votersToReceived.length) {
            log.error(' Voters to received is null');
            let msg0 = `Pool ${poolname}: no pending payouts. _Balance of delegate — ${balance.toFixed(4)} ADM._`;
            notifier(msg0, 'warn');
            return;
        }

        let leftPending = votersMinPayout.reduce((s, v) => {
            return s + v.pending;
        }, 0);

        let totalPayNeed = votersToReceived.reduce((s, v) => {
            return s + v.pending;
        }, 0);

        let msg1 = `Pool ${poolname} is ready to make payouts. Values: _payoutcount_ — ${votersToReceived.length}, _totalforged_ — ${totalforged.toFixed(4)} ADM, sum of _usertotalreward_ — ${usertotalreward.toFixed(4)} ADM, amount for this payout — ${totalPayNeed.toFixed(4)} ADM, _balance of delegate — ${balance.toFixed(4)} ADM._`;

        if (totalPayNeed > balance) {
            let msg3 = `Pool ${poolname} notifies about problems with payouts. Admin attention is needed. Balance of delegate now — ${balance.toFixed(4)} ADM.`;
            notifier(msg3, 'error');
            return;
        }
        notifier(msg1, 'info');

        let totalPayOut = 0;
        let successTrans = 0;
        for (let v of votersToReceived) {
            try {
                let {address, pending, received} = v;
                const trans = adamant.send(config.passPhrase, address, pending);

                if (!trans || !trans.success) {
                    let err = "502 Bad Gateway";
                    if (trans) {
                        err = trans.error;
                    }

                    let msg = `Pool ${poolname} notifies about problem with payout: transaction of amount _${pending.toFixed(4)} ADM_ to user _${address}_ unsuccessful. Node’s reply: _${err}_.`;
                    notifier(msg, 'error');
                    continue;
                }
                successTrans++;

                delete trans.success;

                trans.timeStamp = new Date().getTime();
                trans.address = address;
                trans.received = received;
                trans.payoutcount = pending;
                totalPayOut += pending;
                received += pending;
                const resUpdateRecived = await dbVoters.syncUpdate({address}, {
                    $set: {pending: 0, received}
                });
                const resCreateTrans = await dbTrans.syncInsert(trans);

                if (!resUpdateRecived) {
                    log.error(" Updated  received " + address + ' ' + pending);
                }

                if (!resCreateTrans) {
                    log.error(" Create  transaction " + address + ' ' + pending);
                }

            } catch (e) {
                log.error(' Set transaction: ' + e);
            }
        }

        let delegate_report = 'maintenance wallet is not set';
        let totalFee;
        if (successTrans) {
            totalFee = successTrans * FEE;
        }

        if (config.maintenancewallet && successTrans) {
            let delegateProf = totalforged - usertotalreward; // 100-percent
            totalFee += FEE;
            delegateProf -= totalFee;

            if (delegateProf > 0) {
                const trans_maintenance = adamant.send(config.passPhrase, config.maintenancewallet, delegateProf);
                if (trans_maintenance && trans_maintenance.success) {
                    delegate_report = `${delegateProf.toFixed(4)} ADM to maintenance wallet ${config.maintenancewallet}`;
                }
            } else {
                totalFee -= FEE;
                delegate_report = `maintenance reward doesn't cover transaction fees`;
            }
        }
        setTimeout(async () => {
            await Store.updateDelegate(1);
            balance = Store.delegate.balance / SAT;
            let msg2;
            let type = 'info';
            if (votersToReceived.length === successTrans) {
                msg2 = `Pool ${poolname} made payouts successfully. Transferred ${totalPayOut.toFixed(4)} ADM to users, ${delegate_report}. Total payouts count: ${successTrans}, total fee ${totalFee} ADM. Number of pending payouts (users forged less, than minimum of ${config.minpayout} ADM) — ${votersMinPayout.length}, their total rewards amount is ${leftPending.toFixed(4)} ADM. _Balance of delegate now — ${balance.toFixed(4)} ADM._`;
            } else {
                type = 'error';
                msg2 = `Pool ${poolname} notifies about problems with payouts. Admin attention is needed. Balance of delegate now — ${balance} ADM.`;
            }

            notifier(msg2, type);

            clearHistory();
        }, 60 * 1000);
    } catch (e) {
        log.error(' Sending coins: ' + e);
    }
};
