const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { getUser, claimDaily, claimWeekly, getBalance, getTransactions } = require('../systems/economy');
const { getRepInfo } = require('../systems/reputation');
const config = require('../config');
const { formatCredits, getReputationLevel, getEffectiveMaxTransfer } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('economy')
    .setDescription('Open the Economy Panel'),

  async execute(interaction) {
    const { user, guild } = interaction;
    const guildId = guild.id;
    const userData = getUser(user.id, guildId);
    const repInfo = getRepInfo(user.id, guildId);
    const balance = getBalance(user.id, guildId);
    const maxTransfer = getEffectiveMaxTransfer(userData.reputation);

    const embed = new EmbedBuilder()
      .setTitle('💰 NEXAVERSE Economy')
      .setColor(config.colors.economy)
      .setDescription(`Welcome to the economy panel, **${user.username}**!`)
      .addFields(
        { name: '💰 Balance', value: formatCredits(balance), inline: true },
        { name: '🤝 Reputation', value: `${repInfo.score} (${repInfo.level.label})`, inline: true },
        { name: '📤 Max Transfer', value: formatCredits(maxTransfer), inline: true },
        { name: '📊 Daily Reward', value: formatCredits(config.economy.dailyReward), inline: true },
        { name: '📊 Weekly Reward', value: formatCredits(config.economy.weeklyReward), inline: true },
        { name: '💸 Transfer Fee', value: `${config.economy.transferFeePercent}%`, inline: true },
      )
      .setFooter({ text: 'NEXAVERSE Economy • Earn, spend, and transfer Credits' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('economy_daily').setLabel('Daily').setStyle(ButtonStyle.Success).setEmoji('📅'),
      new ButtonBuilder().setCustomId('economy_weekly').setLabel('Weekly').setStyle(ButtonStyle.Success).setEmoji('📆'),
      new ButtonBuilder().setCustomId('economy_transfer').setLabel('Transfer').setStyle(ButtonStyle.Primary).setEmoji('💸'),
      new ButtonBuilder().setCustomId('economy_shop').setLabel('Shop').setStyle(ButtonStyle.Primary).setEmoji('🛒'),
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('economy_transactions').setLabel('Transactions').setStyle(ButtonStyle.Secondary).setEmoji('💳'),
      new ButtonBuilder().setCustomId('economy_leaderboard').setLabel('Leaderboard').setStyle(ButtonStyle.Secondary).setEmoji('🏆'),
    );

    await interaction.reply({ embeds: [embed], components: [row, row2], ephemeral: true });
  },
};
