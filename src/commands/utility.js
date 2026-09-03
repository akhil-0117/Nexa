const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDb } = require('../database/init');
const config = require('../config');
const { formatDateTime, formatTimestamp } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency'),

  async execute(interaction) {
    const sent = await interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('🏓 Pinging...').setColor(config.colors.info).setTimestamp()
    ], fetchReply: true });

    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);

    await interaction.editReply({ embeds: [
      new EmbedBuilder()
        .setTitle('🏓 Pong!')
        .setColor(config.colors.success)
        .addFields(
          { name: 'Bot Latency', value: `${latency}ms`, inline: true },
          { name: 'API Latency', value: `${apiLatency}ms`, inline: true },
        )
        .setTimestamp()
    ] });
  },
};

module.exports.subcommands = {
  avatar: {
    data: new SlashCommandBuilder()
      .setName('avatar')
      .setDescription('Get a user avatar')
      .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(false)),
    async execute(interaction) {
      const target = interaction.options.getUser('user') || interaction.user;
      const embed = new EmbedBuilder()
        .setTitle(`${target.username}'s Avatar`)
        .setImage(target.displayAvatarURL({ dynamic: true, size: 1024 }))
        .setColor(config.colors.info)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    },
  },

  userinfo: {
    data: new SlashCommandBuilder()
      .setName('userinfo')
      .setDescription('Get info about a user')
      .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(false)),
    async execute(interaction) {
      const target = interaction.options.getMember('user') || interaction.member;
      const user = target.user;
      const embed = new EmbedBuilder()
        .setTitle(`${user.username}'s Info`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setColor(config.colors.info)
        .addFields(
          { name: 'Username', value: user.username, inline: true },
          { name: 'ID', value: user.id, inline: true },
          { name: 'Bot', value: user.bot ? 'Yes' : 'No', inline: true },
          { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
          { name: 'Joined Server', value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>`, inline: true },
          { name: 'Roles', value: target.roles.cache.filter(r => r.name !== '@everyone').map(r => r.toString()).join(', ') || 'None', inline: false },
        )
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    },
  },

  serverinfo: {
    data: new SlashCommandBuilder()
      .setName('serverinfo')
      .setDescription('Get server information'),
    async execute(interaction) {
      const { guild } = interaction;
      const embed = new EmbedBuilder()
        .setTitle(`${guild.name} Info`)
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .setColor(config.colors.info)
        .addFields(
          { name: 'Name', value: guild.name, inline: true },
          { name: 'ID', value: guild.id, inline: true },
          { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
          { name: 'Members', value: `${guild.memberCount}`, inline: true },
          { name: 'Channels', value: `${guild.channels.cache.size}`, inline: true },
          { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
          { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
          { name: 'Boost Level', value: `${guild.premiumTier || 0}`, inline: true },
          { name: 'Boosts', value: `${guild.premiumSubscriptionCount || 0}`, inline: true },
        )
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    },
  },

  botinfo: {
    data: new SlashCommandBuilder()
      .setName('botinfo')
      .setDescription('Get bot information'),
    async execute(interaction) {
      const client = interaction.client;
      const embed = new EmbedBuilder()
        .setTitle('🤖 NEXAVERSE Bot Info')
        .setColor(config.colors.primary)
        .addFields(
          { name: 'Name', value: 'NEXAVERSE', inline: true },
          { name: 'Servers', value: `${client.guilds.cache.size}`, inline: true },
          { name: 'Users', value: `${client.users.cache.size}`, inline: true },
          { name: 'Commands', value: `${client.commands.size}`, inline: true },
          { name: 'Uptime', value: `${Math.floor(client.uptime / 60000)}m`, inline: true },
          { name: 'Ping', value: `${client.ws.ping}ms`, inline: true },
          { name: 'Runtime', value: `Node.js ${process.version}`, inline: true },
          { name: 'Discord.js', value: `v${require('discord.js').version}`, inline: true },
        )
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    },
  },

  remind: {
    data: new SlashCommandBuilder()
      .setName('remind')
      .setDescription('Set a reminder')
      .addStringOption(opt => opt.setName('time').setDescription('Duration (e.g. 10m, 1h, 1d)').setRequired(true))
      .addStringOption(opt => opt.setName('message').setDescription('Reminder message').setRequired(true)),
    async execute(interaction) {
      const { getDb: getDbFn } = require('../database/init');
      const db = getDbFn();
      const { parseDuration } = require('../utils/helpers');
      const time = interaction.options.getString('time');
      const message = interaction.options.getString('message');
      const durationMs = parseDuration(time);

      if (durationMs <= 0 || durationMs > 30 * 24 * 60 * 60 * 1000) {
        return interaction.reply({ embeds: [
          new EmbedBuilder().setTitle('❌ Invalid Duration').setDescription('Duration must be between 1s and 30d.').setColor(config.colors.error)
        ], ephemeral: true });
      }

      db.prepare('INSERT INTO reminders (user_id, channel_id, message, remind_at, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(interaction.user.id, interaction.channel.id, message, Date.now() + durationMs, Date.now());

      await interaction.reply({ embeds: [
        new EmbedBuilder()
          .setTitle('⏰ Reminder Set')
          .setDescription(`I'll remind you in **${time}**: ${message}`)
          .setColor(config.colors.success)
          .setTimestamp()
      ], ephemeral: true });
    },
  },
};
