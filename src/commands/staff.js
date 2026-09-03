const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { isStaff, getStaffRole } = require('../utils/permissions');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff')
    .setDescription('Open the Staff Panel (Staff only)'),

  async execute(interaction) {
    const { member } = interaction;

    if (!isStaff(member)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setTitle('🔒 Access Denied').setDescription('Staff permissions required.').setColor(config.colors.error)],
        ephemeral: true,
      });
    }

    const staffRole = getStaffRole(member);

    const embed = new EmbedBuilder()
      .setTitle('👨‍💼 Staff Panel')
      .setColor(config.colors.staff)
      .setDescription(`**Your Level:** ${staffRole?.label || 'Staff'}\n\nSelect a category to manage.`)
      .setTimestamp();

    const select = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('staff_panel_select')
        .setPlaceholder('Choose a category...')
        .addOptions([
          { label: 'Moderation', value: 'moderation', emoji: '🛡️' },
          { label: 'Cases', value: 'cases', emoji: '📋' },
          { label: 'Reports', value: 'reports', emoji: '🚨' },
          { label: 'Tickets', value: 'tickets', emoji: '🎫' },
          { label: 'Security', value: 'security', emoji: '🔒' },
          { label: 'Economy', value: 'economy', emoji: '💰' },
          { label: 'Applications', value: 'applications', emoji: '📋' },
          { label: 'Logs', value: 'logs', emoji: '📜' },
        ])
    );

    await interaction.reply({ embeds: [embed], components: [select] });
  },
};
