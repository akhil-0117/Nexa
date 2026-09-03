const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getUser, getBalance, getTransactions, claimDaily, claimWeekly } = require('../systems/economy');
const { getXpInfo } = require('../systems/xp');
const { getRepInfo } = require('../systems/reputation');
const { getInviteStats } = require('../systems/invites');
const { getAchievements, getAllAchievements } = require('../systems/achievements');
const { getRankForXp, formatCredits, formatDateTime, formatTimestamp } = require('../utils/helpers');
const { getMemberRoleName } = require('../utils/permissions');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('account')
    .setDescription('Open your NEXAVERSE account panel')
    .addSubcommand(sub =>
      sub.setName('economy').setDescription('Open the economy panel')
    ),

  async execute(interaction) {
    const { user, guild, member } = interaction;
    const guildId = guild.id;

    // /account economy subcommand
    if (interaction.options.getSubcommand(false) === 'economy') {
      return showEconomyPanel(interaction);
    }

    const userData = getUser(user.id, guildId);
    const xpInfo = getXpInfo(user.id, guildId);
    const rank = getRankForXp(userData.total_xp);
    const repInfo = getRepInfo(user.id, guildId);
    const roleName = getMemberRoleName(member);

    const embed = new EmbedBuilder()
      .setAuthor({ name: `${user.username}'s Account`, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setTitle('📋 NEXAVERSE Account')
      .setColor(rank.color)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '⭐ Level', value: `${xpInfo.level}`, inline: true },
        { name: '🎖️ Rank', value: rank.name, inline: true },
        { name: '✨ XP', value: `${xpInfo.xp}/${xpInfo.xpNeeded}`, inline: true },
        { name: '💰 Credits', value: formatCredits(userData.credits), inline: true },
        { name: '🤝 Reputation', value: `${repInfo.score} · ${repInfo.level.label}`, inline: true },
        { name: '🏷️ Role', value: roleName, inline: true },
        { name: '💬 Messages', value: `${userData.messages}`, inline: true },
        { name: '🎮 Games Won', value: `${userData.games_won}/${userData.games_played}`, inline: true },
        { name: '🏆 Achievements', value: `${getAchievements(user.id, guildId).length}/${getAllAchievements().length}`, inline: true },
      )
      .setFooter({ text: 'NEXAVERSE • Select an option below' })
      .setTimestamp();

    const select = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('account_select')
        .setPlaceholder('Choose an option...')
        .addOptions([
          { label: 'Profile', value: 'profile', emoji: '👤', description: 'View full profile' },
          { label: 'Wallet', value: 'wallet', emoji: '💰', description: 'Check balance & transfer' },
          { label: 'Economy', value: 'economy', emoji: '📊', description: 'Daily, weekly, shop' },
          { label: 'Activity', value: 'activity', emoji: '📈', description: 'Message stats & streak' },
          { label: 'Reputation', value: 'reputation', emoji: '🤝', description: 'Trust score & restrictions' },
          { label: 'Achievements', value: 'achievements', emoji: '🏆', description: 'Unlocked achievements' },
          { label: 'Transactions', value: 'transactions', emoji: '💳', description: 'Recent transactions' },
          { label: 'Invites', value: 'invites', emoji: '📨', description: 'Invite statistics' },
        ])
    );

    await interaction.reply({ embeds: [embed], components: [select], ephemeral: true });
  },
};

async function showEconomyPanel(interaction) {
  const { user, guild } = interaction;
  const guildId = guild.id;
  const userData = getUser(user.id, guildId);
  const repInfo = getRepInfo(user.id, guildId);

  const embed = new EmbedBuilder()
    .setTitle('💰 Economy Panel')
    .setColor(config.colors.economy)
    .setDescription(`Balance: **${formatCredits(userData.credits)}**\nReputation: **${repInfo.score}** · ${repInfo.level.label}`)
    .addFields(
      { name: '📅 Daily', value: formatCredits(config.economy.dailyReward), inline: true },
      { name: '📆 Weekly', value: formatCredits(config.economy.weeklyReward), inline: true },
      { name: '💸 Transfer Fee', value: `${config.economy.transferFeePercent}%`, inline: true },
    )
    .setFooter({ text: 'NEXAVERSE Economy' })
    .setTimestamp();

  const select = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('economy_select')
      .setPlaceholder('Choose an action...')
      .addOptions([
        { label: 'Claim Daily', value: 'daily', emoji: '📅', description: 'Claim your daily reward' },
        { label: 'Claim Weekly', value: 'weekly', emoji: '📆', description: 'Claim your weekly reward' },
        { label: 'Transfer Credits', value: 'transfer', emoji: '💸', description: 'Send credits to another user' },
        { label: 'Shop', value: 'shop', emoji: '🛒', description: 'Browse the credit shop' },
        { label: 'Transactions', value: 'transactions', emoji: '💳', description: 'Recent transactions' },
        { label: 'Leaderboard', value: 'leaderboard', emoji: '🏆', description: 'Top earners' },
      ])
  );

  await interaction.reply({ embeds: [embed], components: [select], ephemeral: true });
}
