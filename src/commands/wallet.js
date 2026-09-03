const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUser, getBalance, getTransactions } = require('../systems/economy');
const { getRepInfo } = require('../systems/reputation');
const config = require('../config');
const { formatCredits, formatTimestamp, getEffectiveMaxTransfer, getMemberRoleName } = require('../utils/helpers');

const WALLET_GIFS = [
  'https://c.tenor.com/YW9ehEp6X0kAAAAd/tenor.gif',
  'https://c.tenor.com/Z31b_uCKPVEAAAAd/tenor.gif',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wallet')
    .setDescription('Open your NEXAVERSE wallet'),

  async execute(interaction) {
    await interaction.deferReply();

    const { user, guild, member } = interaction;
    const guildId = guild.id;
    const userData = getUser(user.id, guildId);
    const repInfo = getRepInfo(user.id, guildId);
    const maxTransfer = getEffectiveMaxTransfer(userData.reputation);
    const { getStaffRole } = require('../utils/permissions');
    const staffRole = getStaffRole(member);

    const embed = new EmbedBuilder()
      .setAuthor({ name: `${user.username}'s Wallet`, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setTitle('💰 NEXAVERSE Wallet')
      .setColor(config.colors.economy)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '💰 Balance', value: formatCredits(userData.credits), inline: true },
        { name: '🤝 Reputation', value: `${repInfo.score} · ${repInfo.level.label}`, inline: true },
        { name: '📤 Max Transfer', value: formatCredits(maxTransfer), inline: true },
        { name: '💸 Sent', value: `${userData.transfers_sent}x`, inline: true },
        { name: '📥 Received', value: `${userData.transfers_received}x`, inline: true },
        { name: '📅 Daily Reward', value: formatCredits(config.economy.dailyReward), inline: true },
        { name: '📆 Weekly Reward', value: formatCredits(config.economy.weeklyReward), inline: true },
        { name: '💸 Transfer Fee', value: `${config.economy.transferFeePercent}%`, inline: true },
      )
      .setFooter({ text: 'NEXAVERSE Wallet • Transfers above 1,000 require DM OTP' })
      .setTimestamp();

    // GIF for President/Co-President
    if (staffRole && (staffRole.name === 'PRESIDENT' || staffRole.name === 'CO_PRESIDENT')) {
      embed.setImage(WALLET_GIFS[Math.floor(Math.random() * WALLET_GIFS.length)]);
    }

    const select = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('wallet_action_select')
        .setPlaceholder('Choose an action...')
        .addOptions([
          { label: 'Claim Daily', value: 'daily', emoji: '📅', description: 'Claim daily reward' },
          { label: 'Claim Weekly', value: 'weekly', emoji: '📆', description: 'Claim weekly reward' },
          { label: 'Transfer', value: 'transfer', emoji: '💸', description: 'Send credits (OTP for >1000)' },
          { label: 'Transactions', value: 'transactions', emoji: '💳', description: 'Recent activity' },
          { label: 'Leaderboard', value: 'leaderboard', emoji: '🏆', description: 'Top earners' },
        ])
    );

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('nav_wallet_back').setLabel('← Back to Account').setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({ embeds: [embed], components: [select, backRow] });
  },
};
