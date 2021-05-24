const api = require('../helpers/api');
const rewardUsers = require('../helpers/rewardUsers');

module.exports = {

  delegate: { },
  async updateVotersList() {
    const resp = await api.get('uri', 'delegates/voters?publicKey=' + this.delegate.publicKey);
    if (resp && resp.success) {
      this.delegate.voters = resp.accounts;
    }
  },
  async updateBalance() {
    const resp = await api.get('uri', 'accounts?publicKey=' + this.delegate.publicKey);
    if (resp && resp.success) {
      this.delegate = Object.assign(this.delegate, resp.account);
      this.delegate.balance = +this.delegate.balance;
    }
  },
  /**
    * Fetches information about a delegate
    * @param {string} publicKey Hex-string of a delegate's public key
    * @returns {Object} Delegate's info
    */
  async getDelegate(publicKey) {
    try {
      let delegate = await api.get('delegates/get', { publicKey });
      return delegate
    } catch (e) {
      console.log('e', e)
    }
  },
};

// setInterval(() => {
//   module.exports.updateDelegate(true);
// }, 60 * 1000);
