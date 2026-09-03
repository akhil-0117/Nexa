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
      .setDescription(`**Your Level:** ${staffRole?.label || 'Staff'}\n\nSelect a category below to manage server systems.`)
      .addFields(
        { name: '🛡️ Moderation', value: 'Warn, timeout, kick, ban', inline: true },
        { name: '📋 Cases', value: 'View & manage cases', inline: true },
        { name: '🚨 Reports', value: 'Review user reports', inline: true },
        { name: '🎫 Tickets', value: 'Support tickets', inline: true },
        { name: '🔒 Security', value: 'Raid status, lockdown', inline: true },
        { name: '💰 Economy', value: 'Transactions, restrictions', inline: true },
        { name: '📋 Applications', value: 'Staff & partnership apps', inline: true },
        { name: '📜 Logs', value: 'System logs', inline: true },
      )
      .setFooter({ text: 'NEXAVERSE Staff Panel' })
      .setTimestamp();

    const select = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('staff_panel_select')
        .setPlaceholder('Choose a category...')
        .addOptions([
          { label: 'Moderation', value: 'moderation', emoji: '🛡️', description: 'Moderation tools' },
          { label: 'Cases', value: 'cases', emoji: '📋', description: 'Case management' },
          { label: 'Reports', value: 'reports', emoji: '🚨', description: 'User reports' },
          { label: 'Tickets', value: 'tickets', emoji: '🎫', description: 'Support tickets' },
          { label: 'Security', value: 'security', emoji: '🔒', description: 'Security controls' },
          { label: 'Economy', value: 'economy', emoji: '💰', description: 'Economy management' },
          { label: 'Applications', value: 'applications', emoji: '📋', description: 'Staff & partnerships' },
          { label: 'Logs', value: 'logs', emoji: '📜', description: 'System logs' },
        ])
    );

    await interaction.reply({ embeds: [embed], components: [select], ephemeral: true });
  },
};
