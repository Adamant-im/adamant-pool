var FORMAT_TRANS = 'YYYY/MM/DD HH:mm';
var FORMAT_PAYOUT = 'YYYY/MM/DD';

var panel = new Vue({
    el: '#panel',
    created: function () {
        setTimeout(function () {
            $('.preloader').fadeOut(1000);
        }, 2000);

        this.refresh();
        setInterval(function () {
            panel.refresh();
        }, 300 * 1000);

    },
    data: {
        FORMAT_TRANS: FORMAT_TRANS,
        FORMAT_PAYOUT: FORMAT_PAYOUT,
        transactions: [],
        voters: [],
        votersApi: '',
        delegate: {
            delegate: {},
            voters: []
        },
        system: {},
        lastPayOut: 0,
        nextPayOut: 0,
        th_voters: [{
            field: 'pending',
            title: 'Pending'
        }, {
            field: 'received',
            title: 'Received'
        }, {
            field: 'userADM',
            title: 'Balance'
        },
        {
            field: 'userVotesNumber',
            title: 'Votes'
        },
        {
            field: 'userWeight',
            title: 'Weight'
        },
        {
            field: 'userWeightPercent',
            title: '% of Total votes'
        }
        ],
        th_trans: [{
            field: 'payoutcount',
            title: 'Amount'
        }, {
            field: 'timeStamp',
            title: 'Date'
        }],
        sorted_voters: -1,
        sorted_transactions: -1,
        sorted_field_voters: 'userWeight',
        sorted_field_transactions: 'timeStamp'
    },
    computed: {
        totalPending: function () {
            return (this.voters.reduce(function (sum, v) {
                return sum + v.pending;
            }, 0)).toFixed(8);
        }
    },
    methods: {
        getTransactions: function () {
            var this_ = this;
            $.get('/api/get-transactions', function (res) {
                if (typeof res === 'object') {
                    panel.transactions = res;
                }
                console.log(res);
                panel.sortRows('transactions', panel.sorted_field_transactions, 1);
                if (this_.system.payoutperiodStart) {
                    let start = this_.system.payoutperiodStart;
                    this_.lastPayOut = moment(start).format(FORMAT_PAYOUT);
                    this_.nextPayOut = moment(start + parseInt(this_.system.payoutperiod) * 3600 * 24 * 1000).format(FORMAT_PAYOUT);
                }
            });
        },
        getVoters: function () {
            $.get('/api/get-voters', (res) => {
                if (typeof res === 'object') {
                    panel.voters = res.filter(v => ~panel.votersApi.indexOf(v.address) || v.pending >= panel.system.minpayout);
                }
                panel.voters.forEach(v => {
                    v.userWeightPercent = +(v.userWeight / this.delegate.delegate.votesWeight * 10000000000).toFixed(2);
                });
                panel.sortRows('voters', panel.sorted_field_voters, 1);
            });
        },
        getDelegate: function () {
            $.get('/api/get-delegate', function (res) {
                if (typeof res === 'object') {
                    panel.delegate = res;
                }
                console.log(panel.delegate);
                panel.votersApi = res.delegate.voters.map(v => v.address).toString();
                panel.getVoters();
            });
        },
        getSystem: function () {
            $.get('/api/get-config', function (res) {
                if (typeof res === 'object') {
                    panel.system = res;
                }
                panel.getTransactions();
                panel.getDelegate();
            });
        },
        refresh: function () {
            this.getSystem();
        },
        fRefresh: function (e) {
            this.refresh();
            var el = e.target;
            el.rotate = (el.rotate || 0) + 400;
            el.style.transform = "rotate(" + el.rotate + "grad)";
        },
        sortRows: function (table, field, noSort) {
            this['sorted_field_' + table] = field;
            if (!noSort) {
                this['sorted_' + table] *= -1;
            }
            panel[table].sort((a, b) => (a[field] - b[field]) * this['sorted_' + table]);
        },
        moment: moment
    }
});
