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

// ===== READY =====
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  client.user.setPresence({
    status: 'dnd',
    activities: [{
      name: 'https://discord.gg/th9EWYaCHu',
      type: ActivityType.Custom
    }]
  });

  // SLASH COMMANDS
  const commands = [
    new SlashCommandBuilder()
      .setName('afk')
      .setDescription('Set AFK')
      .addStringOption(opt =>
        opt.setName('reason').setDescription('Reason').setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('avatar')
      .setDescription('Get avatar')
      .addUserOption(opt =>
        opt.setName('user').setDescription('User').setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('say')
      .setDescription('Send message')
      .addChannelOption(opt =>
        opt.setName('channel').setDescription('Channel').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('text').setDescription('Message').setRequired(true)
      )
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log("Slash commands loaded");
  } catch (e) {
    console.error(e);
  }
});

// ===== CONTAINER HELPERS =====
function container(text, extra) {
  const c = new ContainerBuilder()
    .setAccentColor(0x2b2d31)
    .addTextDisplayComponents(t => t.setContent(text));

  if (extra) {
    c.addSeparatorComponents(s => s)
     .addTextDisplayComponents(t => t.setContent(extra));
  }

  return c;
}

// ===== MESSAGE COMMANDS =====
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // AFK mention
  message.mentions.users.forEach(user => {
    if (afkUsers.has(user.id)) {
      const data = afkUsers.get(user.id);

      message.reply({
        components: [container(`@${user.username} is now afk`, `**Reason:** ${data.reason}`)],
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

  const args = message.content.slice(1).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // ===== AFK =====
  if (cmd === "afk") {
    const reason = args.join(" ") || "No reason";

    afkUsers.set(message.author.id, { reason });

    try {
      await message.member.setNickname(`[AFK] ${message.member.displayName}`);
    } catch {}

    return message.channel.send({
      components: [container(`${message.author} is now afk`, `**Reason:** ${reason}`)],
      flags: MessageFlags.IsComponentsV2
    });
  }

  // ===== AVATAR =====
  if (cmd === "avatar") {
    const user = message.mentions.users.first() || message.author;

    return message.reply({
      components: [container(`@${user.username} avatar`, user.displayAvatarURL({ size: 1024 }))],
      flags: MessageFlags.IsComponentsV2
    });
  }

  // ===== SAY =====
  if (cmd === "say") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("Admin only");

    const channel = message.mentions.channels.first();
    if (!channel) return message.reply("Mention channel");

    const text = args.slice(1).join(" ");
    if (!text) return message.reply("Usage: .say #channel text");

    await channel.send({
      components: [container(text)],
      flags: MessageFlags.IsComponentsV2
    });

    message.delete().catch(() => {});
  }

  // ===== STEAL EMOJI =====
  if (cmd === "steal") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers))
      return message.reply("No permission");

    const emoji = args[0];
    const name = args[1];

    const match = emoji?.match(/<?a?:\w+:(\d+)>?/);
    if (!match || !name) return message.reply("Usage: .steal <emoji> <name>");

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

  // ===== STEAL STICKER =====
  if (cmd === "stealsticker") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers))
      return message.reply("No permission");

    const name = args[0];
    if (!name) return message.reply("Usage: .stealsticker <name>");

    const replied = await message.fetchReference().catch(() => null);
    if (!replied) return message.reply("Reply to sticker");

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
});

// ===== SLASH COMMANDS =====
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // AFK
  if (interaction.commandName === "afk") {
    const reason = interaction.options.getString('reason');

    afkUsers.set(interaction.user.id, { reason });

    try {
      await interaction.member.setNickname(`[AFK] ${interaction.member.displayName}`);
    } catch {}

    return interaction.reply({
      components: [container(`${interaction.user} is now afk`, `**Reason:** ${reason}`)],
      flags: MessageFlags.IsComponentsV2,
      ephemeral: true
    });
  }

  // AVATAR
  if (interaction.commandName === "avatar") {
    const user = interaction.options.getUser('user');

    return interaction.reply({
      components: [container(`@${user.username} avatar`, user.displayAvatarURL({ size: 1024 }))],
      flags: MessageFlags.IsComponentsV2,
      ephemeral: true
    });
  }

  // SAY
  if (interaction.commandName === "say") {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return interaction.reply({ content: "Admin only", ephemeral: true });

    const channel = interaction.options.getChannel('channel');
    const text = interaction.options.getString('text');

    await channel.send({
      components: [container(text)],
      flags: MessageFlags.IsComponentsV2
    });

    return interaction.reply({ content: "Sent", ephemeral: true });
  }
});

client.login(process.env.TOKEN);
