
ADAMANT Forging Pool is a software that helps you running a forging pool in ADAMANT blockchain, calculating and transferring voters’ rewards automatically.

Read more about [Forging, delegates, Fair dPoS, and how to run your Forging pool](https://medium.com/adamant-im/earning-money-on-adm-forging-4c7b6eb15516).

# Features and advantages

* Easy to install
* Reliable, uses decentralized network advantages
* Customizable (config file)
* History stored in local files (nedb)
* Minimum server requirements: 1 vCPU and 512 MB of RAM
* You can setup the pool on a separate machine without a node
* Dashboard for voters, supports mobile version
* Notification system via ADAMANT or Slack for admin

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

Parameters: see comments in `config.json`.

## Launching

You can start the pool with the `node app.js` command, but we recommend to use a process manager for this purpose.

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
