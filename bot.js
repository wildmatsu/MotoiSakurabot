const Discord = require('discord.js');
const client = new Discord.Client();
const Markov = require('markov-strings').default;
const FS = require('fs');
const cfg = require("./config.json");
const winston = require("winston");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.simple(),
  defaultMeta: { service: "user-service" },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

logger.add(new winston.transports.Console({
  format: winston.format.simple()
}));

var contents = FS.readFileSync('titles.txt', 'utf8');

var data = contents.split("\r\n");

const markov = new Markov(data, {
  stateSize: 1
});

markov.buildCorpus();

client.on('ready', () => {
  logger.log('info', `Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {

  // Disregard messages that don't start with prefix, and disregard own messages
  if (!msg.content.startsWith(cfg.prefix) || msg.author.bot) return;

  // Split arguments
  const args = msg.content.slice(cfg.prefix.length).split(' ');
  const command = args.shift().toLowerCase();

  logger.log("info", `Received command ${cfg.prefix}${command} with args: ${args}`);
  logger.log("info", `Time: ${msg.createdAt}`);
  logger.log("info", `Server: ${msg.guild}`);
  logger.log("info", `User: ${msg.author.tag}`);

  if (command === "online") {
    msg.channel.send('I am currently online.');

  } else if (command === "sakurize") {
    const options = {
      maxTries: 1000,
      filter: (result) => {
        return result.string.split(' ').length >= 2 && result.score >= 50 && result.refs.length >= 2
      }
    }

    const result = markov.generate(options);
    logger.log("info", `Raw result: ${result.string}`);
    logger.log("info", `Score: ${result.score}`);
    logger.log("info", `Tries: ${result.tries}`);
    logger.log("info", result.refs);

    // Clean up text
    var str = result.string;
    str = str.replace(/\( /g, "(");
    str = str.replace(/ \)/g, ")");
    str = str.replace(/ \.{3}/g, "...");
    str = str.replace(/ !/g, "!");
    str = str.replace(/ \?/g, "?");
    str = str.replace(/ - /g, "-");
    str = str.replace(/ ,/g, ",");
    str = str.replace(/ \./g, ".");
    str = str.replace(/ :/g, ":");
    str = str.charAt(0).toUpperCase() + str.slice(1);

    // If we have a "(" without a ")" add it
    if (str.includes("(") && !str.includes(")")) {
      str = str + ")";
    }

    // If we have a ")" without a "(", remove it
    while (str.includes(")") && !str.includes("(")) {
      var index = str.indexOf(")");
      str = str.slice(0, index) + str.slice(index + 1, str.length);
    }

    // Trim an unmatched trailing ~
    if (str.indexOf(" ~") === str.length - 2) {
      str = str.slice(0, -2);
    }

    logger.log("info", `Cleaned result: ${str}`);
    msg.channel.send(str);

  } else if (command === "help") {
    msg.channel.send(
      "Commands:\n" +
      "```" +
      `${cfg.prefix}online:         Sends a message indicating I am online.\n` +
      `${cfg.prefix}help:           Print this message.\n` +
      `${cfg.prefix}sakurize:       Use Markov chains to generate a Motoi Sakuraba song title.\n\n` +
      "```\n" +
      "Matsu-exclusive Commands:\n" +
      "```" +
      `${cfg.prefix}changenick:     Change my server nickname.\n` +
      `${cfg.prefix}becomesakuraba: Change my server nickname to "Motoi Sakuraba."\n` +
      "```"
    );

  } else if (command === "changenick") {
    if (msg.author.id === cfg.adminId) {
      var nickname = args.join(" ");
      msg.channel.send(`Attempting to change my server nickname to "${nickname}".`);
      msg.guild.members.get(client.user.id).setNickname(nickname);
    } else {
      msg.channel.send(`Error: Only my administrator is allowed to do that!`);
    }

  } else if (command === "becomesakuraba") {
    if (msg.author.id === cfg.adminId) {
      msg.channel.send('Attempting to change my server nickname to "Motoi Sakuraba".');
      msg.guild.members.get(client.user.id).setNickname("Motoi Sakuraba");
    } else {
      msg.channel.send(`Error: Only my administrator is allowed to do that!`);
    }
  }
});

client.on('error', console.error);

client.login(cfg.token);
