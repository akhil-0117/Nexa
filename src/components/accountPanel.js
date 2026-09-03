const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { getUser, getBalance, getTransactions, claimDaily, claimWeekly } = require('../systems/economy');
const { getXpInfo } = require('../systems/xp');
const { getRepInfo } = require('../systems/reputation');
const { getInviteStats, getTopInviters } = require('../systems/invites');
const { getAchievements, getAllAchievements } = require('../systems/achievements');
const { formatCredits, formatTimestamp, backToMainMenu } = require('../utils/helpers');
const { getMemberRoleName } = require('../utils/permissions');
const { log } = require('../systems/logging');
const config = require('../config');

module.exports = {
  selectMenus: {
    account_select: handleAccountSelect,
    economy_select: handleEconomySelect,
    wallet_action_select: handleWalletAction,
  },
  buttons: {
    nav_account_back: (interaction) => backToMainMenu(interaction),
  },
};

function backRow(customId = 'nav_account_back') {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(customId).setLabel('← Back').setStyle(ButtonStyle.Secondary)
  );
}

async function handleAccountSelect(interaction) {
  const value = interaction.values[0];
  const { user, guild, member } = interaction;
  const guildId = guild.id;

  switch (value) {
    case 'profile': {
      const userData = getUser(user.id, guildId);
      const xpInfo = getXpInfo(user.id, guildId);
      const { getRankForXp } = require('../utils/helpers');
      const rank = getRankForXp(userData.total_xp);
      const roleName = getMemberRoleName(member);

      const embed = new EmbedBuilder()
        .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .setTitle('👤 Profile')
        .setColor(rank.color)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '⭐ Level', value: `${xpInfo.level}`, inline: true },
          { name: '🎖️ Rank', value: rank.name, inline: true },
          { name: '✨ XP', value: `${xpInfo.xp}/${xpInfo.xpNeeded}`, inline: true },
          { name: '💰 Credits', value: formatCredits(userData.credits), inline: true },
          { name: '🤝 Reputation', value: `${userData.reputation}`, inline: true },
          { name: '🏷️ Role', value: roleName, inline: true },
          { name: '💬 Messages', value: `${userData.messages}`, inline: true },
          { name: '🎮 Win Rate', value: userData.games_played > 0 ? `${Math.floor((userData.games_won / userData.games_played) * 100)}%` : 'N/A', inline: true },
          { name: '📨 Invites', value: `${userData.valid_invites}`, inline: true },
        )
        .setTimestamp();

      await interaction.update({ embeds: [embed], components: [backRow()] });
      break;
    }

    case 'wallet': {
      const userData = getUser(user.id, guildId);
      const repInfo = getRepInfo(user.id, guildId);
      const { getEffectiveMaxTransfer } = require('../utils/helpers');
      const maxTransfer = getEffectiveMaxTransfer(userData.reputation);

      const embed = new EmbedBuilder()
        .setTitle('💰 Wallet')
        .setColor(config.colors.economy)
        .addFields(
          { name: 'Balance', value: formatCredits(userData.credits), inline: true },
          { name: 'Reputation', value: `${repInfo.score} · ${repInfo.level.label}`, inline: true },
          { name: 'Max Transfer', value: formatCredits(maxTransfer), inline: true },
          { name: 'Sent', value: `${userData.transfers_sent}x`, inline: true },
          { name: 'Received', value: `${userData.transfers_received}x`, inline: true },
        )
        .setTimestamp();

      const select = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('wallet_action_select')
          .setPlaceholder('Choose an action...')
          .addOptions([
            { label: 'Transfer Credits', value: 'transfer', emoji: '💸' },
          ])
      );

      await interaction.update({ embeds: [embed], components: [select, backRow()] });
      break;
    }

    case 'economy': {
      const userData = getUser(user.id, guildId);
      const repInfo = getRepInfo(user.id, guildId);

      const embed = new EmbedBuilder()
        .setTitle('💰 Economy Panel')
        .setColor(config.colors.economy)
        .setDescription(`**Balance:** ${formatCredits(userData.credits)}\n**Reputation:** ${repInfo.score} · ${repInfo.level.label}`)
        .addFields(
          { name: '📅 Daily', value: formatCredits(config.economy.dailyReward), inline: true },
          { name: '📆 Weekly', value: formatCredits(config.economy.weeklyReward), inline: true },
          { name: '💸 Fee', value: `${config.economy.transferFeePercent}%`, inline: true },
        )
        .setTimestamp();

      const select = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('economy_select')
          .setPlaceholder('Choose an action...')
          .addOptions([
            { label: 'Claim Daily', value: 'daily', emoji: '📅' },
            { label: 'Claim Weekly', value: 'weekly', emoji: '📆' },
            { label: 'Transfer', value: 'transfer', emoji: '💸' },
            { label: 'Shop', value: 'shop', emoji: '🛒' },
            { label: 'Transactions', value: 'transactions', emoji: '💳' },
            { label: 'Leaderboard', value: 'leaderboard', emoji: '🏆' },
          ])
      );

      await interaction.update({ embeds: [embed], components: [select, backRow()] });
      break;
    }

    case 'activity': {
      const userData = getUser(user.id, guildId);

      const embed = new EmbedBuilder()
        .setTitle('📈 Activity')
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
        .setTimestamp();

      await interaction.update({ embeds: [embed], components: [backRow()] });
      break;
    }

    case 'reputation': {
      const repInfo = getRepInfo(user.id, guildId);

      const embed = new EmbedBuilder()
        .setTitle('🤝 Reputation')
        .setColor(repInfo.level.color)
        .addFields(
          { name: 'Score', value: `${repInfo.score}/${config.reputation.maxScore}`, inline: true },
          { name: 'Level', value: repInfo.level.label, inline: true },
        )
        .setTimestamp();

      if (repInfo.restrictions.length > 0) {
        embed.addFields({ name: '⚠️ Restrictions', value: repInfo.restrictions.map(r => `• ${r.replace(/_/g, ' ')}`).join('\n') });
      } else {
        embed.addFields({ name: '✅ Status', value: 'No restrictions — full access' });
      }

      await interaction.update({ embeds: [embed], components: [backRow()] });
      break;
    }

    case 'achievements': {
      const unlocked = getAchievements(user.id, guildId);
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
        .setTimestamp();

      await interaction.update({ embeds: [embed], components: [backRow()] });
      break;
    }

    case 'transactions': {
      const transactions = getTransactions(user.id, 10);

      if (transactions.length === 0) {
        return interaction.update({ embeds: [
          new EmbedBuilder().setTitle('💳 Transactions').setDescription('No transactions yet.').setColor(config.colors.info)
        ], components: [backRow()] });
      }

      const fields = transactions.map(t => ({
        name: t.id,
        value: `${t.type}\n${formatCredits(t.amount)}\n${formatTimestamp(t.created_at)}`,
        inline: true,
      }));

      const embed = new EmbedBuilder()
        .setTitle('💳 Recent Transactions')
        .setColor(config.colors.economy)
        .addFields(fields)
        .setTimestamp();

      await interaction.update({ embeds: [embed], components: [backRow()] });
      break;
    }

    case 'invites': {
      const stats = getInviteStats(user.id, guildId);
      const topInviters = getTopInviters(guildId, 5);

      const embed = new EmbedBuilder()
        .setTitle('📨 Invite Stats')
        .setColor(config.colors.info)
        .addFields(
          { name: 'Valid Invites', value: `${stats.valid_invites}`, inline: true },
          { name: 'Total', value: `${stats.total_invites}`, inline: true },
          { name: 'Leaves', value: `${stats.leaves}`, inline: true },
        )
        .setTimestamp();

      if (topInviters.length > 0) {
        const leaderboard = topInviters.map((inv, i) => `${i + 1}. <@${inv.user_id}> — ${inv.valid_invites}`).join('\n');
        embed.addFields({ name: '🏆 Top Inviters', value: leaderboard });
      }

      await interaction.update({ embeds: [embed], components: [backRow()] });
      break;
    }
  }
}

async function handleWalletAction(interaction) {
  if (interaction.values[0] === 'transfer') {
    const modal = new ModalBuilder()
      .setCustomId(`transfer_modal_${interaction.user.id}`)
      .setTitle('Transfer Credits')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('recipient').setLabel('Recipient (user ID)').setPlaceholder('Enter user ID').setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('amount').setLabel('Amount').setPlaceholder('Enter amount').setStyle(TextInputStyle.Short).setRequired(true)
        ),
      );
    await interaction.showModal(modal);
  }
}

async function handleEconomySelect(interaction) {
  const { user, guild } = interaction;
  const guildId = guild.id;
  const value = interaction.values[0];

  switch (value) {
    case 'daily': {
      const result = claimDaily(user.id, guildId);
      if (result.success) {
        await log(guild, 'economy', '📅 Daily Claimed', { actor: user.id, amount: result.reward });
        await interaction.reply({ embeds: [
          new EmbedBuilder().setTitle('📅 Daily Reward').setDescription(`Claimed **${formatCredits(result.reward)}**!\nBalance: **${formatCredits(result.balance)}**`).setColor(config.colors.success).setTimestamp()
        ] });
      } else {
        await interaction.reply({ embeds: [
          new EmbedBuilder().setTitle('❌ Daily').setDescription(result.reason).setColor(config.colors.error)
        ], ephemeral: true });
      }
      break;
    }

    case 'weekly': {
      const result = claimWeekly(user.id, guildId);
      if (result.success) {
        await log(guild, 'economy', '📆 Weekly Claimed', { actor: user.id, amount: result.reward });
        await interaction.reply({ embeds: [
          new EmbedBuilder().setTitle('📆 Weekly Reward').setDescription(`Claimed **${formatCredits(result.reward)}**!\nBalance: **${formatCredits(result.balance)}**`).setColor(config.colors.success).setTimestamp()
        ] });
      } else {
        await interaction.reply({ embeds: [
          new EmbedBuilder().setTitle('❌ Weekly').setDescription(result.reason).setColor(config.colors.error)
        ], ephemeral: true });
      }
      break;
    }

    case 'transfer': {
      const modal = new ModalBuilder()
        .setCustomId(`transfer_modal_${user.id}`)
        .setTitle('Transfer Credits')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('recipient').setLabel('Recipient (user ID)').setPlaceholder('Enter user ID').setStyle(TextInputStyle.Short).setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('amount').setLabel('Amount').setPlaceholder('Enter amount').setStyle(TextInputStyle.Short).setRequired(true)
          ),
        );
      await interaction.showModal(modal);
      break;
    }

    case 'shop': {
      const { getItems } = require('../systems/shop');
      const items = getItems(guildId);

      if (items.length === 0) {
        return interaction.reply({ embeds: [
          new EmbedBuilder().setTitle('🛒 Shop').setDescription('No items available yet.').setColor(config.colors.info)
        ] });
      }

      const select = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('shop_select_item')
          .setPlaceholder('Select an item...')
          .addOptions(items.slice(0, 25).map(item => ({
            label: `${item.name} — ${item.price} Credits`,
            value: item.id, emoji: item.emoji,
            description: item.description?.substring(0, 100) || 'Purchase',
          })))
      );

      await interaction.reply({ embeds: [
        new EmbedBuilder().setTitle('🛒 Shop').setDescription('Select an item to purchase.').setColor(config.colors.economy)
      ], components: [select] });
      break;
    }

    case 'transactions': {
      const transactions = getTransactions(user.id, 10);
      if (transactions.length === 0) {
        return interaction.reply({ embeds: [
          new EmbedBuilder().setTitle('💳 Transactions').setDescription('No transactions yet.').setColor(config.colors.info)
        ] });
      }

      const fields = transactions.map(t => ({
        name: t.id, value: `${t.type}\n${formatCredits(t.amount)}\n${formatTimestamp(t.created_at)}`, inline: true,
      }));

      await interaction.reply({ embeds: [
        new EmbedBuilder().setTitle('💳 Recent Transactions').setColor(config.colors.economy).addFields(fields).setTimestamp()
      ] });
      break;
    }

    case 'leaderboard': {
      const { getDb } = require('../database/init');
      const db = getDb();
      const top = db.prepare('SELECT user_id, credits, level FROM users WHERE guild_id = ? ORDER BY credits DESC LIMIT 10').all(guildId);

      if (top.length === 0) {
        return interaction.reply({ embeds: [
          new EmbedBuilder().setTitle('🏆 Leaderboard').setDescription('No data yet.').setColor(config.colors.info)
        ] });
      }

      const leaderboard = top.map((u, i) => `**${i + 1}.** <@${u.user_id}> — ${formatCredits(u.credits)} (Lv.${u.level})`).join('\n');

      await interaction.reply({ embeds: [
        new EmbedBuilder().setTitle('🏆 Economy Leaderboard').setDescription(leaderboard).setColor(config.colors.economy).setTimestamp()
      ] });
      break;
    }
  }
}
