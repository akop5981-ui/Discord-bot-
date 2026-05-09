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
const autoReact = new Map();

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

// ================= MEMBER JOIN =================
client.on('guildMemberAdd', async (member) => {

  // WELCOME
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

  // AUTOROLE
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

// ================= MESSAGE EVENT =================
client.on('messageCreate', async (message) => {

  if (message.author.bot) return;

  // ================= AUTOREACT =================
  const react =
    autoReact.get(message.channel.id);

  if (react) {

    message.react(react)
      .catch(() => {});

  }

  // ================= AFK MENTION =================
  message.mentions.users.forEach(user => {

    if (afk.has(user.id)) {

      const data =
        afk.get(user.id);

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

    message.delete()
      .catch(() => {});

  }

  // ================= STEAL EMOJI =================
  if (cmd === 'steal') {

    const emoji = args[0];
    const name = args[1];

    if (!emoji || !name) {

      return message.reply(
        'Usage: .steal <emoji> <name>'
      );

    }

    const regex =
      /<(a)?:\w+:(\d+)>/;

    const match =
      emoji.match(regex);

    if (!match) {

      return message.reply(
        'Invalid emoji'
      );

    }

    const animated =
      match[1];

    const emojiId =
      match[2];

    const url =
      `https://cdn.discordapp.com/emojis/${emojiId}.${animated ? 'gif' : 'png'}?quality=lossless`;

    try {

      const created =
        await message.guild.emojis.create({
          attachment: url,
          name: name
        });

      message.reply(
        `Added emoji ${created}`
      );

    } catch (err) {

      console.error(err);

      message.reply(
        'Failed to steal emoji'
      );

    }

  }

  // ================= STEAL STICKER =================
  if (cmd === 'stealsticker') {

    const name = args[0];

    if (!name) {

      return message.reply(
        'Usage: .stealsticker <name>'
      );

    }

    if (!message.reference) {

      return message.reply(
        'Reply to a message with a sticker'
      );

    }

    try {

      const replied =
        await message.channel.messages.fetch(
          message.reference.messageId
        );

      const sticker =
        replied.stickers.first();

      if (!sticker) {

        return message.reply(
          'No sticker found'
        );

      }

      await message.guild.stickers.create({
        file: sticker.url,
        name: name,
        tags: 'sticker'
      });

      message.reply(
        `Sticker ${name} added`
      );

    } catch (err) {

      console.error(err);

      message.reply(
        'Failed to steal sticker'
      );

    }

  }

  // ================= WARN =================
  if (cmd === 'warn') {

    const user =
      message.mentions.users.first();

    if (!user) {

      return message.reply(
        'Usage: .warn @user reason'
      );

    }

    const reason =
      args.slice(1).join(' ') || 'No reason';

    if (!warnings.has(user.id)) {

      warnings.set(user.id, []);

    }

    const list =
      warnings.get(user.id);

    const id =
      list.length + 1;

    list.push({
      id,
      reason,
      moderator: message.author.tag
    });

    message.reply(
      `Warned ${user.tag}\nWarning ID: ${id}\nReason: ${reason}`
    );

  }

  // ================= WARNINGS =================
  if (cmd === 'warnings') {

    const user =
      message.mentions.users.first();

    if (!user) {

      return message.reply(
        'Usage: .warnings @user'
      );

    }

    const list =
      warnings.get(user.id);

    if (!list || list.length === 0) {

      return message.reply(
        'No warnings'
      );

    }

    let text = '';

    for (const warn of list) {

      text +=
        `ID: ${warn.id}\nReason: ${warn.reason}\nModerator: ${warn.moderator}\n\n`;

    }

    message.reply(text);

  }

  // ================= UNWARN =================
  if (cmd === 'unwarn') {

    const user =
      message.mentions.users.first();

    const id =
      parseInt(args[1]);

    if (!user || isNaN(id)) {

      return message.reply(
        'Usage: .unwarn @user 1'
      );

    }

    const list =
      warnings.get(user.id);

    if (!list) {

      return message.reply(
        'No warnings'
      );

    }

    const index =
      list.findIndex(
        w => w.id === id
      );

    if (index === -1) {

      return message.reply(
        'Invalid warning ID'
      );

    }

    list.splice(index, 1);

    message.reply(
      `Removed warning ${id}`
    );

  }

});

// ================= SLASH COMMANDS =================
client.on('interactionCreate', async (interaction) => {

  if (!interaction.isChatInputCommand())
    return;

  // AFK
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

  // AVATAR
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

  // SAY
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

});

client.login(process.env.TOKEN); 
