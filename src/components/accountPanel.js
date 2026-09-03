const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUser, getBalance, getTransactions } = require('../systems/economy');
const { getXpInfo } = require('../systems/xp');
const { getRepInfo } = require('../systems/reputation');
const { getInviteStats, getTopInviters } = require('../systems/invites');
const { getAchievements, getAllAchievements } = require('../systems/achievements');
const { paginateItems, formatCredits, formatDateTime, formatTimestamp } = require('../utils/helpers');
const config = require('../config');

module.exports = {
  buttons: {
    account_profile: handleProfile,
    account_wallet: handleWallet,
    account_activity: handleActivity,
    account_reputation: handleReputation,
    account_achievements: handleAchievements,
    account_statistics: handleStatistics,
    account_transactions: handleTransactions,
    account_invites: handleInvites,
  },
};

async function handleProfile(interaction) {
  const userData = getUser(interaction.user.id, interaction.guild.id);
  const xpInfo = getXpInfo(interaction.user.id, interaction.guild.id);
  const { getRankForXp } = require('../utils/helpers');
  const rank = getRankForXp(userData.total_xp);

  const embed = new EmbedBuilder()
    .setTitle(`${interaction.user.username}'s Profile`)
    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
    .setColor(rank.color)
    .addFields(
      { name: '⭐ Level', value: `${xpInfo.level}`, inline: true },
      { name: '🎖️ Rank', value: rank.name, inline: true },
      { name: '✨ XP', value: `${xpInfo.xp}/${xpInfo.xpNeeded}`, inline: true },
      { name: '💰 Credits', value: formatCredits(userData.credits), inline: true },
      { name: '🤝 Reputation', value: `${userData.reputation}`, inline: true },
      { name: '💬 Messages', value: `${userData.messages}`, inline: true },
      { name: '🎮 Games', value: `${userData.games_played} played`, inline: true },
      { name: '🏆 Wins', value: `${userData.games_won}`, inline: true },
      { name: '📨 Invites', value: `${userData.valid_invites}`, inline: true },
    )
    .setFooter({ text: 'Profile • NEXAVERSE' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleWallet(interaction) {
  const userData = getUser(interaction.user.id, interaction.guild.id);
  const repInfo = getRepInfo(interaction.user.id, interaction.guild.id);
  const { getEffectiveMaxTransfer } = require('../utils/helpers');
  const maxTransfer = getEffectiveMaxTransfer(userData.reputation);

  const embed = new EmbedBuilder()
    .setTitle('💰 Wallet')
    .setColor(config.colors.economy)
    .addFields(
      { name: 'Balance', value: formatCredits(userData.credits), inline: true },
      { name: 'Reputation', value: `${repInfo.score} (${repInfo.level.label})`, inline: true },
      { name: 'Max Transfer', value: formatCredits(maxTransfer), inline: true },
      { name: 'Transfers Sent', value: `${userData.transfers_sent}`, inline: true },
      { name: 'Transfers Received', value: `${userData.transfers_received}`, inline: true },
    )
    .setFooter({ text: 'Wallet • NEXAVERSE' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleActivity(interaction) {
  const userData = getUser(interaction.user.id, interaction.guild.id);

  const embed = new EmbedBuilder()
    .setTitle('📊 Activity')
    .setColor(config.colors.info)
    .addFields(
      { name: 'Total Messages', value: `${userData.messages}`, inline: true },
      { name: 'Today', value: `${userData.daily_messages}`, inline: true },
      { name: 'This Week', value: `${userData.weekly_messages}`, inline: true },
      { name: 'This Month', value: `${userData.monthly_messages}`, inline: true },
      { name: 'Events Joined', value: `${userData.events_joined}`, inline: true },
      { name: 'Events Won', value: `${userData.events_won}`, inline: true },
      { name: 'Streak', value: `${userData.streak_days} days`, inline: true },
    )
    .setFooter({ text: 'Activity • NEXAVERSE' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleReputation(interaction) {
  const repInfo = getRepInfo(interaction.user.id, interaction.guild.id);

  const embed = new EmbedBuilder()
    .setTitle('🤝 Reputation')
    .setColor(repInfo.level.color)
    .addFields(
      { name: 'Score', value: `${repInfo.score}/${config.reputation.maxScore}`, inline: true },
      { name: 'Level', value: repInfo.level.label, inline: true },
    )
    .setFooter({ text: 'Reputation affects your privileges in games, economy, and more.' })
    .setTimestamp();

  if (repInfo.restrictions.length > 0) {
    embed.addFields({ name: '⚠️ Restrictions', value: repInfo.restrictions.map(r => `• ${r.replace(/_/g, ' ')}`).join('\n'), inline: false });
  } else {
    embed.addFields({ name: '✅ Privileges', value: 'No restrictions', inline: false });
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleAchievements(interaction) {
  const unlocked = getAchievements(interaction.user.id, interaction.guild.id);
  const all = getAllAchievements();

  const fields = all.map(a => ({
    name: `${a.icon} ${a.name}`,
    value: unlocked.includes(a.id) ? `✅ ${a.description}` : `🔒 ${a.description}`,
    inline: true,
  }));

  const embed = new EmbedBuilder()
    .setTitle(`🏆 Achievements (${unlocked.length}/${all.length})`)
    .setColor(config.colors.achievement)
    .addFields(fields)
    .setFooter({ text: 'Achievements • NEXAVERSE' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleStatistics(interaction) {
  const userData = getUser(interaction.user.id, interaction.guild.id);
  const xpInfo = getXpInfo(interaction.user.id, interaction.guild.id);

  const embed = new EmbedBuilder()
    .setTitle('📈 Statistics')
    .setColor(config.colors.info)
    .addFields(
      { name: 'Level', value: `${xpInfo.level}`, inline: true },
      { name: 'Total XP', value: `${userData.total_xp}`, inline: true },
      { name: 'Messages', value: `${userData.messages}`, inline: true },
      { name: 'Games Played', value: `${userData.games_played}`, inline: true },
      { name: 'Games Won', value: `${userData.games_won}`, inline: true },
      { name: 'Win Rate', value: userData.games_played > 0 ? `${Math.floor((userData.games_won / userData.games_played) * 100)}%` : 'N/A', inline: true },
      { name: 'Invites', value: `${userData.valid_invites}`, inline: true },
      { name: 'Events Joined', value: `${userData.events_joined}`, inline: true },
      { name: 'Daily Claims', value: `${userData.daily_claims}`, inline: true },
    )
    .setFooter({ text: 'Statistics • NEXAVERSE' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleTransactions(interaction) {
  const transactions = getTransactions(interaction.user.id, 10);

  if (transactions.length === 0) {
    return interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('💳 Transactions').setDescription('No transactions yet.').setColor(config.colors.info)
    ], ephemeral: true });
  }

  const fields = transactions.map(t => ({
    name: `${t.id}`,
    value: `Type: ${t.type}\nAmount: ${formatCredits(t.amount)}\nTime: ${formatTimestamp(t.created_at)}`,
    inline: true,
  }));

  const embed = new EmbedBuilder()
    .setTitle('💳 Recent Transactions')
    .setColor(config.colors.economy)
    .addFields(fields)
    .setFooter({ text: 'Transactions • NEXAVERSE' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleInvites(interaction) {
  const stats = getInviteStats(interaction.user.id, interaction.guild.id);
  const topInviters = getTopInviters(interaction.guild.id, 5);

  const embed = new EmbedBuilder()
    .setTitle('📨 Invite Stats')
    .setColor(config.colors.info)
    .addFields(
      { name: 'Valid Invites', value: `${stats.valid_invites}`, inline: true },
      { name: 'Total Invites', value: `${stats.total_invites}`, inline: true },
      { name: 'Leaves', value: `${stats.leaves}`, inline: true },
    )
    .setFooter({ text: 'Invites • NEXAVERSE' })
    .setTimestamp();

  if (topInviters.length > 0) {
    const leaderboard = topInviters.map((inv, i) => `${i + 1}. <@${inv.user_id}> - ${inv.valid_invites} invites`).join('\n');
    embed.addFields({ name: '🏆 Top Inviters', value: leaderboard, inline: false });
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
