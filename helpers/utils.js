const { SAT, EPOCH } = require('./const');

module.exports = {

  /**
   * Converts provided `time` to ADAMANT's epoch timestamp
   * @param {number=} time timestamp to convert
   * @returns {number}
   */
  epochTime(time) {
    if (!time) {
      time = Date.now()
    }
    return Math.floor((time - EPOCH) / 1000)
  },

  /**
   * Converts ADAMANT's epoch timestamp to a Unix timestamp
   * @param {number} epochTime timestamp to convert
   * @returns {number}
   */
  toTimestamp(epochTime) {
    return epochTime * 1000 + EPOCH
  },

  satsToADM(sats, decimals = 8) {
    try {

      adm = (+sats / SAT).toFixed(decimals);
      adm = +adm;
      return adm

    } catch (e) { }
  },

  unix() {
    return new Date().getTime();
  },

  thousandSeparator(num, doBold) {
    var parts = (num + '').split('.'),
      main = parts[0],
      len = main.length,
      output = '',
      i = len - 1;

    while (i >= 0) {
      output = main.charAt(i) + output;
      if ((len - i) % 3 === 0 && i > 0) {
        output = ' ' + output;
      }
      --i;
    }
    if (parts.length > 1) {
      if (doBold) {
        output = `**${output}**.${parts[1]}`;
      } else {
        output = `${output}.${parts[1]}`;
      }
    }
    return output;
  },

  getPrecision(decimals) {
    return +(Math.pow(10, -decimals).toFixed(decimals))
  },

  getModuleName(id) {
    let n = id.lastIndexOf("\\");
    if (n === -1)
      n = id.lastIndexOf("/");
    if (n === -1)
      return ''
    else
      return id.substring(n + 1);
  }

};
