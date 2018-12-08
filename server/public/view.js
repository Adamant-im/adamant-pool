var FORMAT_TRANS = 'YYYY/MM/DD HH:mm';
var FORMAT_PAYOUT = 'YYYY/MM/DD';
var EL;
var panel = new Vue({
	el: '#panel',
	created() {
		setTimeout(() => {
			$('.preloader').fadeOut(1000);
		}, 2000);
		
		this.refresh();
		setInterval(()=>{
			this.refresh();
		}, 300*1000);
		
	},
	data: {
		FORMAT_TRANS: FORMAT_TRANS,
		FORMAT_PAYOUT:FORMAT_PAYOUT,
		transactions: [],
		voters: [],
		delegate: {},
		system: {},
		lastPayOut: 0,
		nextPayOut: 0,
		th_voters:[{
			field:'pending', 
			title:'Pending'
			},{
			field:'received',
			title:'Received'
			},{
			field:'userADM',
			title:'Balance'
			},{
			field:'userWeight',
			title:'Weight'
			},{
			field:'userVotesNumber',
			title:'Votes'
		}],
		th_trans:[{
			field:'payoutcount', 
			title:'Amount'
			},{
			field:'timeStamp',
			title:'Date'
		}],		
		sorted_voters: -1,
		sorted_transactions: -1,
		sorted_field_voters:'userWeight',
		sorted_field_transactions:'timeStamp'
	},
	computed:{
		totalPending:function(){
			return (this.voters.reduce(function(sum, v) {
				return sum + v.pending;
			}, 0)).toFixed(8);
		}
	},
	methods: {
		getTransactions() {
			var this_=this;
			$.get('/api/get-transactions', function (res) {
				if (typeof res == 'object')
				panel.transactions = res;		
				panel.sortRows('transactions', panel.sorted_field_transactions, 1);
				if(this_.system.payoutperiodStart){
					let start=this_.system.payoutperiodStart; 
					this_.lastPayOut = moment(start).format(FORMAT_PAYOUT);
					this_.nextPayOut = moment(start + parseInt(this_.system.payoutperiod) * 3600 * 24 * 1000).format(FORMAT_PAYOUT); 
				}				
			});
		},
		getVoters() {
			$.get('/api/get-voters', function (res) {
				if (typeof res == 'object')
				panel.voters = res;
				panel.sortRows('voters', panel.sorted_field_voters, 1) 
			});
		},
		getDelegate() {
			$.get('/api/get-delegate', function (res) {
				if (typeof res == 'object')
				panel.delegate = res;
			});
		},
		getSystem() {
			$.get('/api/get-config', function (res) {
				if (typeof res == 'object')
				panel.system = res;
				panel.getTransactions();
			});
		},
		refresh() {
			this.getSystem();
			this.getTransactions();
			this.getVoters();
			this.getDelegate();
		},
		fRefresh(e){
			this.refresh(); 
			var el=e.target;
			el.rotate = (el.rotate || 0)+400;
			el.style.transform = "rotate("+el.rotate+"grad)";
		},
		sortRows(table, field, noSort) { 
			this['sorted_field_'+table]=field;
			if(!noSort) this['sorted_'+table] *= -1;
			panel[table].sort((a, b) => (a[field] - b[field]) * this['sorted_'+table]);			
		},		
		moment: moment
	}
});
