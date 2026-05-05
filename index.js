require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  ActivityType,
  PermissionsBitField,
  SlashCommandBuilder,
  REST,
  Routes,
  ContainerBuilder,
  MessageFlags
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const PREFIX = ".";
const afkUsers = new Map();

// READY
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  client.user.setPresence({
    status: 'dnd',
    activities: [{
      name: '.gg/blackroom',
      type: ActivityType.Custom
    }]
  });

  // register slash command
  const commands = [
    new SlashCommandBuilder()
      .setName('afk')
      .setDescription('Set AFK')
      .addStringOption(opt =>
        opt.setName('reason')
          .setDescription('Reason')
          .setRequired(true)
      )
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log("Slash command registered");
  } catch (err) {
    console.error("Slash register error:", err);
  }
});

// FUNCTION: container
function createAFKContainer(text, reason) {
  return new ContainerBuilder()
    .setAccentColor(0x2b2d31)
    .addTextDisplayComponents(t => t.setContent(text))
    .addSeparatorComponents(s => s)
    .addTextDisplayComponents(t => t.setContent(`**Reason:** ${reason}`));
}

// MESSAGE COMMANDS
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // mention AFK check
  message.mentions.users.forEach(user => {
    if (afkUsers.has(user.id)) {
      const data = afkUsers.get(user.id);

      const container = createAFKContainer(
        `@${user.username} is now afk`,
        data.reason
      );

      message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  });

  // remove AFK
  if (afkUsers.has(message.author.id)) {
    afkUsers.delete(message.author.id);

    if (message.member?.nickname?.startsWith("[AFK] ")) {
      await message.member.setNickname(
        message.member.nickname.replace("[AFK] ", "")
      ).catch(() => {});
    }

    message.reply("AFK removed");
  }

  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // AFK
  if (cmd === "afk") {
    const reason = args.join(" ") || "No reason";

    afkUsers.set(message.author.id, { reason });

    try {
      await message.member.setNickname(`[AFK] ${message.member.displayName}`);
    } catch {}

    const container = createAFKContainer(
      `${message.author} is now afk`,
      reason
    );

    return message.channel.send({
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

    const match = emoji.match(/<?a?:\w+:(\d+)>?/);
    if (!match) return message.reply("Invalid emoji");

    const id = match[1];
    const animated = emoji.startsWith("<a:");
    const url = `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}`;

    try {
      await message.guild.emojis.create({ attachment: url, name });
      message.reply("Emoji added");
    } catch {
      message.reply("Failed to add emoji");
    }
  }

  // STEAL STICKER
  if (cmd === "stealsticker") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers))
      return message.reply("No permission");

    const name = args[0];
    if (!name) return message.reply("Usage: .stealsticker <name>");

    const replied = await message.fetchReference().catch(() => null);
    if (!replied) return message.reply("Reply to a sticker");

    const sticker = replied.stickers.first();
    if (!sticker) return message.reply("No sticker found");

    try {
      await message.guild.stickers.create({
        file: sticker.url,
        name,
        tags: "stolen"
      });
      message.reply("Sticker added");
    } catch {
      message.reply("Failed to add sticker");
    }
  }

  // SAY (ADMIN)
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

// SLASH COMMAND
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "afk") {
    const reason = interaction.options.getString('reason');

    afkUsers.set(interaction.user.id, { reason });

    try {
      await interaction.member.setNickname(`[AFK] ${interaction.member.displayName}`);
    } catch {}

    const container = createAFKContainer(
      `${interaction.user} is now afk`,
      reason
    );

    await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
});

client.login(process.env.TOKEN);
