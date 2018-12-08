const jsonminify = require("jsonminify");
const fs = require("fs");
let config={};

try{
	config=JSON.parse(jsonminify(fs.readFileSync('./config.json','utf-8')));
	} catch(e){
	console.log('Err config:'+e);
}

module.exports=config;