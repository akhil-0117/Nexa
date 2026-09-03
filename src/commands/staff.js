const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { isStaff, getStaffRole } = require('../utils/permissions');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff')
    .setDescription('Open the Staff Panel (Staff only)'),

  async execute(interaction) {
    const { member } = interaction;

    if (!isStaff(member)) {
      return interaction.reply({ embeds: [
        new EmbedBuilder().setTitle('❌ Access Denied').setDescription('You need staff permissions to use this.').setColor(config.colors.error)
      ], ephemeral: true });
    }

    const staffRole = getStaffRole(member);

    const embed = new EmbedBuilder()
      .setTitle('👨‍💼 NEXAVERSE Staff Panel')
      .setColor(config.colors.staff)
      .setDescription(`Welcome, **${staffRole?.label || 'Staff'}**.\nSelect a category to manage.`)
      .addFields(
        { name: '🛡️ Moderation', value: 'Warn, timeout, kick, ban, purge', inline: true },
        { name: '📋 Cases', value: 'View and manage cases', inline: true },
        { name: '🚨 Reports', value: 'View pending reports', inline: true },
        { name: '🎫 Tickets', value: 'Manage support tickets', inline: true },
        { name: '🔒 Security', value: 'Raid status, lockdown, alerts', inline: true },
        { name: '💰 Economy', value: 'Transactions, adjustments', inline: true },
        { name: '📋 Applications', value: 'Staff and partnership apps', inline: true },
        { name: '📜 Logs', value: 'View system logs', inline: true },
      )
      .setFooter({ text: 'NEXAVERSE Staff Panel • All staff actions are logged' })
      .setTimestamp();

    const select = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('staff_panel_select')
        .setPlaceholder('Select a category...')
        .addOptions(
          { label: 'Moderation', value: 'moderation', emoji: '🛡️', description: 'Warn, timeout, kick, ban' },
          { label: 'Cases', value: 'cases', emoji: '📋', description: 'View and manage cases' },
          { label: 'Reports', value: 'reports', emoji: '🚨', description: 'View pending reports' },
          { label: 'Tickets', value: 'tickets', emoji: '🎫', description: 'Manage support tickets' },
          { label: 'Security', value: 'security', emoji: '🔒', description: 'Raid status, lockdown' },
          { label: 'Economy', value: 'economy', emoji: '💰', description: 'Transactions, adjustments' },
          { label: 'Applications', value: 'applications', emoji: '📋', description: 'Staff and partnership apps' },
          { label: 'Logs', value: 'logs', emoji: '📜', description: 'View system logs' },
        )
    );

    await interaction.reply({ embeds: [embed], components: [select], ephemeral: true });
  },
};
