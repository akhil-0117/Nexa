const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Start verification to access the server'),

  async execute(interaction) {
    const { isVerified } = require('../systems/verification');

    if (isVerified(interaction.user.id, interaction.guild.id)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setTitle('Already Verified').setDescription('Your account is already verified.').setColor(config.colors.success)],
        ephemeral: true,
      });
    }

    const divider = '\u2501'.repeat(32);

    const embed = new EmbedBuilder()
      .setTitle('NEXAVERSE Verification')
      .setColor(config.colors.primary)
      .setDescription(
        `${divider}\n` +
        'Welcome! To gain access to the server, you need to verify your account.\n\n' +
        '**How it works:**\n' +
        '1. Click **Begin Verification** below\n' +
        '2. A **6-digit OTP** will be sent to your DMs\n' +
        '3. Enter the OTP in the server to complete verification\n\n' +
        'Make sure your DMs are open from server members.\n' +
        `${divider}`
      )
      .setFooter({ text: 'NEXAVERSE Verification' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('verify_confirm').setLabel('Begin Verification').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('verify_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
