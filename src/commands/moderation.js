const { SlashCommandBuilder, EmbedBuilder, UserSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const config = require('../config');
const { isStaff, getStaffRole } = require('../utils/permissions');
const { generateDarkBanner } = require('../utils/images');

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

    await interaction.deferReply();

    const staffRole = getStaffRole(interaction.member);
    const divider = '\u2501'.repeat(32);
    const banner = await generateDarkBanner('NEXAVERSE', 'MODERATION');

    const embed = new EmbedBuilder()
      .setColor(config.colors.moderation)
      .setDescription(
        `**Staff Level** \u2014 ${staffRole?.label || 'Staff'}\n\n` +
        `Select a member from the dropdown below, then choose an action.\n` +
        `All actions are logged with your ID and a case number.\n\n` +
        `**Available Actions**\n` +
        `Warn \u2014 Issue a warning\n` +
        `Kick \u2014 Remove from server\n` +
        `Ban \u2014 Permanent ban\n` +
        `Timeout \u2014 Temporary mute\n` +
        `Reputation \u2014 Adjust trust score\n` +
        `Purge \u2014 Bulk delete messages\n` +
        `Slowmode \u2014 Set channel slowmode\n\n` +
        `${divider}\n` +
        `DMs are sent to targets automatically when possible.`
      )
      .setFooter({ text: 'NEXAVERSE Moderation System' })
      .setTimestamp();

    if (banner) {
      embed.setImage('attachment://banner.png');
    }

    const userSelect = new ActionRowBuilder().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId('mod_user_select')
        .setPlaceholder('Select a member to moderate...')
        .setMinValues(1)
        .setMaxValues(1)
    );

    await interaction.editReply({ embeds: [embed], files: [banner], components: [userSelect] });
  },
};
