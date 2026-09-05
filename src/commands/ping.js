const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency'),

  async execute(interaction) {
    const sent = await interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('Pinging...').setDescription('Calculating latency...').setColor(config.colors.primary)
    ], fetchReply: true });

    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);

    const embed = new EmbedBuilder()
      .setTitle('Pong!')
      .setDescription(`**Bot Latency:** ${latency}ms\n**API Latency:** ${apiLatency}ms`)
      .setColor(latency < 200 ? config.colors.success : latency < 500 ? config.colors.warning : config.colors.error)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
