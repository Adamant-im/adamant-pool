const api = require('../helpers/api');
const {version} = require('../package.json');
const config = require('../helpers/configReader');

let address, 
    publicKey;

if (config.isDev){
    address = config.address;
    publicKey = config.publicKey;
} else {
    const keys = require('adamant-api/helpers/keys');
    const AdmKeysPair = keys.createKeypairFromPassPhrase(config.passPhrase);
    address = keys.createAddressFromPublicKey(AdmKeysPair.publicKey);
    publicKey = AdmKeysPair.publicKey.toString('hex');
}

module.exports = {
    version,
    poolname: '',
    delegate: {
        address,
        publicKey,
        balance: 0,
        voters: []
    },
    async updateVotersList () {
        const resp = await api.get('uri', 'delegates/voters?publicKey=' + this.delegate.publicKey);
        if (resp.success){
            this.delegate.voters = resp.accounts;
        }
    },
    async updateDelegate (isUpdateVoters){
        const resp = await api.get('uri', 'delegates/get?publicKey=' + this.delegate.publicKey);// TODO: fixed endpoint node
        if (resp.success){
            this.delegate = Object.assign(this.delegate, resp.delegate);
            this.poolname = this.delegate.username;
            this.delegate.balance = +this.delegate.balance;
            this.delegate.votesWeight = +this.delegate.votesWeight;
        }
        if (isUpdateVoters){
            await this.updateVotersList();
        }
    },
};

setInterval(()=>{
    module.exports.updateDelegate(true);
}, 60 * 1000);