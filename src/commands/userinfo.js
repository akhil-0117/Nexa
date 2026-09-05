const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Show user information')
    .addUserOption(option => option.setName('user').setDescription('Target user (optional)')),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    const embed = new EmbedBuilder()
      .setTitle(target.username)
      .setColor(config.colors.primary)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setDescription(
        `**ID:** ${target.id}\n` +
        `**Bot:** ${target.bot ? 'Yes' : 'No'}\n` +
        `**Created:** <t:${Math.floor(target.createdTimestamp / 1000)}:F>\n` +
        (member ? `**Joined:** <t:${Math.floor(member.joinedTimestamp / 1000)}:F>\n` : '') +
        (member ? `**Roles:** ${member.roles.cache.filter(r => r.name !== '@everyone').size}` : '')
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
