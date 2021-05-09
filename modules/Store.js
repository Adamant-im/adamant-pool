const api = require('../helpers/api');
const {version} = require('../package.json');
const config = require('../helpers/configReader');

module.exports = {
    version,
    poolname: '',
    delegate: {
        address: config.address,
        publicKey: config.publicKey,
        balance: 0,
        voters: []
    },
    async updateVotersList () {
        const resp = await api.get('uri', 'delegates/voters?publicKey=' + this.delegate.publicKey);
        if (resp && resp.success){
            this.delegate.voters = resp.accounts;
        }
    },
    async updateBalance () {
        const resp = await api.get('uri', 'accounts?publicKey=' + this.delegate.publicKey);
        if (resp && resp.success){
            this.delegate = Object.assign(this.delegate, resp.account);
            this.delegate.balance = +this.delegate.balance;
        }
    },

    async updateDelegate (isUpdateVoters){
        try {

            let resp = await api.get('delegates/get', { publicKey: this.delegate.publicKey });
            console.log('resp1', resp)
            process.exit(1);
            // if (resp && resp.success){
            //     this.delegate = Object.assign(this.delegate, resp.delegate);
            //     this.poolname = this.delegate.username;
            //     this.delegate.votesWeight = +this.delegate.votesWeight;
            // }
            // if (isUpdateVoters){
            //     await this.updateVotersList();
            //     await this.updateBalance();
            // }
        } catch (e) {
            console.log('e', e)
        }
    },
};

setInterval(() => {
    module.exports.updateDelegate(true);
}, 60 * 1000);
