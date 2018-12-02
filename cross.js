const {dbVoters, dbBlocks, dbRewards, dbTrans}= require('./helpers/DB');

const app=async()=>{
	const data={};
const rewards= await dbRewards.syncFind({});
rewards.forEach(v=>{
data[v.address]=data[v.address] || 0;
data[v.address]+=v.reward;
})
let totalReceived=0;
const voters= await dbVoters.syncFind({});
voters.forEach(v=>{
let sum=v.pending+v.received;

console.log(v.address, sum, data[v.address])
totalReceived += sum; 
})

const blocks= (await dbBlocks.syncFind({})).sort((a,b)=>a.delegateForged-b.delegateForged);

//console.log(blocks)
let forge= (blocks[blocks.length-1].delegateForged- blocks[0].delegateForged)/100000000
console.log({totalReceived, forge});
//blocks.forEach(b=>console.log(b.delegateForged))
}

app();