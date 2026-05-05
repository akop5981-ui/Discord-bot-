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


// ================= TIME FORMAT =================
function formatTime(ms) {
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000) % 60;
  const h = Math.floor(ms / 3600000);
  return `${h}h ${m}m ${s}s`;
}


// ================= AFK CONTAINER =================
function afkBox(title, reason, time) {
  return new ContainerBuilder()
    .setAccentColor(0x2b2d31)
    .addTextDisplayComponents(t => t.setContent(title))
    .addSeparatorComponents(s => s)
    .addTextDisplayComponents(t =>
      t.setContent(`**Reason:** ${reason}\n**Since:** ${time}`)
    );
}


// ================= READY =================
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  client.user.setPresence({
    status: 'dnd',
    activities: [{ name: 'https://discord.gg/th9EWYaCHu', type: ActivityType.Custom }]
  });

  // Slash Commands
  const commands = [
    new SlashCommandBuilder()
      .setName('afk')
      .setDescription('Set AFK')
      .addStringOption(o =>
        o.setName('reason')
         .setDescription('Reason')
         .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('avatar')
      .setDescription('Get user avatar')
      .addUserOption(o =>
        o.setName('user')
         .setDescription('User')
         .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('say')
      .setDescription('Send message')
      .addChannelOption(o =>
        o.setName('channel')
         .setDescription('Channel')
         .setRequired(true)
      )
      .addStringOption(o =>
        o.setName('text')
         .setDescription('Message')
         .setRequired(true)
      )
  ].map(c => c.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands }
  );

  console.log("Slash commands ready");
});


// ================= MESSAGE COMMANDS =================
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // ===== AFK MENTION CHECK =====
  message.mentions.users.forEach(user => {
    if (afkUsers.has(user.id)) {
      const data = afkUsers.get(user.id);
      const duration = formatTime(Date.now() - data.time);

      message.reply({
        components: [
          afkBox(`@${user.username} is AFK`, data.reason, duration)
        ]
      });
    }
  });

  // ===== REMOVE AFK (FIXED) =====
  if (afkUsers.has(message.author.id) && !message.content.startsWith(PREFIX + "afk")) {
    afkUsers.delete(message.author.id);

    if (message.member?.nickname?.startsWith("[AFK] ")) {
      await message.member.setNickname(
        message.member.nickname.replace("[AFK] ", "")
      ).catch(() => {});
    }

    message.reply("Welcome back, AFK removed");
  }

  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // ================= AFK =================
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
      components: [
        afkBox(`${message.author} is now AFK`, reason, "Just now")
      ]
    });
  }

  // ================= AVATAR =================
  if (cmd === "avatar") {
    const user = message.mentions.users.first() || message.author;

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setTitle(`${user.username} avatar`)
      .setImage(user.displayAvatarURL({ size: 1024 }));

    return message.reply({ embeds: [embed] });
  }

  // ================= SAY =================
  if (cmd === "say") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply("Admin only");

    const channel = message.mentions.channels.first();
    if (!channel) return message.reply("Mention a channel");

    const text = args.slice(1).join(" ");
    if (!text) return message.reply("Usage: .say #channel text");

    await channel.send(text);
    message.delete().catch(() => {});
  }
});


// ================= SLASH COMMANDS =================
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {

    // ===== AFK =====
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
        components: [
          afkBox(`${interaction.user} is now AFK`, reason, "Just now")
        ]
      });
    }

    // ===== AVATAR =====
    if (interaction.commandName === "avatar") {
      const user = interaction.options.getUser('user');

      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${user.username} avatar`)
        .setImage(user.displayAvatarURL({ size: 1024 }));

      return interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }

    // ===== SAY =====
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
    console.error(err);
    if (!interaction.replied) {
      interaction.reply({ content: "Error occurred", ephemeral: true }).catch(() => {});
    }
  }
});

client.login(process.env.TOKEN); 
