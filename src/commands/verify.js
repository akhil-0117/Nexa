const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { canVerify, verifyUser, isVerified } = require('../systems/verification');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Verify your account'),

  async execute(interaction) {
    const { member, guild } = interaction;

    if (isVerified(interaction.user.id, guild.id)) {
      return interaction.reply({ embeds: [
        new EmbedBuilder().setTitle('✅ Already Verified').setDescription('Your account is already verified!').setColor(config.colors.success)
      ], ephemeral: true });
    }

    const check = canVerify(member, guild.id);
    if (!check.allowed) {
      return interaction.reply({ embeds: [
        new EmbedBuilder().setTitle('❌ Verification Blocked').setDescription(check.reason).setColor(config.colors.error)
      ], ephemeral: true });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('verify_confirm')
        .setLabel('Verify Account')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅')
    );

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🔐 Verification')
          .setDescription('Click the button below to verify your account.\nVerification grants access to server features.')
          .setColor(config.colors.info)
          .setTimestamp()
      ],
      components: [row],
      ephemeral: true,
    });
  },
};
