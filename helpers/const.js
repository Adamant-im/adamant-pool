module.exports = {
	UPDATE_BLOCKS_INTERVAL: 60 * 1000, // get new blocks every minute
	UPDATE_DELEGATE_INTERVAL: 3 * 60 * 1000, // update delegate info, balance and voters every 3 minutes
	RETRY_DISTRIBUTE_REWERDS_TIMEOUT: 10 * 1000, // if the pool is updating voters, postpone distributing rewards for 10 seconds
	SAT: 100000000, // 1 ADM = 100000000
	DEVIATION: 100000, // consider balance is zero when it is lower, then 0.001 ADM
	FEE: 0.5 // Transfer (Type 0) Tx fee
}