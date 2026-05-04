require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  ActivityType,
  Collection
} = require('discord.js');

const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const PREFIX = ".";
const afkUsers = new Map();

// load slash commands
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);

  client.user.setPresence({
    status: 'dnd',
    activities: [{
      name: 'Owned by Nex',
      type: ActivityType.Custom
    }]
  });
});

// MESSAGE COMMANDS
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // AFK mention
  message.mentions.users.forEach(user => {
    if (afkUsers.has(user.id)) {
      const data = afkUsers.get(user.id);

      const { ContainerBuilder, MessageFlags } = require('discord.js');

      const container = new ContainerBuilder()
        .setAccentColor(0x2b2d31)
        .addTextDisplayComponents(t => t.setContent(`@${user.username} is now afk`))
        .addSeparatorComponents(s => s)
        .addTextDisplayComponents(t => t.setContent(`**Reason:** ${data.reason}`));

      message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  });

  // remove AFK
  if (afkUsers.has(message.author.id)) {
    afkUsers.delete(message.author.id);

    if (message.member.nickname?.startsWith("[AFK] ")) {
      await message.member.setNickname(
        message.member.nickname.replace("[AFK] ", "")
      ).catch(() => {});
    }

    message.reply("AFK removed");
  }

  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  const {
    PermissionsBitField,
    ContainerBuilder,
    MessageFlags
  } = require('discord.js');

  // AFK
  if (cmd === "afk") {
    const reason = args.join(" ") || "No reason";

    afkUsers.set(message.author.id, { reason });

    try {
      await message.member.setNickname(`[AFK] ${message.member.displayName}`);
    } catch {}

    const container = new ContainerBuilder()
      .setAccentColor(0x2b2d31)
      .addTextDisplayComponents(t => t.setContent(`${message.author} is now afk`))
      .addSeparatorComponents(s => s)
      .addTextDisplayComponents(t => t.setContent(`**Reason:** ${reason}`));

    message.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }

  // STEAL EMOJI
  if (cmd === "steal") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers))
      return message.reply("No permission");

    const emoji = args[0];
    const name = args[1];

    if (!emoji || !name)
      return message.reply("Usage: .steal <emoji> <name>");

    const regex = /<?a?:\w+:(\d+)>?/;
    const match = emoji.match(regex);

    if (!match) return message.reply("Invalid emoji");

    const id = match[1];
    const animated = emoji.startsWith("<a:");
    const url = `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}`;

    try {
      await message.guild.emojis.create({ attachment: url, name });
      message.reply("Emoji added");
    } catch {
      message.reply("Failed");
    }
  }

  // STEAL STICKER
  if (cmd === "stealsticker") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers))
      return message.reply("No permission");

    const name = args[0];
    if (!name)
      return message.reply("Usage: .stealsticker <name>");

    const replied = await message.fetchReference().catch(() => null);
    if (!replied) return message.reply("Reply to a sticker");

    const sticker = replied.stickers.first();
    if (!sticker) return message.reply("No sticker");

    try {
      await message.guild.stickers.create({
        file: sticker.url,
        name,
        tags: "stolen"
      });
      message.reply("Sticker added");
    } catch {
      message.reply("Failed");
    }
  }

  // SAY
  if (cmd === "say") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("Admin only");

    const channel = message.mentions.channels.first();
    if (!channel) return message.reply("Mention channel");

    const text = args.slice(0, -1).join(" ");
    if (!text) return message.reply("Usage: .say <text> #channel");

    const container = new ContainerBuilder()
      .setAccentColor(0x2b2d31)
      .addTextDisplayComponents(t => t.setContent(text));

    await channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });

    message.delete().catch(() => {});
  }
});

// SLASH HANDLER
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, afkUsers);
  } catch (err) {
    console.error(err);
  }
});

client.login(process.env.TOKEN); 
