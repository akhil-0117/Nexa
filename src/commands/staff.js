const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../config');
const { isStaff } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff')
    .setDescription('Open the Staff Panel (Staff only)'),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setTitle('Staff Only').setDescription('You do not have permission to use this.').setColor(config.colors.error)],
        flags: 64,
      });
    }

    const divider = '\u2501'.repeat(32);

    const embed = new EmbedBuilder()
      .setTitle('Staff Panel')
      .setColor(config.colors.staff)
      .setDescription(`${divider}\nSelect a category below.\n${divider}`)
      .setTimestamp();

    const select = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('staff_panel_select')
        .setPlaceholder('Select a category...')
        .addOptions([
          { label: 'Moderation', value: 'moderation', description: 'Moderation tools' },
          { label: 'Cases', value: 'cases', description: 'View and manage cases' },
          { label: 'Reports', value: 'reports', description: 'User reports' },
          { label: 'Tickets', value: 'tickets', description: 'Support tickets' },
          { label: 'Security', value: 'security', description: 'Security controls' },
          { label: 'Economy', value: 'economy', description: 'Economy management' },
          { label: 'Applications', value: 'applications', description: 'Staff and partnership apps' },
          { label: 'Logs', value: 'logs', description: 'View server logs' },
        ])
    );

    await interaction.reply({ embeds: [embed], components: [select] });
  },
};
