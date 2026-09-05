const { SlashCommandBuilder, EmbedBuilder, UserSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const config = require('../config');
const { isStaff } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moderation')
    .setDescription('Open the Moderation Panel (Staff only)'),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setTitle('Staff Only').setDescription('You do not have permission to use this.').setColor(config.colors.error)],
        flags: 64,
      });
    }

    const { getStaffRole } = require('../utils/permissions');
    const staffRole = getStaffRole(interaction.member);
    const divider = '\u2501'.repeat(32);

    const embed = new EmbedBuilder()
      .setTitle('Moderation Panel')
      .setColor(config.colors.moderation)
      .setDescription(`${divider}\n**Your Level:** ${staffRole?.label || 'Staff'}\n\nSelect a member below to moderate.\n${divider}`)
      .setTimestamp();

    const userSelect = new ActionRowBuilder().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId('mod_user_select')
        .setPlaceholder('Select a member to moderate...')
        .setMinValues(1)
        .setMaxValues(1)
    );

    await interaction.reply({ embeds: [embed], components: [userSelect] });
  },
};
