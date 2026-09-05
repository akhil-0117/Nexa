const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const config = require('../config');
const { generateBrandBanner } = require('../utils/images');

const CATEGORIES = {
  general: {
    title: 'General',
    desc:
      '`/account` \u2014 Account dashboard and profile card\n' +
      '`/wallet` \u2014 Wallet, rewards and transfers\n' +
      '`/games` \u2014 Games arcade (7 games)\n' +
      '`/stats` \u2014 Server statistics\n' +
      '`/restore` \u2014 Owner only \u00b7 Re-invite members',
  },
  moderation: {
    title: 'Moderation',
    desc:
      '`/moderation` \u2014 Moderation panel (Staff)\n' +
      '`/staff` \u2014 Staff panel (Staff)',
  },
  utility: {
    title: 'Utility',
    desc:
      '`/verify` \u2014 Verify your account\n' +
      '`/userinfo` \u2014 User information\n' +
      '`/serverinfo` \u2014 Server information\n' +
      '`/botinfo` \u2014 Bot information\n' +
      '`/ping` \u2014 Bot latency\n' +
      '`/poll` \u2014 Create a poll',
  },
  staff: {
    title: 'Staff',
    desc:
      '`/event` \u2014 Create events (Death Note and more)\n' +
      '`/staff` \u2014 Staff panel\n' +
      '`/config` \u2014 Server configuration (Admin)',
  },
};

function homeEmbed(banner) {
  const divider = '\u2501'.repeat(32);
  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setDescription(
      `Select a category from the dropdown below to view its commands.\n\n` +
      `**Categories**\n` +
      `General \u2014 Account, wallet, games\n` +
      `Moderation \u2014 Mod tools and staff\n` +
      `Utility \u2014 Verify, info, ping, poll\n` +
      `Staff \u2014 Events, panel, config\n\n` +
      `${divider}\n` +
      `**Commands** 15 registered\n` +
      `New here? Run \`/help\` any time for the full walkthrough.\n` +
      `${divider}`
    )
    .setFooter({ text: 'developed for NEXAVERSE' })
    .setTimestamp();

  if (banner) {
    embed.setImage('attachment://banner.png');
  }
  return embed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all NEXAVERSE commands'),

  async execute(interaction) {
    await interaction.deferReply();

    const banner = await generateBrandBanner('NEXAVERSE', 'HELP CENTER');

    const select = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('help_category_select')
        .setPlaceholder('Browse commands by category...')
        .addOptions([
          { label: 'General', value: 'general', description: 'Account, wallet, games' },
          { label: 'Moderation', value: 'moderation', description: 'Mod tools and staff' },
          { label: 'Utility', value: 'utility', description: 'Ping, info, verify, poll' },
          { label: 'Staff', value: 'staff', description: 'Staff panel and config' },
        ])
    );

    const homeBtn = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('help_home').setLabel('Home').setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({ embeds: [homeEmbed(banner)], files: [banner], components: [select, homeBtn] });
  },
};

module.exports.CATEGORIES = CATEGORIES;
module.exports.homeEmbed = homeEmbed;
