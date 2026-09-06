const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../config');
const { isStaff, getStaffRole } = require('../utils/permissions');
const { generateDarkBanner } = require('../utils/images');

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
    const banner = await generateDarkBanner('NEXAVERSE', 'STAFF PANEL');

    const embed = new EmbedBuilder()
      .setColor(config.colors.staff)
      .setDescription(
        `**Staff Level** \u2014 ${staffRole?.label || 'Staff'}\n\n` +
        `**Sections**\n` +
        `\uD83D\uDD28 Moderation \u2014 Quick access to mod tools\n` +
        `\uD83D\uDCCB Cases \u2014 Moderation case history\n` +
        `\uD83D\uDEA7 Reports \u2014 User reports\n` +
        `\uD83D\uDCE6 Tickets \u2014 Support tickets\n` +
        `\uD83D\uDD12 Security \u2014 Raid protection and lockdown\n` +
        `\uD83D\uDCB3 Economy \u2014 Credits management\n` +
        `\uD83D\uDCC3 Applications \u2014 Staff applications\n` +
        `\uD83D\uDCCA Logs \u2014 Server log overview\n\n` +
        `${divider}\n` +
        `All actions are logged with your staff ID.`
      )
      .setFooter({ text: 'NEXAVERSE Staff System' })
      .setTimestamp();

    if (banner) {
      embed.setImage('attachment://banner.png');
    }

    const select = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('staff_panel_select')
        .setPlaceholder('Select a section...')
        .addOptions([
          { label: '\uD83D\uDD28 Moderation', value: 'moderation', description: 'Moderation tools' },
          { label: '\uD83D\uDCCB Cases', value: 'cases', description: 'View and manage cases' },
          { label: '\uD83D\uDEA7 Reports', value: 'reports', description: 'User reports' },
          { label: '\uD83D\uDCE6 Tickets', value: 'tickets', description: 'Support tickets' },
          { label: '\uD83D\uDD12 Security', value: 'security', description: 'Security controls' },
          { label: '\uD83D\uDCB3 Economy', value: 'economy', description: 'Economy management' },
          { label: '\uD83D\uDCC3 Applications', value: 'applications', description: 'Staff and partnership apps' },
          { label: '\uD83D\uDCCA Logs', value: 'logs', description: 'View server logs' },
        ])
    );

    await interaction.editReply({ embeds: [embed], files: [banner], components: [select] });
  },
};
