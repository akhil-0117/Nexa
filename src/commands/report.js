const { SlashCommandBuilder, EmbedBuilder, UserSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('report')
    .setDescription('Report a user for rule violations or abuse'),

  async execute(interaction) {
    const divider = '\u2501'.repeat(32);

    const embed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setDescription(
        `${divider}\n` +
        `**NEXAVERSE Report System**\n\n` +
        `Use this to report a member for rule violations, abuse, or any concerning behavior.\n\n` +
        `**How it works:**\n` +
        `1. Select the user you want to report\n` +
        `2. Enter a reason explaining what happened\n` +
        `3. The report is logged and higher officials will review it\n` +
        `4. If action is needed, a ticket will be opened for discussion\n\n` +
        `${divider}\n` +
        `*Only submit genuine reports. False reports may result in a warning.*`
      )
      .setFooter({ text: 'NEXAVERSE Report System' })
      .setTimestamp();

    const userSelect = new ActionRowBuilder().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId('report_user_select')
        .setPlaceholder('Select the user to report...')
        .setMinValues(1)
        .setMaxValues(1)
    );

    await interaction.reply({ embeds: [embed], components: [userSelect], flags: 64 });
  },
};
