const {
	SAT
} = require('./const');
const config = require('../config.json');
const adamant = require('adamant-rest-api')(config);
const log = require('./log');
const _ = require('lodash');
const {
	dbVoters,
	dbTrans
} = require('./DB');

module.exports = async() => {
	log.info('Pay out period!');
	
	try {
		const votersToReceived = await dbVoters.syncFind({
			$where: function () {
				return this.pending > (config.minpayout || 10);
			}
		});
		
		if (!votersToReceived) {
			log.error(' Voters to received is null');
			return;
		}
		let lastPayOut = false;
		for (let v of votersToReceived) {
			try {
				let {
					address,
					pending,
					received
				} = v;
				// const trans= admitad.send((config.passPhrase, address, pending));
				const trans = { // Demo transaction
					success: true,
					transactionId: new Date().getTime() / Math.random(),
				}
				
				if (!trans)
				return;
				
				delete trans.success;
				
				trans.timeStamp = new Date().getTime();
				trans.address = address;
				trans.received =received;
				trans.pending = pending;
				trans.payoutcount = pending;
				received += pending;
				const resUpdateRecived = await dbVoters.syncUpdate({address}, {$set: {pending: 0,received}});
				const resCreateTrans = await dbTrans.syncInsert(trans);
				
				if (!resUpdateRecived)
				log.error(" Updated  received " + address + ' ' + pending);
				
				if (!resCreateTrans)
				log.error(" Create  transaction " + address + ' ' + pending);
				
				lastPayOut = trans.nodeTimestamp;
				} catch (e) {
				log.error(' Set transaction: ' + e);
			}
			
		}
		
		if (config.maintenancewallet) {}
		
		} catch (e) {
		log.error(' Sending coins: ' + e);
	}
}
