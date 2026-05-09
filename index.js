require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  ActivityType,
  PermissionsBitField,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder,
  AttachmentBuilder,
  ChannelType
} = require('discord.js');

// ================= CLIENT =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// ================= PREFIX =================
const PREFIX = '.';

// ================= STORAGE =================
const afk = new Map();
const warnings = new Map();
const welcomeChannels = new Map();
const autoRoles = new Map();

// ================= READY =================
client.once('clientReady', async () => {

  console.log(`${client.user.tag} online`);

  client.user.setPresence({
    status: 'dnd',
    activities: [{
      name: 'N3xel',
      type: ActivityType.Playing
    }]
  });

  // ================= SLASH COMMANDS =================
  const commands = [

    // AFK
    new SlashCommandBuilder()
      .setName('afk')
      .setDescription('Set AFK')
      .addStringOption(option =>
        option
          .setName('reason')
          .setDescription('Reason')
          .setRequired(true)
      ),

    // AVATAR
    new SlashCommandBuilder()
      .setName('avatar')
      .setDescription('Get avatar')
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('User')
      ),

    // SAY
    new SlashCommandBuilder()
      .setName('say')
      .setDescription('Send message')
      .addChannelOption(option =>
        option
          .setName('channel')
          .setDescription('Channel')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('text')
          .setDescription('Message')
          .setRequired(true)
      ),

    // WELCOME ENABLE
    new SlashCommandBuilder()
      .setName('welcomeenable')
      .setDescription('Enable welcome')
      .addChannelOption(option =>
        option
          .setName('channel')
          .setDescription('Channel')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      ),

    // WELCOME DISABLE
    new SlashCommandBuilder()
      .setName('welcomedisable')
      .setDescription('Disable welcome'),

    // AUTOROLE
    new SlashCommandBuilder()
      .setName('autorole')
      .setDescription('Set autorole')
      .addRoleOption(option =>
        option
          .setName('role')
          .setDescription('Role')
          .setRequired(true)
      ),

    // WARN
    new SlashCommandBuilder()
      .setName('warn')
      .setDescription('Warn user')
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('User')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('reason')
          .setDescription('Reason')
          .setRequired(true)
      ),

    // WARNINGS
    new SlashCommandBuilder()
      .setName('warnings')
      .setDescription('View warnings')
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('User')
          .setRequired(true)
      ),

    // UNWARN
    new SlashCommandBuilder()
      .setName('unwarn')
      .setDescription('Remove warning')
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('User')
          .setRequired(true)
      )
      .addIntegerOption(option =>
        option
          .setName('id')
          .setDescription('Warning ID')
          .setRequired(true)
      )

  ].map(command => command.toJSON());

  const rest = new REST({
    version: '10'
  }).setToken(process.env.TOKEN);

  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands }
  );

  console.log('Slash commands loaded');

});

// ================= WELCOME EVENT =================
client.on('guildMemberAdd', async (member) => {

  // welcome
  const welcomeChannel =
    welcomeChannels.get(member.guild.id);

  if (welcomeChannel) {

    const channel =
      member.guild.channels.cache.get(welcomeChannel);

    if (channel) {

      channel.send(
        `Welcome ${member} to **${member.guild.name}** you are the **${member.guild.memberCount}th member**!`
      );

    }

  }

  // autorole
  const roleId =
    autoRoles.get(member.guild.id);

  if (roleId) {

    const role =
      member.guild.roles.cache.get(roleId);

    if (role) {

      member.roles.add(role)
        .catch(() => {});

    }

  }

});

// ================= MESSAGE COMMANDS =================
client.on('messageCreate', async (message) => {

  if (message.author.bot) return;

  // ================= AFK MENTION =================
  message.mentions.users.forEach(user => {

    if (afk.has(user.id)) {

      const data = afk.get(user.id);

      message.reply(
        `${user.username} is AFK\nReason: ${data.reason}`
      );

    }

  });

  // ================= REMOVE AFK =================
  if (
    afk.has(message.author.id) &&
    !message.content.startsWith('.afk')
  ) {

    afk.delete(message.author.id);

    message.channel.send(
      `Welcome back ${message.author}`
    );

  }

  if (!message.content.startsWith(PREFIX))
    return;

  const args =
    message.content
      .slice(PREFIX.length)
      .trim()
      .split(/ +/);

  const cmd =
    args.shift().toLowerCase();

  // ================= AFK =================
  if (cmd === 'afk') {

    const reason =
      args.join(' ') || 'No reason';

    afk.set(message.author.id, {
      reason
    });

    return message.reply(
      `${message.author.username} is now AFK\nReason: ${reason}`
    );

  }

  // ================= AVATAR =================
  if (cmd === 'avatar') {

    const user =
      message.mentions.users.first() ||
      message.author;

    const embed =
      new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${user.username} Avatar`)
        .setImage(
          user.displayAvatarURL({
            size: 1024
          })
        );

    return message.reply({
      embeds: [embed]
    });

  }

  // ================= SAY =================
  if (cmd === 'say') {

    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) {
      return message.reply('Admin only');
    }

    const channel =
      message.mentions.channels.first();

    if (!channel) {
      return message.reply(
        'Usage: .say #channel hello'
      );
    }

    const text =
      args.slice(1).join(' ');

    if (!text) {
      return message.reply(
        'Usage: .say #channel hello'
      );
    }

    await channel.send(text);

    message.delete().catch(() => {});

  }

  // ================= WELCOME ENABLE =================
  if (cmd === 'welcomeenable') {

    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) {
      return message.reply('Admin only');
    }

    const channel =
      message.mentions.channels.first();

    if (!channel) {
      return message.reply(
        'Usage: .welcomeenable #channel'
      );
    }

    welcomeChannels.set(
      message.guild.id,
      channel.id
    );

    message.reply(
      `Welcome enabled in ${channel}`
    );

  }

  // ================= WELCOME DISABLE =================
  if (cmd === 'welcomedisable') {

    welcomeChannels.delete(
      message.guild.id
    );

    message.reply(
      'Welcome disabled'
    );

  }

  // ================= AUTOROLE =================
  if (cmd === 'autorole') {

    const role =
      message.mentions.roles.first();

    if (!role) {
      return message.reply(
        'Usage: .autorole @role'
      );
    }

    autoRoles.set(
      message.guild.id,
      role.id
    );

    message.reply(
      `Autorole set to ${role}`
    );

  }

});

// ================= SLASH COMMANDS =================
client.on('interactionCreate', async (interaction) => {

  if (!interaction.isChatInputCommand())
    return;

  // ================= AFK =================
  if (interaction.commandName === 'afk') {

    const reason =
      interaction.options.getString('reason');

    afk.set(interaction.user.id, {
      reason
    });

    return interaction.reply({
      content:
        `${interaction.user.username} is now AFK\nReason: ${reason}`
    });

  }

  // ================= AVATAR =================
  if (interaction.commandName === 'avatar') {

    const user =
      interaction.options.getUser('user') ||
      interaction.user;

    const embed =
      new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${user.username} Avatar`)
        .setImage(
          user.displayAvatarURL({
            size: 1024
          })
        );

    return interaction.reply({
      embeds: [embed]
    });

  }

  // ================= SAY =================
  if (interaction.commandName === 'say') {

    const channel =
      interaction.options.getChannel('channel');

    const text =
      interaction.options.getString('text');

    await channel.send(text);

    return interaction.reply({
      content: 'Sent',
      ephemeral: true
    });

  }

  // ================= WELCOME ENABLE =================
  if (interaction.commandName === 'welcomeenable') {

    const channel =
      interaction.options.getChannel('channel');

    welcomeChannels.set(
      interaction.guild.id,
      channel.id
    );

    return interaction.reply({
      content:
        `Welcome enabled in ${channel}`,
      ephemeral: true
    });

  }

  // ================= WELCOME DISABLE =================
  if (interaction.commandName === 'welcomedisable') {

    welcomeChannels.delete(
      interaction.guild.id
    );

    return interaction.reply({
      content:
        'Welcome disabled',
      ephemeral: true
    });

  }

  // ================= AUTOROLE =================
  if (interaction.commandName === 'autorole') {

    const role =
      interaction.options.getRole('role');

    autoRoles.set(
      interaction.guild.id,
      role.id
    );

    return interaction.reply({
      content:
        `Autorole set to ${role}`,
      ephemeral: true
    });

  }

});

client.login(process.env.TOKEN);
