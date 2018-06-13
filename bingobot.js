const Discord = require("discord.js");
const client = new Discord.Client();
const config = require("./config/config.json");
const timestamp = new Date();
const fs = require("fs");

// Environment variables
require('dotenv').config()


client.on("ready", () => {
  console.log(timestamp + "\nLet's Play Bingo!");
});

// Define constants
const prefix = config.prefix;
const admins = process.env.ADMINS;
const maxRolls = config.maxRolls;
const userSelectsCard = config.userSelectsCard;

// Read predictions from file, remove last prediction if empty string
var predictions = fs.readFileSync('./predictions.txt').toString().split('\n');
if (predictions[predictions.length-1] === "") {
  predictions.splice(-1,1);
}

// Exit if not enough predictions
if (predictions.length < 25) {
  console.log("You don't have enough predictions to generate a card. You need at least 24");
  return;
}

client.on("message", (message) => {
  // Exit and stop if prefix missing or from bot
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  // Trim prefix and sanitize
  var string = message.content.slice(prefix.length).trim();
  string = string.replace(/[“”]/g, '"');
  // Grab command and arguments
  const regex = /[^\s"]+|"([^"]*)"/gi;
  let args = [];
  do {
    var match = regex.exec(string);
    if (match != null) {
      args.push(match[1] ? match[1] : match[0]);
    }
  } while (match != null);
  const command = args.shift().toLowerCase();

  // Define variables
  let user = message.member;
  let bingoCard = "./cards/" + message.author.username + ".json";
  let enrollable = JSON.parse(fs.readFileSync('./config/config.json')).enrollable;
  let content, jsonContent, oldCard;
  var rolls;
  if (fs.existsSync(bingoCard)) {
    content = fs.readFileSync(bingoCard);
    jsonContent = JSON.parse(content);
    oldCard = jsonContent.card;
  }

  // Define functions
  function rollCard() {
    // Build unique random indices
    var uniqueRandoms = [];
    while (uniqueRandoms.length < 25) {
      let randomIndex = Math.floor(Math.random() * predictions.length);
      if (uniqueRandoms.indexOf(randomIndex) == -1) {
        uniqueRandoms.push(randomIndex);
      }
    }
    // Generate predictions
    var card = {};
    for (let i = 1; i <= 25; i++) {
      let cellName = "cell-" + i;
      card[cellName] = {};
      if (i === 13) {
        card[cellName]["value"] = "Free Space";
        card[cellName]["confirmed"] = true;
      } else {
        card[cellName]["value"] = predictions[uniqueRandoms[i-1]];
        card[cellName]["confirmed"] = false;
      }
    }
    return card;
  }

  function showPredictions(card) {
    let string = "";
    for (let key of Object.keys(card)) {
      if (card[key]["value"] !== "Free Space") {
        if(card[key]["confirmed"] == true) {
          string += "~~" + card[key]["value"] + "~~ ✅\n";
        } else {
          string += card[key]["value"] + "\n";
        }
      }
    }
    return string;
  }

  function saveCard(card) {
    fs.writeFile(bingoCard, JSON.stringify(card), function(err) {
      if (err) throw err;
    });
  }

  // Define commands
  switch (command) {
    case "roll":
      // Check if new users can still enroll
     if (!enrollable) {
        message.channel.send("Enrollments are now closed. See you next time!");
        return;
      }
      // Check if user qualifies for roll
      if (fs.existsSync(bingoCard)) {
        rolls = jsonContent.rolls + 1;
      } else {
        rolls = 1
      }
      if (rolls > maxRolls) {
        message.channel.send("Out of rerolls! Sorry, dood.");
        return;
      }

      // Generating card
      message.channel.send("_Beep boop generating card..._");
      var newCard = rollCard();

      // Display predictions
      let msg = "Done! Here are your predictions:\n";
      msg += showPredictions(newCard);
      message.channel.send(msg);
      // Prompt user to choose card, if enabled
      var cardToSave = {"rolls": rolls};
      if (userSelectsCard && rolls != 1) {
        message.channel.send("Save card? Yes or No");
        const collector = new Discord.MessageCollector(message.channel, m => m.author.id === message.author.id, { time: 10000 });
        collector.next.then(response => {
          if (response == "Yes" || response == "yes" || response == "y") {
            message.channel.send("OK, saving your new card.");
            cardToSave["card"] = newCard;
            saveCard(cardToSave);
          } else if (response == "No" || response == "no" || response == "n") {
            message.channel.send("Sure, you can keep your old card.");
            cardToSave["card"] = oldCard;
            saveCard(cardToSave);
          }
        }).catch(err => {
          // Time's up
        });
      } else {
        cardToSave["card"] = newCard;
        saveCard(cardToSave);
      }
      break;
    case "mypredictions":
      if (!fs.existsSync(bingoCard)) {
        message.channel.send("You don't have a bingo card! `" + prefix + "roll` to create one.");
        return;
      }
      message.channel.send(showPredictions(jsonContent.card));
      break;
    case "mycard":
      if (!fs.existsSync(bingoCard)) {
        message.channel.send("You don't have a bingo card! `" + prefix + "roll` to create one.");
      }
      let cardDisplay = "```|";
      let lineCount = 1;
      for (let i = 1; i <= 25; i++) {
        let cellName = "cell-" + i;
        if (jsonContent["card"][cellName]["confirmed"] == false) {
          cardDisplay += " ✖ |";
        } else if (jsonContent["card"][cellName]["confirmed"] == true){
          cardDisplay += " ◯ |";
        }
        lineCount++;
        if (lineCount == 6 && i != 25) {
          cardDisplay += "\n|";
          lineCount = 1;
        }
      }
      cardDisplay += "```";
      message.channel.send(cardDisplay);
      break;
    case "confirm":
      if (!admins.indexOf(message.author)) {
        message.channel.send("YOU ARE NOT AUTHORIZED TO USE THIS TOOL");
        return;
      }
      if (args.length == 0) {
        message.channel.send("You didn't submit anything to confirm.");
        return;
      }
      if (enrollable) {
        message.author.send("Enrollments are still open. Update `config/config.json` to start confirming.");
        return;
      }
      let confirmed = args.join(" ");
      let cards = [];
      fs.readdirSync("./cards/").forEach(file => {
        cards.push(file);
      });
      cards.forEach(function(card) {
        let pathToCard = "./cards/" + card;
        let newCard = {"rolls": jsonContent.rolls, "card": {}};
        let confirmationMessage = "";
        for (let key of Object.keys(oldCard)) {
          newCard["card"][key] = {};
          newCard["card"][key]["value"] = oldCard[key]["value"];
          if (oldCard[key]["value"].toLowerCase() == confirmed.toLowerCase()) {
            confirmationMessage += oldCard[key]["value"] + " ✅"
            newCard["card"][key]["confirmed"] = true;
          } else {
            newCard["card"][key]["confirmed"] = oldCard[key]["confirmed"];
          }
        }
        saveCard(newCard);
        if (confirmationMessage == "") {
          confirmationMessage += "No one with that prediction. Make sure it's not a typo.";
        }
        message.channel.send(confirmationMessage);
      });
      break;
  }
});

client.login(process.env.TOKEN);
