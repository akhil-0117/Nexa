const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { isVerified } = require('../systems/verification');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Verify your NEXAVERSE account'),

  async execute(interaction) {
    if (isVerified(interaction.user.id, interaction.guild.id)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setTitle('✅ Already Verified').setDescription('Your account is already verified.').setColor(config.colors.success)],
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('✅ Verify Your Account')
      .setDescription('Click the button below to verify and gain full server access.')
      .setColor(config.colors.primary)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('verify_confirm').setLabel('Verify Now').setStyle(ButtonStyle.Success).setEmoji('✅')
    );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  },
};
