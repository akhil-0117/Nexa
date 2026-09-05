const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Show server statistics'),

  async execute(interaction) {
    const guild = interaction.guild;
    const divider = '\u2501'.repeat(32);

    const embed = new EmbedBuilder()
      .setTitle('Server Statistics')
      .setColor(config.colors.primary)
      .setDescription(`${divider}\n**Members:** ${guild.memberCount}\n**Channels:** ${guild.channels.cache.size}\n**Roles:** ${guild.roles.cache.size}\n**Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:R>\n${divider}`)
      .setFooter({ text: 'NEXAVERSE Stats' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
