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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const PREFIX = '.';

const afkUsers = new Map();
const autoReact = new Map();
const welcomeChannels = new Map();
const autoRoles = new Map();

// ================= READY =================
client.once('clientReady', async () => {

  console.log(`Logged in as ${client.user.tag}`);

  client.user.setPresence({
    status: 'dnd',
    activities: [
      {
        name: 'N3xel',
        type: ActivityType.Streaming,
        url: 'https://discord.gg/th9EWYaCHu'
      }
    ]
  });

  const commands = [

    new SlashCommandBuilder()
      .setName('afk')
      .setDescription('Set AFK')
      .addStringOption(option =>
        option
          .setName('reason')
          .setDescription('Reason')
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('avatar')
      .setDescription('Get avatar')
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('User')
          .setRequired(true)
      ),

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

    new SlashCommandBuilder()
      .setName('welcomedisable')
      .setDescription('Disable welcome'),

    new SlashCommandBuilder()
      .setName('autoreact')
      .setDescription('Auto react')
      .addStringOption(option =>
        option
          .setName('mode')
          .setDescription('enable or disable')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('emoji')
          .setDescription('Emoji')
          .setRequired(true)
      )
      .addChannelOption(option =>
        option
          .setName('channel')
          .setDescription('Channel')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )

  ].map(cmd => cmd.toJSON());

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

  // welcome
  const welcomeChannel =
    welcomeChannels.get(member.guild.id);

  if (welcomeChannel) {

    const channel =
      member.guild.channels.cache.get(welcomeChannel);

    if (channel) {

      await channel.send(
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

// ================= MESSAGE EVENT =================
client.on('messageCreate', async (message) => {

  if (message.author.bot) return;

  // auto react
  const reactEmoji =
    autoReact.get(message.channel.id);

  if (reactEmoji) {
    message.react(reactEmoji)
      .catch(() => {});
  }

  // afk mention
  for (const user of message.mentions.users.values()) {

    if (!afkUsers.has(user.id)) continue;

    const data =
      afkUsers.get(user.id);

    message.reply(
      `${user.username} is AFK\nReason: ${data.reason}`
    );
  }

  // remove afk
  if (
    afkUsers.has(message.author.id) &&
    !message.content.startsWith('.afk')
  ) {

    afkUsers.delete(message.author.id);

    message.channel.send(
      `Welcome back ${message.author}`
    );
  }

  if (!message.content.startsWith(PREFIX))
    return;

  const args = message.content
    .slice(PREFIX.length)
    .trim()
    .split(/ +/);

  const cmd =
    args.shift().toLowerCase();

  // ================= AFK =================
  if (cmd === 'afk') {

    const reason =
      args.join(' ') || 'No reason';

    afkUsers.set(message.author.id, {
      reason,
      time: Date.now()
    });

    return message.channel.send(
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

    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.ManageEmojisAndStickers
      )
    ) {
      return message.reply('No permission');
    }

    const emoji = args[0];
    const name = args[1];

    if (!emoji || !name) {
      return message.reply(
        'Usage: .steal <emoji> <name>'
      );
    }

    const match =
      emoji.match(/<?a?:\w+:(\d+)>?/);

    if (!match) {
      return message.reply('Invalid emoji');
    }

    const emojiId = match[1];

    const animated =
      emoji.startsWith('<a:');

    const url =
      `https://cdn.discordapp.com/emojis/${emojiId}.${animated ? 'gif' : 'png'}`;

    try {

      await message.guild.emojis.create({
        attachment: url,
        name
      });

      message.reply('Emoji added');

    } catch (err) {

      console.error(err);

      message.reply(
        'Failed to add emoji'
      );
    }
  }

  // ================= STEAL STICKER =================
  if (cmd === 'stealsticker') {

    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.ManageEmojisAndStickers
      )
    ) {
      return message.reply('No permission');
    }

    const name = args[0];

    if (!name) {
      return message.reply(
        'Usage: .stealsticker <name>'
      );
    }

    const replied =
      await message.fetchReference()
        .catch(() => null);

    if (!replied) {
      return message.reply(
        'Reply to a sticker'
      );
    }

    const sticker =
      replied.stickers.first();

    if (!sticker) {
      return message.reply(
        'No sticker found'
      );
    }

    try {

      const file =
        new AttachmentBuilder(
          sticker.url,
          {
            name: 'sticker.png'
          }
        );

      await message.guild.stickers.create({
        file,
        name,
        tags: 'sticker'
      });

      message.reply(
        'Sticker added'
      );

    } catch (err) {

      console.error(err);

      message.reply(
        'Failed to add sticker'
      );
    }
  }

  // ================= MEMBER ROLE =================
  if (cmd === 'memberrole') {

    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.ManageRoles
      )
    ) {
      return message.reply('No permission');
    }

    const user =
      message.mentions.members.first();

    const role =
      message.mentions.roles.first();

    if (!user || !role) {
      return message.reply(
        'Usage: .memberrole @user @role'
      );
    }

    await user.roles.add(role);

    message.reply(
      `Added ${role} to ${user.user.tag}`
    );
  }

  // ================= ROLE ALL =================
  if (cmd === 'roleall') {

    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) {
      return message.reply('Admin only');
    }

    const role =
      message.mentions.roles.first();

    if (!role) {
      return message.reply(
        'Usage: .roleall @role'
      );
    }

    message.guild.members.cache.forEach(member => {

      member.roles.add(role)
        .catch(() => {});
    });

    message.reply(
      `Added ${role} to everyone`
    );
  }

  // ================= AUTO ROLE =================
  if (cmd === 'autorole') {

    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.Administrator
      )
    ) {
      return message.reply('Admin only');
    }

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

  // ================= BAN =================
  if (cmd === 'ban') {

    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.BanMembers
      )
    ) {
      return message.reply('No permission');
    }

    const user =
      message.mentions.members.first();

    if (!user) {
      return message.reply(
        'Usage: .ban @user'
      );
    }

    await user.ban();

    message.reply(
      `${user.user.tag} banned`
    );
  }

  // ================= UNBAN =================
  if (cmd === 'unban') {

    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.BanMembers
      )
    ) {
      return message.reply('No permission');
    }

    const id = args[0];

    if (!id) {
      return message.reply(
        'Usage: .unban userid'
      );
    }

    await message.guild.members.unban(id);

    message.reply(
      `Unbanned ${id}`
    );
  }

  // ================= KICK =================
  if (cmd === 'kick') {

    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.KickMembers
      )
    ) {
      return message.reply('No permission');
    }

    const user =
      message.mentions.members.first();

    if (!user) {
      return message.reply(
        'Usage: .kick @user'
      );
    }

    await user.kick();

    message.reply(
      `${user.user.tag} kicked`
    );
  }

  // ================= WARN =================
  if (cmd === 'warn') {

    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.ModerateMembers
      )
    ) {
      return message.reply('No permission');
    }

    const user =
      message.mentions.users.first();

    const reason =
      args.slice(1).join(' ') || 'No reason';

    if (!user) {
      return message.reply(
        'Usage: .warn @user reason'
      );
    }

    user.send(
      `Warned in ${message.guild.name}\nReason: ${reason}`
    ).catch(() => {});

    message.reply(
      `${user.tag} warned`
    );
  }

  // ================= TIMEOUT =================
  if (cmd === 'timeout') {

    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.ModerateMembers
      )
    ) {
      return message.reply('No permission');
    }

    const user =
      message.mentions.members.first();

    const minutes =
      parseInt(args[1]);

    if (!user || isNaN(minutes)) {
      return message.reply(
        'Usage: .timeout @user 5'
      );
    }

    await user.timeout(
      minutes * 60 * 1000
    );

    message.reply(
      `${user.user.tag} timed out`
    );
  }

  // ================= UNTIMEOUT =================
  if (cmd === 'untimeout') {

    if (
      !message.member.permissions.has(
        PermissionsBitField.Flags.ModerateMembers
      )
    ) {
      return message.reply('No permission');
    }

    const user =
      message.mentions.members.first();

    if (!user) {
      return message.reply(
        'Usage: .untimeout @user'
      );
    }

    await user.timeout(null);

    message.reply(
      `${user.user.tag} untimeouted`
    );
  }

  // ================= AUTOREACT =================
  if (cmd === 'autoreact') {

    const mode = args[0];
    const emoji = args[1];
    const channel =
      message.mentions.channels.first();

    if (!mode || !emoji || !channel) {
      return message.reply(
        'Usage: .autoreact enable 😀 #channel'
      );
    }

    if (mode === 'enable') {

      autoReact.set(
        channel.id,
        emoji
      );

      return message.reply(
        `Auto react enabled in ${channel}`
      );
    }

    if (mode === 'disable') {

      autoReact.delete(
        channel.id
      );

      return message.reply(
        'Auto react disabled'
      );
    }
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

    afkUsers.set(interaction.user.id, {
      reason
    });

    return interaction.reply({
      content:
        `${interaction.user.username} is now AFK\nReason: ${reason}`,
      ephemeral: true
    });
  }

  // AVATAR
  if (interaction.commandName === 'avatar') {

    const user =
      interaction.options.getUser('user');

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
      embeds: [embed],
      ephemeral: true
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

  // WELCOME ENABLE
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

  // WELCOME DISABLE
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

  // AUTOREACT
  if (interaction.commandName === 'autoreact') {

    const mode =
      interaction.options.getString('mode');

    const emoji =
      interaction.options.getString('emoji');

    const channel =
      interaction.options.getChannel('channel');

    if (mode === 'enable') {

      autoReact.set(
        channel.id,
        emoji
      );

      return interaction.reply({
        content:
          'Auto react enabled',
        ephemeral: true
      });
    }

    if (mode === 'disable') {

      autoReact.delete(
        channel.id
      );

      return interaction.reply({
        content:
          'Auto react disabled',
        ephemeral: true
      });
    }
  }

});

client.login(process.env.TOKEN); 
