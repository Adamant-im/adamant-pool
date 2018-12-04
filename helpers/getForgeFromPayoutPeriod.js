const {SAT} = require('./const');
const _ = require('lodash');
const {dbTrans, dbBlocks} = require('./DB');

module.exports={
	forged:0,
	refresh:async function(){ 
		let lastTrans=(await dbTrans.syncFind({})).sort((a,b)=>b.timeStamp-a.timeStamp)[0];
		let startTimeStamp=0;
		if(lastTrans) startTimeStamp=lastTrans.timeStamp;
		const blocksPeriod=(await dbBlocks.syncFind({unixTimestamp:{$gte:startTimeStamp}})).sort((a,b)=>a.unixTimestamp-b.unixTimestamp);
		if(!blocksPeriod.length) {
			this.forged=0;
			return;			
		}		
		if(blocksPeriod.length==1) {
			this.forged=+blocksPeriod[0].totalForged/SAT;
			return;
		}
		const firstBlock=blocksPeriod[0];
		const lastBlock=_.last(blocksPeriod);
		this.forged=(+lastBlock.delegateForged-firstBlock.delegateForged)/SAT+0.5;		
	}		
}

module.exports.refresh();
