const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View all NEXAVERSE commands'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📖 NEXAVERSE Commands')
      .setColor(config.colors.primary)
      .setDescription('Select a category below to see available commands.')
      .addFields(
        { name: '🎮 Games', value: '`/games` — Games arcade', inline: true },
        { name: '📋 Account', value: '`/account` — Profile, wallet, stats', inline: true },
        { name: '🛡️ Moderation', value: '`/moderation` — Staff mod tools', inline: true },
        { name: '👨‍💼 Staff', value: '`/staff` — Staff panel', inline: true },
        { name: '📊 Stats', value: '`/stats` — Server statistics', inline: true },
        { name: '🛒 Shop', value: '`/shop` — Credit shop', inline: true },
        { name: '📊 Poll', value: '`/poll` — Create polls', inline: true },
        { name: '✅ Verify', value: '`/verify` — Verify account', inline: true },
        { name: '⚙️ Config', value: '`/config` — Server config (Admin)', inline: true },
        { name: '🏓 Ping', value: '`/ping` — Bot latency', inline: true },
        { name: 'ℹ️ Bot Info', value: '`/botinfo` — Bot information', inline: true },
        { name: '🌐 Server Info', value: '`/serverinfo` — Server details', inline: true },
      )
      .setFooter({ text: 'NEXAVERSE • All panels are private to you' })
      .setTimestamp();

    const select = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('help_category_select')
        .setPlaceholder('Select a category...')
        .addOptions([
          { label: 'General', value: 'general', emoji: '📖', description: 'Account, games, shop' },
          { label: 'Moderation', value: 'moderation', emoji: '🛡️', description: 'Moderation tools' },
          { label: 'Staff', value: 'staff', emoji: '👨‍💼', description: 'Staff panel & config' },
          { label: 'Utility', value: 'utility', emoji: '⚙️', description: 'Info, ping, verify' },
          { label: 'Social', value: 'social', emoji: '🤝', description: 'Achievements, invites' },
        ])
    );

    await interaction.reply({ embeds: [embed], components: [select], ephemeral: true });
  },
};
