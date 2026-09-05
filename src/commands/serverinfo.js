const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Show server information'),

  async execute(interaction) {
    const guild = interaction.guild;

    const embed = new EmbedBuilder()
      .setTitle(guild.name)
      .setColor(config.colors.primary)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .setDescription(
        `**Owner:** <@${guild.ownerId}>\n` +
        `**Members:** ${guild.memberCount}\n` +
        `**Channels:** ${guild.channels.cache.size}\n` +
        `**Roles:** ${guild.roles.cache.size}\n` +
        `**Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:F>\n` +
        `**Boost Level:** ${guild.premiumTier || 'None'}\n` +
        `**Boosts:** ${guild.premiumSubscriptionCount || 0}`
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
