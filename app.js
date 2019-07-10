const {TIME_RATE, SAT} = require('./helpers/const');
const rewardUsers = require('./helpers/rewardUsers');
const adamant = require('./helpers/api');
const log = require('./helpers/log');
const notifier = require('./helpers/slackNotifier');
const Store = require('./modules/Store');

let lastForg = unixTime(),
    delegateForged;
// Init
setTimeout(async () => {
    require('./helpers/cron');
    require('./server');
    delegateForged = + (await adamant.get('delegate_forged', Store.delegate.publicKey)).forged;
    await Store.updateDelegate(true);
    notifier(`Pool ${Store.poolname} started for address _${Store.delegate.address}_ (ver. ${Store.version}).`, 'info');
    iterat();
}, 5000);

function iterat () {
    setTimeout(async () => {
        try {
            const newForged = + (await adamant.get('delegate_forged', Store.delegate.publicKey)).forged;
            if (isNaN(newForged)) {
                const msg = `Pool ${Store.poolname} _newForged_ value _isNaN_! Please check Internet connection.`;
                notifier(msg, 'error');
                log.error(msg);
                iterat();
                return;
            }
            if (delegateForged < newForged) {
                lastForg = unixTime();
                const forged = newForged - delegateForged;
                log.info('New Forged: ' + forged / SAT + ' ADM.');
                const resRewards = rewardUsers(forged, delegateForged);
                if (resRewards) {
                    delegateForged = newForged;
                }
            }

        } catch (e) {
            log.error('Get new Forged!');
        }
        iterat();
    }, TIME_RATE * 1000);
}

// refresh dbVoters if no forged
setTimeout(() => {
    rewardUsers(0);
}, 10000);

setInterval(() => {
    if (unixTime() - lastForg > 600) {
        rewardUsers(0);
    }
}, 600 * 1000);

function unixTime () {
    return new Date().getTime() / 1000;
}
