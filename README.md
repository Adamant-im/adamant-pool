
ADAMANT Forging Pool is a software that helps you running a forging pool in ADAMANT blockchain, calculating and transferring voters’ rewards automatically.

Read more about [Forging, delegates, Fair dPoS, and how to run your Forging pool](https://medium.com/adamant-im/earning-money-on-adm-forging-4c7b6eb15516).

# Features and advantages

* Easy to install
* Customizable (config file)
* History stored in local files (nedb)
* Minimum server requirements
* Setup on a separate machine without a node
* Informative web interface for voters + mobile version
* Notification system via ADAMANT or Slack for admin
* Built-in node availability check

See [User-friendly description and installation instructions](https://medium.com/adamant-im/create-your-own-adamant-forging-pool-a8574f5da43b).

# Installation

## Requirements

* Ubuntu 16, 18, 20 (we didn't test others)
* NodeJS v8+ (already installed if you have a node on your machine)

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

* `node` <string, array> List of ADAMANT nodes for pool’s API, obligatorily
* `passPhrase` <string> The pools’s secret phrase. Pool's ADM address will correspond this passPhrase. Must be a delegate of ADAMANT blockchain. Obligatory.
* `reward_percentage` <number> The percentage of forged amount that will be sent to voters. Default: 80
* `minpayout` <number> Minimal amount in ADM to transfer in the end of payout period. If voter's share is less than minpayout, payout will be postponed to the next period. Default: 10
* `payoutperiod` <string> The duration of payout period (1d, 5d, 10d, 15d, 30d) counted from the first day of a month. 1d — everyday payouts. 10d — payouts every 1st, 10th, 20th days of month. Default: 10d
* `considerownvote` <boolean> Whether to consider your own vote (the pool can vote for itself). Default: false
* `maintenancewallet` <string> Maintenance wallet to receive (100-reward_percentage) rewards. If you wish to leave it on the pool's wallet, set to empty string.
* `slack` <string> Slack key for monitoring notifications. No alerts if not set.
* `adamant_notify` <string> ADAMANT address for monitoring notifications. No alerts if not set.
* `port` <number> Port for public web interface. The web interface is available at http://IP:port. Default: 36667

## Launching

You can start the pool with the `node app` command, but we recommend to use a process manager for this purpose.

```
pm2 start --name adamantpool app.js 
```

## Add pool to cron

```
crontab -e
```

Add string:

```
@reboot cd /home/adamant/adamant-pool && pm2 start --name adamantpool app.js
```
