var cron = require('node-cron');
 
var task = cron.schedule('* * * * *', () =>  {
  console.log('will execute every minute until stopped');
});
 