const {
  Client,
  GatewayIntentBits,
  ActivityType,
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

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  client.user.setPresence({
    status: 'dnd',
    activities: [{
      name: '.gg/blackroom | owned by @azairoxc',
      type: ActivityType.Custom
    }]
  });

  // register slash
  const commands = [
    new SlashCommandBuilder()
      .setName('afk')
      .setDescription('Set AFK')
      .addStringOption(opt =>
        opt.setName('reason')
          .setDescription('Reason')
          .setRequired(true))
  ].map(c => c.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands }
  );
});

// function to build container
function afkContainer(textTop, reason) {
  return new ContainerBuilder()
    .setAccentColor(0x2b2d31)
    .addTextDisplayComponents(t =>
      t.setContent(textTop)
    )
    .addSeparatorComponents(s => s)
    .addTextDisplayComponents(t =>
      t.setContent(`**Reason:** ${reason}`)
    );
}

// MESSAGE EVENT
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // mention check
  message.mentions.users.forEach(user => {
    if (afkUsers.has(user.id)) {
      const data = afkUsers.get(user.id);

      const container = afkContainer(
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

    if (message.member.nickname?.startsWith("[AFK] ")) {
      await message.member.setNickname(
        message.member.nickname.replace("[AFK] ", "")
      ).catch(() => {});
    }

    const container = new ContainerBuilder()
      .setAccentColor(0x2b2d31)
      .addTextDisplayComponents(t =>
        t.setContent("You are no longer AFK")
      );

    message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }

  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // PREFIX AFK
  if (cmd === "afk") {
    const reason = args.join(" ") || "No reason";

    afkUsers.set(message.author.id, { reason });

    try {
      await message.member.setNickname(`[AFK] ${message.member.displayName}`);
    } catch {}

    const container = afkContainer(
      `${message.author} is now afk`,
      reason
    );

    message.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
});

// SLASH AFK
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'afk') {
    const reason = interaction.options.getString('reason');

    afkUsers.set(interaction.user.id, { reason });

    try {
      await interaction.member.setNickname(`[AFK] ${interaction.member.displayName}`);
    } catch {}

    const container = afkContainer(
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
