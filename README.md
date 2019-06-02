
ADAMANT Forging pool is a software that helps you running Fogring pool, calculating and transferring voters’ rewards automatically.

Read more about [Forging, delegates, Fair dPoS, and how to run your Forging pool](https://medium.com/adamant-im/earning-money-on-adm-forging-4c7b6eb15516).

# Features and advantages

* Easy to install
* Customizable (config file)
* History of all work made stored in the database
* Minimum server requirements
* Setup on a separate machine without a node
* Informative web interface for voters + mobile version
* Notification system via ADAMANT, Slack for admin (other method is configurable)
* Built-in node availability check
* Read-only mode without passphrase or with automatic payments

See [User-frienldy description and installation instructions](https://medium.com/adamant-im/create-your-own-adamant-forging-pool-a8574f5da43b).

# Installation
## Requirements
* Ubuntu 16 / Ubuntu 18 (other OS had not been tested)
* NodeJS v 8+ (already installed if you have a node on your machine)

## Setup
```
su - adamant
git clone https://github.com/Adamant-im/adamant-pool
cd ./adamant-pool
npm i
```

## Pre-launch tuning
```
nano config.json
```

Parameters:
* `node` <string, array> List of nodes for pool’s API work, obligatorily
* `address` <string> The delegate’s ADM wallet address, obligatorily
* `passPhrase` <string> The delegate’s secret phrase for concluding transactions. If absent, transfers are not available, and the pool will work in “Read only” mode as system for statistics.
* `reward_percentage` <number> The percentage of forged amount that will be sent to voters. Default: 80
* `minpayout` <number> Minimal sum for transfer in the end of payout period (in ADM). If the amount is not enough, the payment will be postponed to the next period. Default: 10
* `payoutperiod` <string> The duration of payout period (1d, 5d, 10d, 15d, 30d) counted from the first day of a month. 1d — everyday payouts. 10d — payouts every 1st, 10th, 20th days of month. Default: 10d
* `considerownvote` <boolean> Whether to consider your own vote (can you vote for the delegate for yourself). Default: false
* `maintenancewallet` <string> Wallet to transfer delegate share (100-reward_percentage) to. If the wallet is not set, this amount will remain on the delegate’s wallet.
* `slack` <string> Token for Slack alerts for the pool’s administrator. No alerts if not set.
* `adamant_notify` <string> ADM address for the pool’s administrator. Recommended.
* `port` <number> Port for connecting the web interface. The web interface is available at http://IP:port. Default: 36668

## Launching
You can start the pool with the `node app` command, but it is recommended to use the process manager for this purpose.
```
pm2 start --name adamantpool app.js 
```

## Add pool to cron:
```
crontab -e
```

Add string:
```
@reboot cd /home/adamant/adamant-pool && pm2 start --name adamantpool app.js
```


