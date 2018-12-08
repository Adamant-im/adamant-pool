const {SAT, FEE} = require('./const');
const config = require('./configReader');
const adamant = require('./api');
const log = require('./log');
const _ = require('lodash');
const {dbVoters, dbTrans, dbBlocks, dbRewards} = require('./DB');
const notifier=require('./slackNotifier');
const periodData=require('./periodData');



module.exports = async() => {
	log.info('Pay out period!');
	notifier('---------Payout period----------', 'green');
	try {
		let delegate=adamant.get('full_account', config.address);
		let balance=+delegate.balance/SAT;
		const poolname=delegate.delegate.username;	
		
		const totalforged =	periodData.forged;
		const usertotalreward=periodData.rewards;
		periodData.zero();
		
		const voters = await dbVoters.syncFind({});
		const votersToReceived = voters.filter((v)=>v.pending >= (config.minpayout || 10));
		const votersMinPayout = voters.filter((v)=>v.pending < (config.minpayout || 10));
		
		if (!votersToReceived) {
			log.error(' Voters to received is null');
			return;
		}
		let leftPending=votersMinPayout.reduce((s,v)=>{
			return s+v.pending;
		},0);
		
		let totalPayNeed=votersToReceived.reduce((s,v)=>{
			return s+v.pending;
		},0);		
		
		let msg1=`Pool ${poolname} is ready to make payouts. Values: _payoutcount_ — ${votersToReceived.length}, _totalforged_ — ${totalforged.toFixed(4)} ADM, sum of _usertotalreward_ — ${usertotalreward.toFixed(4)} ADM, amount for this payout — ${totalPayNeed.toFixed(4)} ADM, _balance of delegate — ${balance.toFixed(4)} ADM._`;
		
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
				trans.payoutcount = pending;
				totalPayOut+=pending;
				received += pending;
				const resUpdateRecived = await dbVoters.syncUpdate({address}, {$set: {pending: 0,received}});
				const resCreateTrans = await dbTrans.syncInsert(trans);
				
				if (!resUpdateRecived)
				log.error(" Updated  received " + address + ' ' + pending);
				
				if (!resCreateTrans)
				log.error(" Create  transaction " + address + ' ' + pending);
				
				} catch (e) {
				log.error(' Set transaction: ' + e);
			}			
		}		
		
		if (config.maintenancewallet) {}
		
		delegate=adamant.get('full_account', config.address);
		balance=+delegate.balance/SAT;
		let msg2;
		color='green';
		if(votersToReceived.length===successTrans){
			msg2=`Pool ${poolname} made payouts successfully. Transferred ${totalPayOut.toFixed(4)} ADM to users, <X> ADM to maintenance wallet <ID>. Total payouts count: ${successTrans}. Number of pending payouts (users forged less, than minimum of ${config.minpayout} ADM) — ${votersMinPayout.length}, their total rewards amount is ${leftPending.toFixed(4)} ADM. _Balance of delegate now — ${balance.toFixed(4)} ADM._`;
			} else{
			color=1;
			msg2= `Pool ${poolname} notifies about problems with payouts. Admin attention is needed. Balance of delegate now — ${balance} ADM.`;			
		}
		
		log.info(msg2);	
		notifier(msg2,color);
		} catch (e) {
		log.error(' Sending coins: ' + e);
	}
}	
