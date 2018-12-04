const {SAT, FEE} = require('./const');
const config = require('../config.json');
const adamant = require('adamant-rest-api')(config);
const log = require('./log');
const _ = require('lodash');
const {dbVoters, dbTrans} = require('./DB');
const notifier=require('./slackNotifier');

module.exports = async() => {
	log.info('Pay out period!');
	
	try {
		const delegate=adamant.get('full_account', config.address);
		const poolname=delegate.delegate.username;		
		const votersToReceived = await dbVoters.syncFind({
			$where: function () {
				return this.pending > (config.minpayout || 10);
			}
		});
		
		
		if (!votersToReceived) {
			log.error(' Voters to received is null');
			return;
		}
		
		let totalPayNeed=votersToReceived.reduce((s,v)=>{
			return s+v.pending;
		},0);
		const balance=+delegate.balance/SAT;
		let msg1=`
		Delegate ${poolname} ready payout.
		TotalPayNeed:	${totalPayNeed}
		Balance:	${balance}`;
		let color='green';
		if(totalPayNeed > balance) color=1;
		
		notifier(msg1, color);
		log.info(msg1);
		let totalPayOut=0;
		let successTrans=0;
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
				
				if (!trans.success){
					console.log('return');
					return;
				}
				successTrans++;
				
				delete trans.success;
				
				trans.timeStamp = new Date().getTime();
				trans.address = address;
				trans.received =received;
				// trans.pending = pending;
				trans.payoutcount = pending;
				totalPayOut+=pending;
				received += pending;
				const resUpdateRecived = await dbVoters.syncUpdate({address}, {$set: {pending: 0,received}});
				const resCreateTrans = await dbTrans.syncInsert(trans);
				
				if (!resUpdateRecived)
				log.error(" Updated  received " + address + ' ' + pending);
				
				if (!resCreateTrans)
				log.error(" Create  transaction " + address + ' ' + pending);
				
				// lastPayOut = trans.nodeTimestamp;
				} catch (e) {
				log.error(' Set transaction: ' + e);
			}			
		}		
		
		let msg2=`
		Delegate ${poolname} payout finished.
		Total payout:	${totalPayOut}
		Count voters:	${votersToReceived.length}
		Success pays:	${successTrans}`;	
		
		log.info(msg2);
		color='green';
		if(votersToReceived.length>successTrans) color=1;
		notifier(msg2,color);
		if (config.maintenancewallet) {}
		
		} catch (e) {
		log.error(' Sending coins: ' + e);
	}
}	
// module.exports()