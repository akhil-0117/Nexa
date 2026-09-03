const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, UserSelectMenuBuilder } = require('discord.js');
const { isStaff, getStaffRole } = require('../utils/permissions');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moderation')
    .setDescription('Open the Moderation Panel (Staff only)'),

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
      .setTitle('🛡️ Moderation Panel')
      .setColor(config.colors.moderation)
      .setDescription(`**Your Level:** ${staffRole?.label || 'Staff'}\n\nSelect a member below to moderate.`)
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
