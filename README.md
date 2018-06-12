# bingobot
Discord.js bot for Bingo

## Introduction
bingobot was a sad attempt to generate Bingo cards for the upcoming E3 2018 which was not adopted by guild members. He now exists here for your own enjoyment.

## Prerequisites
bingobot requires discord.js, js, and a token for your own Discord bot.

## Configuration
There are configuration variables accessible in config.json
* token - Your bot token
* prefix - Prefix for your bot commands
* enrollable - Whether or not users can roll Bingo cards, as well as whether an admin can confirm predictions
* maxRolls - Maximum number of times user can roll a Bingo card
* userSelectsCard - Whether a user can choose between current card and newly rolled card. Disable if users are stuck with rerolls
* admins - Array containing Discord user IDs for admins who are able to confirm predictions.

## Dependencies
bingobot requires `./config.json` and `./predictions.txt` to play.

## Authors
**Yuping** -*Initial Work* - [that's me](https://github.com/wonderbrian)
