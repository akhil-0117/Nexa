const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all NEXAVERSE commands'),

  async execute(interaction) {
    const divider = '\u2501'.repeat(32);

    const embed = new EmbedBuilder()
      .setTitle('NEXAVERSE Help')
      .setColor(config.colors.primary)
      .setDescription(
        `${divider}\n` +
        '**Commands:**\n' +
        '`/account` \u2014 Your account dashboard\n' +
        '`/wallet` \u2014 Wallet and transfers\n' +
        '`/games` \u2014 Games arcade\n' +
        '`/event` \u2014 Create/manage events (Staff)\n' +
        '`/moderation` \u2014 Mod tools (Staff)\n' +
        '`/staff` \u2014 Staff panel\n' +
        '`/verify` \u2014 Verify your account\n' +
        '`/stats` \u2014 Server statistics\n' +
        '`/userinfo` \u2014 User information\n' +
        '`/ping` \u2014 Bot latency\n' +
        '`/botinfo` \u2014 Bot information\n' +
        '`/serverinfo` \u2014 Server information\n' +
        '`/poll` \u2014 Create a poll\n' +
        '`/config` \u2014 Server configuration (Admin)\n' +
        `${divider}\n` +
        'Select a category for more details.'
      )
      .setFooter({ text: 'NEXAVERSE Help' })
      .setTimestamp();

    const select = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('help_category_select')
        .setPlaceholder('Select a category...')
        .addOptions([
          { label: 'General', value: 'general', description: 'Account, wallet, games' },
          { label: 'Moderation', value: 'moderation', description: 'Mod tools and staff' },
          { label: 'Utility', value: 'utility', description: 'Ping, info, verify, poll' },
          { label: 'Staff', value: 'staff', description: 'Staff panel and config' },
        ])
    );

    await interaction.reply({ embeds: [embed], components: [select] });
  },
};
