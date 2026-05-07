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
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const PREFIX = '.';

const afkUsers = new Map();
const welcomeChannels = new Map();
const autoRoles = new Map();

function formatTime(ms) {
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000) % 60;
  const h = Math.floor(ms / 3600000);

  return `${h}h ${m}m ${s}s`;
}

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
        `**Reason:** ${reason}\n**Since:** ${time}`
      )
    );
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  client.user.setPresence({
    status: 'dnd',
    activities: [
      {
        name: 'https://discord.gg/th9EWYaCHu',
        type: ActivityType.Streaming,
        url: 'https://discord.gg/th9EWYaCHu'
      }
    ]
  });

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
      .setDescription('Get avatar')
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
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
      .addStringOption(o =>
        o.setName('text')
          .setDescription('Message')
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('welcomeenable')
      .setDescription('Enable welcome system')
      .addChannelOption(o =>
        o.setName('channel')
          .setDescription('Welcome channel')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('welcomedisable')
      .setDescription('Disable welcome system'),

    new SlashCommandBuilder()
      .setName('autorole')
      .setDescription('Set auto role')
      .addRoleOption(o =>
        o.setName('role')
          .setDescription('Role')
          .setRequired(true)
      )
  ].map(c => c.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands }
  );

  console.log('Slash commands loaded');
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // AFK mention
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

  // Remove AFK
  if (
    afkUsers.has(message.author.id) &&
    !message.content.startsWith('.afk')
  ) {
    afkUsers.delete(message.author.id);

    if (message.member?.nickname?.startsWith('[AFK] ')) {
      await message.member.setNickname(
        message.member.nickname.replace('[AFK] ', '')
      ).catch(() => {});
    }

    message.channel.send(`Welcome back ${message.author}`);
  }

  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // AFK
  if (cmd === 'afk') {
    const reason = args.join(' ') || 'No reason';

    afkUsers.set(message.author.id, {
      reason,
      time: Date.now()
    });

    try {
      await message.member.setNickname(`[AFK] ${message.member.displayName}`);
    } catch {}

    return message.channel.send({
      components: [
        afkContainer(message.author, reason, 'Just now')
      ]
    });
  }

  // Avatar
  if (cmd === 'avatar') {
    const user = message.mentions.users.first() || message.author;

    const embed = new EmbedBuilder()
      .setColor(0x000000)
      .setTitle(`${user.username} Avatar`)
      .setImage(user.displayAvatarURL({ size: 1024 }));

    return message.reply({ embeds: [embed] });
  }

  // Say
  if (cmd === 'say') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return message.reply('Admin only');

    const channel = message.mentions.channels.first();
    if (!channel) return message.reply('Mention a channel');

    const text = args.slice(1).join(' ');
    if (!text) return message.reply('Usage: .say #channel hello');

    await channel.send(text);
    message.delete().catch(() => {});
  }

  // Steal Emoji
  if (cmd === 'steal') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers))
      return message.reply('No permission');

    const emoji = args[0];
    const name = args[1];

    const match = emoji?.match(/<?a?:\w+:(\d+)>?/);

    if (!match || !name)
      return message.reply('Usage: .steal <emoji> <name>');

    const id = match[1];
    const animated = emoji.startsWith('<a:');

    const url = `https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'png'}`;

    try {
      await message.guild.emojis.create({
        attachment: url,
        name
      });

      message.reply('Emoji added');
    } catch {
      message.reply('Failed');
    }
  }

  // Steal Sticker
  if (cmd === 'stealsticker') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers))
      return message.reply('No permission');

    const name = args[0];

    if (!name)
      return message.reply('Usage: .stealsticker <name>');

    const replied = await message.fetchReference().catch(() => null);

    if (!replied)
      return message.reply('Reply to a sticker');

    const sticker = replied.stickers.first();

    if (!sticker)
      return message.reply('No sticker found');

    try {
      const file = new AttachmentBuilder(sticker.url, {
        name: 'sticker.png'
      });

      await message.guild.stickers.create({
        file,
        name,
        tags: 'sticker'
      });

      message.reply('Sticker added');
    } catch (err) {
      console.error(err);
      message.reply('Failed to add sticker');
    }
  }
});

// Welcome + Autorole
client.on('guildMemberAdd', async member => {
  const channelId = welcomeChannels.get(member.guild.id);

  if (channelId) {
    const channel = member.guild.channels.cache.get(channelId);

    if (channel) {
      const container = new ContainerBuilder()
        .setAccentColor(0x000000)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `Welcome ${member} sa n3xel!`
          )
        )
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `Ikaw na yung pang ${member.guild.memberCount} server member.`
          )
        );

      channel.send({
        components: [container]
      });
    }
  }

  const roleId = autoRoles.get(member.guild.id);

  if (roleId) {
    const role = member.guild.roles.cache.get(roleId);

    if (role) {
      member.roles.add(role).catch(() => {});
    }
  }
});

// Slash Commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  try {

    // AFK
    if (interaction.commandName === 'afk') {
      const reason = interaction.options.getString('reason');

      afkUsers.set(interaction.user.id, {
        reason,
        time: Date.now()
      });

      try {
        await interaction.member.setNickname(
          `[AFK] ${interaction.member.displayName}`
        );
      } catch {}

      return interaction.reply({
        components: [
          afkContainer(interaction.user.username, reason, 'Just now')
        ]
      });
    }

    // Avatar
    if (interaction.commandName === 'avatar') {
      const user = interaction.options.getUser('user');

      const embed = new EmbedBuilder()
        .setColor(0x000000)
        .setTitle(`${user.username} Avatar`)
        .setImage(user.displayAvatarURL({ size: 1024 }));

      return interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }

    // Say
    if (interaction.commandName === 'say') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({
          content: 'Admin only',
          ephemeral: true
        });
      }

      const channel = interaction.options.getChannel('channel');
      const text = interaction.options.getString('text');

      await channel.send(text);

      return interaction.reply({
        content: 'Sent',
        ephemeral: true
      });
    }

    // Welcome Enable
    if (interaction.commandName === 'welcomeenable') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({
          content: 'Admin only',
          ephemeral: true
        });
      }

      const channel = interaction.options.getChannel('channel');

      welcomeChannels.set(interaction.guild.id, channel.id);

      return interaction.reply({
        content: `Welcome enabled in ${channel}`,
        ephemeral: true
      });
    }

    // Welcome Disable
    if (interaction.commandName === 'welcomedisable') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({
          content: 'Admin only',
          ephemeral: true
        });
      }

      welcomeChannels.delete(interaction.guild.id);

      return interaction.reply({
        content: 'Welcome disabled',
        ephemeral: true
      });
    }

    // Autorole
    if (interaction.commandName === 'autorole') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({
          content: 'Admin only',
          ephemeral: true
        });
      }

      const role = interaction.options.getRole('role');

      autoRoles.set(interaction.guild.id, role.id);

      return interaction.reply({
        content: `Autorole set to ${role}`,
        ephemeral: true
      });
    }

  } catch (err) {
    console.error(err);

    if (!interaction.replied) {
      interaction.reply({
        content: 'Error occurred',
        ephemeral: true
      }).catch(() => {});
    }
  }
});

client.login(process.env.TOKEN);
