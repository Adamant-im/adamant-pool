var FORMAT_TRANS = 'YYYY/MM/DD HH:mm';
var panel = new Vue({
		el: '#panel',
		created() {
			setTimeout(() => {
				$('.preloader').fadeOut(1000);
			}, 2000);
			this.getSystem();
			this.refresh();
		},
		data: {
			FORMAT_TRANS: FORMAT_TRANS,
			transactions: [],
			voters: [],
			delegate: {},
			system: {},
			lastPayOut: 0,
			nextPayOut: 0,
			sorted: -1
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
						panel.lastPayOut = moment(lastTrans.timeStamp).format(FORMAT_TRANS);
						panel.nextPayOut = moment(lastTrans.timeStamp + parseInt(panel.system.payoutperiod) * 3600 * 24 * 1000).format(FORMAT_TRANS);
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
				this.getTransactions();
				this.getVoters();
				this.getDelegate();
			},
			sortRows(table, field) {
				this.sorted *= -1;
				if (table == 'voters')
					panel.voters.sort((a, b) => (a[field] - b[field]) * this.sorted);
				if (table == 'transactions')
					panel.transactions.sort((a, b) => (a[field] - b[field]) * this.sorted);

			},
			moment: moment

		}

	});
