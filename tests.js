const config = {
    'passPhrase': 'music poet genuine utility luggage breeze burst pyramid dish random alien language',
    'node': [
        'http://localhost:36666',
        'https://endless.adamant.im',
        'https://clown.adamant.im',
        'https://bid.adamant.im',
        'https://unusual.adamant.im',
        'https://debate.adamant.im',
        'http://185.231.245.26:36666',
        'http://80.211.177.181:36666',
        'https://lake.adamant.im'
    ],
    'publicKey': 'cc1ca549413b942029c4742a6e6ed69767c325f8d989f7e4b71ad82a164c2ada',
    'address': 'U1467838112172792705',
    'payoutperiod': '5d',
    'port': 36667
};

// {"type":"ETH_transaction","amount":0.1,"hash":"0x96075435aa404a9cdda0edf40c07e2098435b28547c135278f5864f8398c5d7d","comments":"Testing purposes "}
// today fruit annual honey saddle stairs left paper jewel tortoise moon miracle
// U15174911558868491228
// const api = require('adamant-api')(config);

// const keys = require('adamant-api/helpers/keys');
// const {publicKey, privatKey} = keys.createKeypairFromPassPhrase(config.passPhrase);
// const adm_address = keys.createAddressFromPublicKey(publicKey);
// const tx = api.get('uri', 'chats/get/?recipientId=' + adm_address + '&orderBy=timestamp:desc&limit=10').transactions;
// tx.forEach(t => {
// 	const chat = t.asset.chat;
// 	console.log('msg', api.decodeMsg(chat.message, t.senderPublicKey, config.passPhrase, chat.own_message));
// 	console.log(t.type);
// });

module.exports = config;