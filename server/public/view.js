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
			title:'Pending ADM'
			},{
			field:'received',
			title:'Received ADM'
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
			title:'Received ADM'
			},{
			field:'timeStamp',
			title:'Date'
		}],
		
		
		sorted: -1,
		sorted_field:''
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
			$.get('/api/get-transactions', function (res) {
				res.sort((a, b) => {
					return b.timeStamp - a.timeStamp
				});
				if (typeof res == 'object')
				panel.transactions = res;
				var lastTrans = panel.transactions[0];
				if (!lastTrans) {
					panel.lastPayOut = '-';
					} else {
					panel.lastPayOut = moment(lastTrans.timeStamp).format(FORMAT_PAYOUT);
					panel.nextPayOut = moment(lastTrans.timeStamp + parseInt(panel.system.payoutperiod) * 3600 * 24 * 1000).format(FORMAT_PAYOUT); 
				}
			});
		},
		getVoters() {
			$.get('/api/get-voters', function (res) {
				res.sort((a, b) => b.userWeight - a.userWeight);
				if (typeof res == 'object')
				panel.voters = res;
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
			el.rotate = (el.rotate || 0)+360;
			el.style.transform = "rotate("+el.rotate+"grad)";
		},
		sortRows(table, field) {
			console.log(field)
			this.sorted_field=field;
			this.sorted *= -1;
			if (table == 'voters')
			panel.voters.sort((a, b) => (a[field] - b[field]) * this.sorted);
			if (table == 'transactions')
			panel.transactions.sort((a, b) => (a[field] - b[field]) * this.sorted);
			
		},
		
		moment: moment
		
	}
	
});
