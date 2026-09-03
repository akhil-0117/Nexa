const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Open the complete Help Panel'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📚 NEXAVERSE Help')
      .setColor(config.colors.info)
      .setDescription('Welcome to **NEXAVERSE**! Use the menu below to explore commands and features.')
      .addFields(
        { name: '👤 Account', value: '```/account``` Your profile, wallet, stats, achievements', inline: true },
        { name: '💰 Economy', value: '```/economy``` Daily, weekly, transfers, shop', inline: true },
        { name: '🎮 Games', value: '```/games``` Casino games and competitions', inline: true },
        { name: '📊 Stats', value: '```/stats``` Server statistics', inline: true },
        { name: '🛡️ Moderation', value: '```/moderation``` Staff moderation tools', inline: true },
        { name: '👨‍💼 Staff', value: '```/staff``` Staff management panel', inline: true },
        { name: '🛡️ Verification', value: '```/verify``` Verify your account', inline: true },
        { name: '🎫 Tickets', value: '```/ticket``` Create a support ticket', inline: true },
        { name: '📋 Config', value: '```/config``` Server configuration (Admin)', inline: true },
      )
      .setFooter({ text: 'NEXAVERSE • All commands use interactive panels' })
      .setTimestamp();

    const select = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('help_category_select')
        .setPlaceholder('Select a category...')
        .addOptions(
          { label: 'General', value: 'general', emoji: '📖', description: 'Account, economy, games, stats' },
          { label: 'Moderation', value: 'moderation', emoji: '🛡️', description: 'Moderation tools and commands' },
          { label: 'Staff', value: 'staff', emoji: '👨‍💼', description: 'Staff management and operations' },
          { label: 'Social', value: 'social', emoji: '🤝', description: 'Giveaways, events, invites, achievements' },
          { label: 'Support', value: 'support', emoji: '🎫', description: 'Tickets, reports, appeals, applications' },
          { label: 'Security', value: 'security', emoji: '🔒', description: 'Automod, anti-spam, anti-raid, verification' },
          { label: 'Utility', value: 'utility', emoji: '⚙️', description: 'Polls, reminders, server info, bot info' },
        )
    );

    await interaction.reply({ embeds: [embed], components: [select], ephemeral: true });
  },
};
