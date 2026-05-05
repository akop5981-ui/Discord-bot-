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
  EmbedBuilder
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


// ===== FORMAT TIME =====
function formatTime(ms) {
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000) % 60;
  const h = Math.floor(ms / 3600000);
  return `${h}h ${m}m ${s}s`;
}

// ===== AFK CONTAINER =====
function afkBox(text, reason, time) {
  return new ContainerBuilder()
    .setAccentColor(0x2b2d31)
    .addTextDisplayComponents(t => t.setContent(text))
    .addSeparatorComponents(s => s)
    .addTextDisplayComponents(t =>
      t.setContent(`**Reason:** ${reason}\n**Since:** ${time}`)
    );
}


// ===== READY =====
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  client.user.setPresence({
    status: 'dnd',
    activities: [{ name: 'Owned by Nex', type: ActivityType.Custom }]
  });

  // ✅ FIXED SLASH COMMANDS (DESCRIPTIONS REQUIRED)
  const commands = [
    new SlashCommandBuilder()
      .setName('afk')
      .setDescription('Set your AFK status')
      .addStringOption(o =>
        o.setName('reason')
         .setDescription('Reason for AFK')
         .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('avatar')
      .setDescription('Get a user avatar')
      .addUserOption(o =>
        o.setName('user')
         .setDescription('Target user')
         .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('say')
      .setDescription('Send a message to a channel')
      .addChannelOption(o =>
        o.setName('channel')
         .setDescription('Target channel')
         .setRequired(true)
      )
      .addStringOption(o =>
        o.setName('text')
         .setDescription('Message to send')
         .setRequired(true)
      )
  ].map(c => c.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log("Slash commands registered");
  } catch (err) {
    console.error("Slash register error:", err);
  }
});


// ===== MESSAGE COMMANDS =====
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // AFK mention
  message.mentions.users.forEach(user => {
    if (afkUsers.has(user.id)) {
      const data = afkUsers.get(user.id);
      const duration = formatTime(Date.now() - data.time);

      message.reply({
        components: [afkBox(`@${user.username} is AFK`, data.reason, duration)]
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

  // AFK
  if (cmd === "afk") {
    const reason = args.join(" ") || "No reason";

    afkUsers.set(message.author.id, {
      reason,
      time: Date.now()
    });

    try {
      await message.member.setNickname(`[AFK] ${message.member.displayName}`);
    } catch {}

    return message.channel.send({
      components: [afkBox(`${message.author} is now AFK`, reason, "Just now")]
    });
  }

  // AVATAR
  if (cmd === "avatar") {
    const user = message.mentions.users.first() || message.author;

    const embed = new EmbedBuilder()
      .setColor("#000000")
      .setTitle(`${user.username} avatar`)
      .setImage(user.displayAvatarURL({ size: 1024 }));

    return message.reply({ embeds: [embed] });
  }

  // SAY
  if (cmd === "say") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("Admin only");

    const channel = message.mentions.channels.first();
    if (!channel) return message.reply("Mention channel");

    const text = args.slice(1).join(" ");
    if (!text) return message.reply("Usage: .say #channel text");

    await channel.send(text);
    message.delete().catch(() => {});
  }

  // STEAL EMOJI
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

  // STEAL STICKER
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

  try {

    // AFK
    if (interaction.commandName === "afk") {
      const reason = interaction.options.getString('reason');

      afkUsers.set(interaction.user.id, {
        reason,
        time: Date.now()
      });

      try {
        await interaction.member.setNickname(`[AFK] ${interaction.member.displayName}`);
      } catch {}

      return interaction.reply({
        components: [afkBox(`${interaction.user} is now AFK`, reason, "Just now")]
      });
    }

    // AVATAR
    if (interaction.commandName === "avatar") {
      const user = interaction.options.getUser('user');

      const embed = new EmbedBuilder()
        .setColor("#000000")
        .setTitle(`${user.username} avatar`)
        .setImage(user.displayAvatarURL({ size: 1024 }));

      return interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }

    // SAY
    if (interaction.commandName === "say") {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))
        return interaction.reply({ content: "Admin only", ephemeral: true });

      const channel = interaction.options.getChannel('channel');
      const text = interaction.options.getString('text');

      await channel.send(text);

      return interaction.reply({
        content: "Sent",
        ephemeral: true
      });
    }

  } catch (err) {
    console.error("Interaction error:", err);
    if (!interaction.replied) {
      interaction.reply({ content: "Error occurred", ephemeral: true }).catch(() => {});
    }
  }
});

client.login(process.env.TOKEN);
