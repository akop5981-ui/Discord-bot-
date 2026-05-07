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
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ChannelType
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const PREFIX = '.';

const afkUsers = new Map();
const welcomeChannels = new Map();
const autoRoles = new Map();
const autoReact = new Map();
const stickyMessages = new Map();

// TIME FORMAT
function formatTime(ms) {
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000) % 60;
  const h = Math.floor(ms / 3600000);
  return `${h}h ${m}m ${s}s`;
}

// AFK CONTAINER
function afkContainer(user, reason, time) {
  return new ContainerBuilder()
    .setAccentColor(0x000000)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${user} is now AFK`)
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Reason:** ${reason}\n**Time:** ${time}`
      )
    );
}

// READY
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  client.user.setPresence({
    status: 'dnd',
    activities: [
      {
        name: 'N3xel Server',
        type: ActivityType.Streaming,
        url: 'https://discord.gg/th9EWYaCHu'
      }
    ]
  });

  const commands = [
    new SlashCommandBuilder()
      .setName('afk')
      .setDescription('AFK system')
      .addStringOption(o =>
        o.setName('reason').setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('avatar')
      .setDescription('Get avatar')
      .addUserOption(o => o.setName('user').setRequired(true)),

    new SlashCommandBuilder()
      .setName('say')
      .setDescription('Send message')
      .addChannelOption(o =>
        o.setName('channel').setRequired(true)
      )
      .addStringOption(o =>
        o.setName('text').setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('stick')
      .setDescription('Sticky message')
      .addChannelOption(o => o.setName('channel').setRequired(true))
      .addStringOption(o => o.setName('text').setRequired(true)),

    new SlashCommandBuilder()
      .setName('autoreact')
      .setDescription('Auto react system')
      .addStringOption(o =>
        o.setName('mode').setRequired(true)
      )
      .addStringOption(o =>
        o.setName('emoji').setRequired(true)
      )
      .addChannelOption(o =>
        o.setName('channel').setRequired(true)
      )
  ].map(c => c.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands }
  );

  console.log('Slash commands loaded');
});

// MESSAGE EVENTS
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // AUTO REACT (SAFE)
  const react = autoReact.get(message.channel.id);
  if (react) {
    message.react(react).catch(() => {});
  }

  // AFK MENTION CHECK
  for (const user of message.mentions.users.values()) {
    if (!afkUsers.has(user.id)) continue;

    const data = afkUsers.get(user.id);
    const time = formatTime(Date.now() - data.time);

    message.reply({
      components: [
        afkContainer(user.username, data.reason, time)
      ]
    });
  }

  // REMOVE AFK
  if (afkUsers.has(message.author.id) && !message.content.startsWith('.afk')) {
    afkUsers.delete(message.author.id);
    message.channel.send(`Welcome back ${message.author}`);
  }

  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(1).split(/ +/);
  const cmd = args.shift().toLowerCase();

  // AFK
  if (cmd === 'afk') {
    const reason = args.join(' ') || 'No reason';

    afkUsers.set(message.author.id, {
      reason,
      time: Date.now()
    });

    return message.channel.send({
      components: [
        afkContainer(message.author.username, reason, 'Now')
      ]
    });
  }

  // SAY
  if (cmd === 'say') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return;

    const channel = message.mentions.channels.first();
    const text = args.slice(1).join(' ');

    if (!channel || !text) return;

    channel.send(text);
    message.delete().catch(() => {});
  }

  // STICKY
  if (cmd === 'stick') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages))
      return;

    const channel = message.mentions.channels.first();
    const text = args.slice(1).join(' ');

    if (!channel || !text) return;

    const msg = await channel.send(`📌 ${text}`);
    stickyMessages.set(channel.id, msg.id);
  }

  // AUTOREACT PREFIX
  if (cmd === 'autoreact') {
    const mode = args[0];
    const emoji = args[1];
    const channel = message.mentions.channels.first();

    if (!mode || !emoji || !channel) return;

    if (mode === 'enable') {
      autoReact.set(channel.id, emoji);
    }

    if (mode === 'disable') {
      autoReact.delete(channel.id);
    }
  }
});

// SLASH COMMANDS
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'afk') {
    const reason = interaction.options.getString('reason');

    afkUsers.set(interaction.user.id, {
      reason,
      time: Date.now()
    });

    return interaction.reply({
      components: [afkContainer(interaction.user.username, reason, 'Now')],
      ephemeral: true
    });
  }

  if (interaction.commandName === 'avatar') {
    const user = interaction.options.getUser('user');

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setImage(user.displayAvatarURL({ size: 1024 }));

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (interaction.commandName === 'say') {
    const channel = interaction.options.getChannel('channel');
    const text = interaction.options.getString('text');

    channel.send(text);
    return interaction.reply({ content: 'Sent', ephemeral: true });
  }

  if (interaction.commandName === 'stick') {
    const channel = interaction.options.getChannel('channel');
    const text = interaction.options.getString('text');

    const msg = await channel.send(`📌 ${text}`);
    stickyMessages.set(channel.id, msg.id);

    return interaction.reply({ content: 'Sticky set', ephemeral: true });
  }

  if (interaction.commandName === 'autoreact') {
    const mode = interaction.options.getString('mode');
    const emoji = interaction.options.getString('emoji');
    const channel = interaction.options.getChannel('channel');

    if (mode === 'enable') {
      autoReact.set(channel.id, emoji);
      return interaction.reply({ content: 'Enabled', ephemeral: true });
    }

    if (mode === 'disable') {
      autoReact.delete(channel.id);
      return interaction.reply({ content: 'Disabled', ephemeral: true });
    }
  }
});

client.login(process.env.TOKEN);
