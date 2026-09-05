const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Show bot information'),

  async execute(interaction) {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const embed = new EmbedBuilder()
      .setTitle('NEXAVERSE Bot Info')
      .setColor(config.colors.primary)
      .setDescription(
        `**Version:** 2.0.0\n` +
        `**Uptime:** ${hours}h ${minutes}m ${seconds}s\n` +
        `**Node.js:** ${process.version}\n` +
        `**Servers:** ${interaction.client.guilds.cache.size}\n` +
        `**Users:** ${interaction.client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)}\n` +
        `**Ping:** ${Math.round(interaction.client.ws.ping)}ms`
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
