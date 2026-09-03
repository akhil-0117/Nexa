const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { isAdmin } = require('../utils/permissions');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Server configuration panel (Admin only)'),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ embeds: [
        new EmbedBuilder().setTitle('❌ Access Denied').setDescription('Administrator permissions required.').setColor(config.colors.error)
      ], ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('⚙️ NEXAVERSE Configuration')
      .setColor(config.colors.staff)
      .setDescription('Select a category to configure.')
      .addFields(
        { name: '💰 Economy', value: 'Daily/weekly rewards, transfer limits', inline: true },
        { name: '⭐ XP & Levels', value: 'XP rates, level thresholds', inline: true },
        { name: '🤝 Reputation', value: 'Reputation settings', inline: true },
        { name: '🛡️ Moderation', value: 'Moderation settings', inline: true },
        { name: '🤖 Automod', value: 'Automod rules', inline: true },
        { name: '🔒 Anti-Spam', value: 'Spam detection settings', inline: true },
        { name: '🚨 Anti-Raid', value: 'Raid detection settings', inline: true },
        { name: '🎮 Games', value: 'Game settings', inline: true },
        { name: '🎁 Giveaways', value: 'Giveaway settings', inline: true },
        { name: '🎫 Tickets', value: 'Ticket settings', inline: true },
        { name: '📝 Logging', value: 'Log channel settings', inline: true },
        { name: '🔔 Notifications', value: 'Notification settings', inline: true },
      )
      .setFooter({ text: 'NEXAVERSE Configuration • Changes are saved immediately' })
      .setTimestamp();

    const select = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('config_select')
        .setPlaceholder('Select a category...')
        .addOptions(
          { label: 'Economy', value: 'economy', emoji: '💰' },
          { label: 'XP & Levels', value: 'xp', emoji: '⭐' },
          { label: 'Reputation', value: 'reputation', emoji: '🤝' },
          { label: 'Moderation', value: 'moderation', emoji: '🛡️' },
          { label: 'Automod', value: 'automod', emoji: '🤖' },
          { label: 'Anti-Spam', value: 'antispam', emoji: '🔒' },
          { label: 'Anti-Raid', value: 'antiraid', emoji: '🚨' },
          { label: 'Games', value: 'games', emoji: '🎮' },
          { label: 'Giveaways', value: 'giveaways', emoji: '🎁' },
          { label: 'Tickets', value: 'tickets', emoji: '🎫' },
          { label: 'Logging', value: 'logging', emoji: '📝' },
          { label: 'Notifications', value: 'notifications', emoji: '🔔' },
        )
    );

    await interaction.reply({ embeds: [embed], components: [select], ephemeral: true });
  },
};
