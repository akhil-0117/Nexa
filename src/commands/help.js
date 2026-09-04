const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View all NEXAVERSE commands'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('NEXAVERSE Commands')
      .setColor(config.colors.primary)
      .setDescription('Select a category below to see available commands.')
      .addFields(
        { name: 'Games', value: '`/games` — Games arcade', inline: true },
        { name: 'Account', value: '`/account` — Profile & stats', inline: true },
        { name: 'Wallet', value: '`/wallet` — Wallet & transfers', inline: true },
        { name: 'Moderation', value: '`/moderation` — Staff mod tools', inline: true },
        { name: 'Staff', value: '`/staff` — Staff panel', inline: true },
        { name: 'Stats', value: '`/stats` — Server statistics', inline: true },
        { name: 'Poll', value: '`/poll` — Create polls', inline: true },
        { name: 'Verify', value: '`/verify` — Verify account', inline: true },
        { name: 'Config', value: '`/config` — Server config (Admin)', inline: true },
        { name: 'Ping', value: '`/ping` — Bot latency', inline: true },
        { name: 'Bot Info', value: '`/botinfo` — Bot information', inline: true },
        { name: 'Server Info', value: '`/serverinfo` — Server details', inline: true },
      )
      .setFooter({ text: 'NEXAVERSE' })
      .setTimestamp();

    const select = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('help_category_select')
        .setPlaceholder('Select a category...')
        .addOptions([
          { label: 'General', value: 'general', emoji: '📖' },
          { label: 'Moderation', value: 'moderation', emoji: '🛡️' },
          { label: 'Staff', value: 'staff', emoji: '👨‍💼' },
          { label: 'Utility', value: 'utility', emoji: '⚙️' },
          { label: 'Social', value: 'social', emoji: '🤝' },
        ])
    );

    await interaction.reply({ embeds: [embed], components: [select] });
  },
};
