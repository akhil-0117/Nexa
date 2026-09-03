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
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('🔐 NEXAVERSE Verification')
      .setDescription('To gain full access to the server, complete verification below.\n\nThis confirms you are a real member and not a bot.')
      .setColor(config.colors.primary)
      .addFields(
        { name: '📋 Step 1', value: 'Click the **Verify** button below' },
        { name: '✅ Step 2', value: 'Confirm in the popup that appears' },
        { name: '🎉 Done', value: 'You will receive the Verified role automatically' },
      )
      .setFooter({ text: 'NEXAVERSE Verification System' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('verify_confirm').setLabel('Begin Verification').setStyle(ButtonStyle.Success).setEmoji('🔐')
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
