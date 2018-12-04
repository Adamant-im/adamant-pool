const {SAT} = require('./const');
const config = require('../config.json');
const adamant = require('adamant-rest-api')(config);
const log = require('./log');
const _ = require('underscore');
const syncNedb = require('./syncNedb');
const {dbVoters, dbBlocks, dbRewards, dbTrans}= require('./DB');
const notifier=require('./slackNotifier');
const periodData = require('./periodData');

module.exports = async(forged, delegateForged) => {
	
	const delegate = adamant.get('full_account', config.address)
	const blocks101=adamant.get('blocks');
	if(!blocks101) return;
	let timeStamp=new Date().getTime();
	
	const delegateBlocks=blocks101.filter(b=>b.generatorId===config.address);
	const lastDelegateBlock=_.last(delegateBlocks);
	lastDelegateBlock.delegateForged=delegateForged;
	lastDelegateBlock.unixTimestamp=timeStamp;
	
	
	if(!lastDelegateBlock) return;
	
	const blockId=lastDelegateBlock.id 
	const resSetBlock=await dbBlocks.syncInsert(lastDelegateBlock);
	if(!resSetBlock) log.error(' Set new block');
	
	
    const totalweight = +delegate.delegate.votesWeight;
    lastDelegateBlock.totalweight=totalweight; 
	const voters = delegate.voters;
    let usertotalreward = 0;
	
    for(let i=0;i<voters.length;i++) {
        try {
			const v = voters[i];
            const address = v.address;
			
			if(address == config.address && !config.considerownvote) continue;
			const userADM = v.balance;
			const userVotesNumber = adamant.get('account_delegates', address).length;
			
			let voter = await dbVoters.syncFindOne({address});
			
			if (!voter) {
				log.info('New voter: ' + address);
				
				voter = {
					address: address,
					pending: 0,
					received: 0
				};
				
				const resCreateVoter = await dbVoters.syncInsert(voter);
				
				if (!resCreateVoter) {
					log.error(' Failed created voter ' + address);
					return;
				}
			}
			
			const userWeight = userADM / userVotesNumber;
			const userReward = (userWeight / totalweight) * forged * config.reward_percentage/100/SAT;
			// console.log({userADM,userVotesNumber, userWeight})
			
			usertotalreward += userReward;
			const pending  = (voter.pending || 0) + userReward;		
			const resUpdatePending=await dbVoters.syncUpdate({address}, {$set: {pending,userWeight:userWeight/SAT, userVotesNumber, userADM:userADM/SAT}});
			
			if(!resUpdatePending) log.error(" Updated pending "+address);
			const reward = {
				address,
				reward:userReward,
				blockId,
				timeStamp,
				userWeight:userWeight/SAT,
				userADM:userADM/SAT,
				userVotesNumber
			}
			
			const resInsertReward=await dbRewards.syncInsert(reward);
			
			} catch (e) {
			log.error(' Reward Voter: ' + e);
		}
		
	};
	
	periodData.rewards+=usertotalreward;  
	periodData.forged+=forged/SAT;
	
	usertotalreward=+usertotalreward.toFixed(8);
	const username=delegate.delegate.username;
	
	let msg='Forged: ' + forged/SAT + ' User total reward:' + usertotalreward;
	
	if (forged * config.reward_percentage < usertotalreward) {
		log.warn(msg);
		notifier('Delegate:'+username+' '+msg, 1);
		} else {
		log.info(msg);	
	}
	
}			

// a();
// async function a(){

// console.log(last)
// }