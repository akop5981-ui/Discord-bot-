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

// ================= STORAGE =================
const PREFIX = '.';

const afk = new Map();
const warnings = new Map();
const welcome = new Map();
const autorole = new Map();
const autoreact = new Map();

// ================= READY =================
client.once('clientReady', async () => {

  console.log(`Logged in as ${client.user.tag}`);

  client.user.setPresence({
    status: 'dnd',
    activities: [{
      name: 'N3xel Server',
      type: ActivityType.Playing
    }]
  });

  const commands = [

    new SlashCommandBuilder()
      .setName('afk')
      .setDescription('Set AFK')
      .addStringOption(o =>
        o.setName('reason').setDescription('reason').setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('avatar')
      .setDescription('Get avatar')
      .addUserOption(o =>
        o.setName('user').setDescription('user').setRequired(false)
      ),

    new SlashCommandBuilder()
      .setName('warn')
      .setDescription('Warn user')
      .addUserOption(o =>
        o.setName('user').setDescription('user').setRequired(true)
      )
      .addStringOption(o =>
        o.setName('reason').setDescription('reason').setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('warnings')
      .setDescription('View warnings')
      .addUserOption(o =>
        o.setName('user').setDescription('user').setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('unwarn')
      .setDescription('Remove warning')
      .addUserOption(o =>
        o.setName('user').setDescription('user').setRequired(true)
      )
      .addIntegerOption(o =>
        o.setName('id').setDescription('warn id').setRequired(true)
      )

  ].map(c => c.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands }
  );

  console.log('Slash loaded');
});

// ================= WELCOME =================
client.on('guildMemberAdd', async (member) => {

  const ch = welcome.get(member.guild.id);
  if (!ch) return;

  const channel = member.guild.channels.cache.get(ch);
  if (!channel) return;

  channel.send(
    `Welcome ${member} to **${member.guild.name}** you are the **${member.guild.memberCount}th member**!`
  );

  const role = autorole.get(member.guild.id);
  if (role) {
    member.roles.add(role).catch(() => {});
  }
});

// ================= MESSAGE =================
client.on('messageCreate', async (message) => {

  if (message.author.bot) return;

  // AFK mention
  if (message.mentions.users.size) {
    message.mentions.users.forEach(u => {
      if (afk.has(u.id)) {
        message.reply(`${u.username} is AFK: ${afk.get(u.id).reason}`);
      }
    });
  }

  if (afk.has(message.author.id)) {
    afk.delete(message.author.id);
    message.channel.send(`Welcome back ${message.author}`);
  }

  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // ================= AFK =================
  if (cmd === 'afk') {
    afk.set(message.author.id, {
      reason: args.join(' ') || 'No reason'
    });
    return message.reply('You are now AFK');
  }

  // ================= WARN =================
  if (cmd === 'warn') {

    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
      return message.reply('No permission');

    const user = message.mentions.users.first();
    const reason = args.slice(1).join(' ') || 'No reason';

    if (!user) return message.reply('Mention user');

    if (!warnings.has(user.id)) warnings.set(user.id, []);

    const list = warnings.get(user.id);
    const id = list.length + 1;

    list.push({
      id,
      reason,
      moderator: message.author.tag
    });

    return message.reply(`Warned ${user.tag} | ID: ${id}`);
  }

  // ================= WARNINGS =================
  if (cmd === 'warnings') {

    const user = message.mentions.users.first();
    if (!user) return message.reply('Mention user');

    const list = warnings.get(user.id);
    if (!list || !list.length) return message.reply('No warnings');

    return message.reply(
      list.map(w => `ID:${w.id} | ${w.reason} | by ${w.moderator}`).join('\n')
    );
  }

  // ================= UNWARN =================
  if (cmd === 'unwarn') {

    const user = message.mentions.users.first();
    const id = parseInt(args[1]);

    if (!user || !id) return message.reply('Usage: .unwarn @user id');

    const list = warnings.get(user.id);
    if (!list) return message.reply('No warnings');

    const index = list.findIndex(w => w.id === id);
    if (index === -1) return message.reply('Invalid ID');

    list.splice(index, 1);

    return message.reply('Warning removed');
  }

  // ================= BAN =================
  if (cmd === 'ban') {

    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return message.reply('No permission');

    const user = message.mentions.members.first();
    const reason = args.slice(1).join(' ') || 'No reason';

    if (!user) return message.reply('Mention user');

    await user.ban({ reason });

    message.reply(`Banned ${user.user.tag}`);
  }

  // ================= KICK =================
  if (cmd === 'kick') {

    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers))
      return message.reply('No permission');

    const user = message.mentions.members.first();
    const reason = args.slice(1).join(' ') || 'No reason';

    if (!user) return message.reply('Mention user');

    await user.kick(reason);

    message.reply(`Kicked ${user.user.tag}`);
  }

  // ================= TIMEOUT =================
  if (cmd === 'timeout') {

    const user = message.mentions.members.first();
    const time = parseInt(args[1]);

    if (!user || !time) return message.reply('Usage: .timeout @user minutes');

    await user.timeout(time * 60000);

    message.reply(`Timed out ${user.user.tag}`);
  }

  // ================= UNTIMEOUT =================
  if (cmd === 'untimeout') {

    const user = message.mentions.members.first();
    if (!user) return message.reply('Mention user');

    await user.timeout(null);

    message.reply(`Untimeout ${user.user.tag}`);
  }

  // ================= UNBAN =================
  if (cmd === 'unban') {

    const id = args[0];
    if (!id) return message.reply('User ID required');

    await message.guild.members.unban(id);

    message.reply(`Unbanned ${id}`);
  }

  // ================= STEAL EMOJI =================
  if (cmd === 'steal') {

    const emoji = args[0];
    const name = args[1];

    const match = emoji?.match(/<a?:\w+:(\d+)>/);
    if (!match) return message.reply('Invalid emoji');

    const url = `https://cdn.discordapp.com/emojis/${match[1]}.png`;

    await message.guild.emojis.create({ attachment: url, name });

    message.reply('Emoji added');
  }

  // ================= STEAL STICKER =================
  if (cmd === 'stealsticker') {

    const name = args[0];
    const msg = await message.fetchReference().catch(() => null);

    if (!msg) return message.reply('Reply to sticker');

    const sticker = msg.stickers.first();
    if (!sticker) return message.reply('No sticker');

    const file = new AttachmentBuilder(sticker.url, { name: 'sticker.png' });

    await message.guild.stickers.create({
      file,
      name,
      tags: 'sticker'
    });

    message.reply('Sticker added');
  }

});

// ================= SLASH =================
client.on('interactionCreate', async (i) => {

  if (!i.isChatInputCommand()) return;

  if (i.commandName === 'warn') {

    const user = i.options.getUser('user');
    const reason = i.options.getString('reason');

    if (!warnings.has(user.id)) warnings.set(user.id, []);

    const list = warnings.get(user.id);
    const id = list.length + 1;

    list.push({ id, reason, moderator: i.user.tag });

    return i.reply({ content: `Warned ${user.tag} ID:${id}`, ephemeral: true });
  }

  if (i.commandName === 'warnings') {

    const user = i.options.getUser('user');
    const list = warnings.get(user.id);

    if (!list) return i.reply({ content: 'No warnings', ephemeral: true });

    return i.reply({
      content: list.map(w => `ID:${w.id} ${w.reason}`).join('\n'),
      ephemeral: true
    });
  }

  if (i.commandName === 'unwarn') {

    const user = i.options.getUser('user');
    const id = i.options.getInteger('id');

    const list = warnings.get(user.id);
    if (!list) return i.reply({ content: 'No warnings', ephemeral: true });

    const index = list.findIndex(w => w.id === id);
    if (index === -1) return i.reply({ content: 'Invalid ID', ephemeral: true });

    list.splice(index, 1);

    return i.reply({ content: 'Removed warning', ephemeral: true });
  }

});

client.login(process.env.TOKEN); 
