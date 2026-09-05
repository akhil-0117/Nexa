const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../config');
const { isStaff, getStaffRole } = require('../utils/permissions');

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

    await interaction.deferReply();

    const staffRole = getStaffRole(interaction.member);
    const divider = '\u2501'.repeat(32);

    const embed = new EmbedBuilder()
      .setAuthor({ name: `${interaction.user.username} \u2014 Staff`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
      .setTitle('NEXAVERSE \u00b7 Staff Panel')
      .setColor(config.colors.staff)
      .setDescription(
        `${divider}\n` +
        `**Your Level** ${staffRole?.label || 'Staff'}\n\n` +
        `**Sections**\n` +
        `Moderation \u2014 Quick access to mod tools\n` +
        `Cases \u2014 Moderation case history\n` +
        `Reports \u2014 User reports\n` +
        `Tickets \u2014 Support tickets\n` +
        `Security \u2014 Raid protection and lockdown\n` +
        `Economy \u2014 Credits management\n` +
        `Applications \u2014 Staff applications\n` +
        `Logs \u2014 Server log overview\n` +
        `${divider}`
      )
      .setFooter({ text: 'NEXAVERSE Staff System' })
      .setTimestamp();

    const select = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('staff_panel_select')
        .setPlaceholder('Select a section...')
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

    await interaction.editReply({ embeds: [embed], components: [select] });
  },
};
