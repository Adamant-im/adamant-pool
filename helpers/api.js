const config = require('./configReader');
module.exports=require('adamant-api')(config);

console.log(module.exports)