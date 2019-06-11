const {
    TIME_RATE,
    SAT
} = require('./helpers/const');
const config = require('./helpers/configReader');
const rewardUsers = require('./helpers/rewardUsers');
const adamant = require('./helpers/api');
const log = require('./helpers/log');
const notifier = require('./helpers/slackNotifier');
let lastForg = unixTime();

let delegateForged,
    poolname,
    delegate;
// Init
(async () => {
    require('./helpers/cron');
    require('./server');
    delegate = await adamant.get('full_account', config.address);
    poolname = delegate.delegate.username;
    delegateForged = +delegate.delegate.forged;

    log.info('ADAMANT-pool started ' + poolname + ' (' + config.address + ').');
    iterat();
})();

function iterat () {
    setTimeout(async () => {
        try {
            const newForged = + (await adamant.get('delegate_forged', delegate.publicKey)).forged;
            if (isNaN(newForged)) {
                const msg = `Pool ${poolname} newForged isNaN! Plese check internet connection.`;
                notifier(msg, 'error');
                log.error(msg);
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
}, 5000);

setInterval(() => {
    if (unixTime() - lastForg > 600) {
        rewardUsers(0);
    }
}, 600 * 1000);

function unixTime () {
    return new Date().getTime() / 1000;
}