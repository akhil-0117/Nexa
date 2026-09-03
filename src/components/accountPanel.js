const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, UserSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { getUser, getBalance, getTransactions, claimDaily, claimWeekly } = require('../systems/economy');
const { getXpInfo } = require('../systems/xp');
const { getRepInfo } = require('../systems/reputation');
const { getInviteStats, getTopInviters } = require('../systems/invites');
const { getAchievements, getAllAchievements } = require('../systems/achievements');
const { formatCredits, formatTimestamp, backToMainMenu, getRankForXp, getEffectiveMaxTransfer, getEffectiveMaxBet } = require('../utils/helpers');
const { getMemberRoleName } = require('../utils/permissions');
const { log } = require('../systems/logging');
const { generateProfileCard, progressBar } = require('../utils/images');
const config = require('../config');

module.exports = {
  selectMenus: {
    account_select: handleAccountSelect,
    economy_select: handleEconomySelect,
    wallet_action_select: handleWalletAction,
    transfer_user_select: handleTransferUserSelect,
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

function divider() {
  return '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
}

async function handleAccountSelect(interaction) {
  const value = interaction.values[0];
  const { user, guild, member } = interaction;
  const guildId = guild.id;

  try {
    switch (value) {
      case 'profile': {
        const userData = getUser(user.id, guildId);
        const xpInfo = getXpInfo(user.id, guildId);
        const rank = getRankForXp(userData.total_xp);
        const roleName = getMemberRoleName(member);

        // Generate profile card image
        const attachment = await generateProfileCard(user, userData, xpInfo, rank, getRepInfo(user.id, guildId), roleName);

        const embed = new EmbedBuilder()
          .setAuthor({ name: `${user.username}'s Profile`, iconURL: user.displayAvatarURL({ dynamic: true }) })
          .setColor(rank.color)
          .setImage('attachment://profile.png')
          .setFooter({ text: `${divider()}\nNEXAVERSE • Profile Card` })
          .setTimestamp();

        await interaction.update({ embeds: [embed], files: [attachment], components: [backRow()] });
        break;
      }

      case 'wallet': {
        const userData = getUser(user.id, guildId);
        const repInfo = getRepInfo(user.id, guildId);
        const maxTransfer = getEffectiveMaxTransfer(userData.reputation);

        const embed = new EmbedBuilder()
          .setTitle('💰 Wallet')
          .setColor(config.colors.economy)
          .setDescription(`${divider()}\n**Balance:** ${formatCredits(userData.credits)}\n**Reputation:** ${repInfo.score}/100 · ${repInfo.level.label}\n**Max Transfer:** ${formatCredits(maxTransfer)}\n${divider()}`)
          .addFields(
            { name: '📤 Sent', value: `${userData.transfers_sent}x`, inline: true },
            { name: '📥 Received', value: `${userData.transfers_received}x`, inline: true },
            { name: '🔒 Status', value: repInfo.score < 50 ? 'Restricted' : 'Active', inline: true },
          )
          .setFooter({ text: 'Select an action below' })
          .setTimestamp();

        const select = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('wallet_action_select')
            .setPlaceholder('Choose an action...')
            .addOptions([
              { label: 'Transfer Credits', value: 'transfer', emoji: '💸', description: 'Send credits to another user' },
              { label: 'Daily Reward', value: 'daily', emoji: '📅', description: 'Claim your daily reward' },
              { label: 'Weekly Reward', value: 'weekly', emoji: '📆', description: 'Claim your weekly reward' },
              { label: 'Transactions', value: 'transactions', emoji: '💳', description: 'View recent transactions' },
              { label: 'Leaderboard', value: 'leaderboard', emoji: '🏆', description: 'Top earners' },
            ])
        );

        await interaction.update({ embeds: [embed], components: [select, backRow()] });
        break;
      }

      case 'economy': {
        const userData = getUser(user.id, guildId);
        const repInfo = getRepInfo(user.id, guildId);

        const embed = new EmbedBuilder()
          .setTitle('📊 Economy Overview')
          .setColor(config.colors.economy)
          .setDescription(`${divider()}\n**Balance:** ${formatCredits(userData.credits)}\n**Reputation:** ${repInfo.score}/100 · ${repInfo.level.label}\n${divider()}`)
          .addFields(
            { name: '📅 Daily', value: `${formatCredits(config.economy.dailyReward)} / day`, inline: true },
            { name: '📆 Weekly', value: `${formatCredits(config.economy.weeklyReward)} / week`, inline: true },
            { name: '💸 Transfer Fee', value: `${config.economy.transferFeePercent}%`, inline: true },
          )
          .setFooter({ text: 'Claim rewards to earn credits' })
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
          .setDescription(`${divider()}\nYour server activity summary\n${divider()}`)
          .addFields(
            { name: '💬 Messages', value: `**${userData.messages.toLocaleString()}**`, inline: true },
            { name: '📅 Today', value: `**${userData.daily_messages}**`, inline: true },
            { name: '📆 This Week', value: `**${userData.weekly_messages}**`, inline: true },
            { name: '🗓️ This Month', value: `**${userData.monthly_messages}**`, inline: true },
            { name: '🎮 Events Joined', value: `**${userData.events_joined}**`, inline: true },
            { name: '🏆 Events Won', value: `**${userData.events_won}**`, inline: true },
            { name: '🔥 Streak', value: `**${userData.streak_days} days**`, inline: true },
          )
          .setFooter({ text: 'Keep chatting to earn XP!' })
          .setTimestamp();

        await interaction.update({ embeds: [embed], components: [backRow()] });
        break;
      }

      case 'reputation': {
        const repInfo = getRepInfo(user.id, guildId);
        const repBar = progressBar(repInfo.score, 100, 20);

        const embed = new EmbedBuilder()
          .setTitle('🤝 Reputation')
          .setColor(repInfo.level.color)
          .setDescription(`${divider()}\n**Score:** ${repInfo.score}/100\n**Level:** ${repInfo.level.label}\n**Bar:** ${repBar}\n${divider()}`)
          .setTimestamp();

        if (repInfo.restrictions.length > 0) {
          embed.addFields({ name: '⚠️ Active Restrictions', value: repInfo.restrictions.map(r => `• ${r.replace(/_/g, ' ')}`).join('\n') });
        } else {
          embed.addFields({ name: '✅ Status', value: 'No restrictions — full access to all features' });
        }

        await interaction.update({ embeds: [embed], components: [backRow()] });
        break;
      }

      case 'achievements': {
        const unlocked = getAchievements(user.id, guildId);
        const all = getAllAchievements();
        const percent = all.length > 0 ? Math.floor((unlocked.length / all.length) * 100) : 0;

        const embed = new EmbedBuilder()
          .setTitle(`🏆 Achievements — ${unlocked.length}/${all.length} (${percent}%)`)
          .setColor(config.colors.achievement)
          .setDescription(`${divider()}\n${progressBar(unlocked.length, all.length, 25)} ${percent}%\n${divider()}`)
          .setTimestamp();

        // Show unlocked
        const unlockedList = all.filter(a => unlocked.includes(a.id));
        const lockedList = all.filter(a => !unlocked.includes(a.id));

        if (unlockedList.length > 0) {
          embed.addFields({
            name: '✅ Unlocked',
            value: unlockedList.map(a => `${a.icon} ${a.name} — ${a.description}`).join('\n').substring(0, 1024),
          });
        }
        if (lockedList.length > 0) {
          embed.addFields({
            name: '🔒 Locked',
            value: lockedList.map(a => `❓ ${a.name}`).join('\n').substring(0, 1024),
          });
        }

        await interaction.update({ embeds: [embed], components: [backRow()] });
        break;
      }

      case 'transactions': {
        const transactions = getTransactions(user.id, 10);

        if (transactions.length === 0) {
          return interaction.update({ embeds: [
            new EmbedBuilder().setTitle('💳 Transactions').setDescription('No transactions yet.\n\nStart earning credits by claiming daily rewards or playing games!').setColor(config.colors.info)
          ], components: [backRow()] });
        }

        const embed = new EmbedBuilder()
          .setTitle('💳 Recent Transactions')
          .setColor(config.colors.economy)
          .setDescription(`${divider()}\nYour last ${transactions.length} transactions\n${divider()}`)
          .setTimestamp();

        const typeEmojis = {
          'transfer': '💸', 'daily_reward': '📅', 'weekly_reward': '📆',
          'game_payout': '🎰', 'game_loss': '📉', 'giveaway_reward': '🎁',
          'event_reward': '🎉', 'shop_purchase': '🛒', 'admin_adjustment': '⚙️',
          'refund': '↩️', 'reversal': '🔄',
        };

        for (const t of transactions) {
          const emoji = typeEmojis[t.type] || '💳';
          embed.addFields({
            name: `${emoji} ${t.id}`,
            value: `**${t.type.replace(/_/g, ' ')}**\n${formatCredits(t.amount)}\n${formatTimestamp(t.created_at)}`,
            inline: true,
          });
        }

        await interaction.update({ embeds: [embed], components: [backRow()] });
        break;
      }

      case 'invites': {
        const stats = getInviteStats(user.id, guildId);
        const topInviters = getTopInviters(guildId, 5);

        const embed = new EmbedBuilder()
          .setTitle('📨 Invite Stats')
          .setColor(config.colors.info)
          .setDescription(`${divider()}\nYour invite performance\n${divider()}`)
          .addFields(
            { name: '✅ Valid', value: `**${stats.valid_invites}**`, inline: true },
            { name: '📊 Total', value: `**${stats.total_invites}**`, inline: true },
            { name: '❌ Leaves', value: `**${stats.leaves}**`, inline: true },
          )
          .setTimestamp();

        if (topInviters.length > 0) {
          const leaderboard = topInviters.map((inv, i) => {
            const medals = ['🥇', '🥈', '🥉'];
            const medal = i < 3 ? medals[i] : `**${i + 1}.**`;
            return `${medal} <@${inv.user_id}> — ${inv.valid_invites} valid`;
          }).join('\n');
          embed.addFields({ name: '🏆 Top Inviters', value: leaderboard });
        }

        await interaction.update({ embeds: [embed], components: [backRow()] });
        break;
      }
    }
  } catch (error) {
    console.error('[ACCOUNT] Error:', error.message);
    await interaction.update({ embeds: [
      new EmbedBuilder().setTitle('❌ Error').setDescription('Something went wrong. Please try again.').setColor(config.colors.error)
    ], components: [backRow()] });
  }
}

async function handleWalletAction(interaction) {
  try {
    const value = interaction.values[0];
    const { user, guild } = interaction;

    switch (value) {
      case 'transfer': {
        // Show UserSelectMenu to pick recipient
        const embed = new EmbedBuilder()
          .setTitle('💸 Transfer Credits')
          .setDescription('Select the user you want to send credits to.')
          .setColor(config.colors.economy)
          .setTimestamp();

        const userSelect = new ActionRowBuilder().addComponents(
          new UserSelectMenuBuilder()
            .setCustomId('transfer_user_select')
            .setPlaceholder('Select recipient...')
            .setMinValues(1)
            .setMaxValues(1)
        );

        await interaction.update({ embeds: [embed], components: [userSelect, backRow()] });
        break;
      }

      case 'daily': {
        const result = claimDaily(user.id, guild.id);
        if (result.success) {
          await log(guild, 'economy', '📅 Daily Claimed', { actor: user.id, amount: result.reward });
          await interaction.update({ embeds: [
            new EmbedBuilder()
              .setTitle('📅 Daily Reward Claimed!')
              .setDescription(`${divider()}\n**Reward:** ${formatCredits(result.reward)}\n**New Balance:** ${formatCredits(result.balance)}\n${divider()}`)
              .setColor(config.colors.success)
              .setTimestamp()
          ], components: [backRow()] });
        } else {
          await interaction.update({ embeds: [
            new EmbedBuilder().setTitle('📅 Daily Reward').setDescription(result.error || 'Already claimed today. Come back tomorrow!').setColor(config.colors.warning)
          ], components: [backRow()] });
        }
        break;
      }

      case 'weekly': {
        const result = claimWeekly(user.id, guild.id);
        if (result.success) {
          await log(guild, 'economy', '📆 Weekly Claimed', { actor: user.id, amount: result.reward });
          await interaction.update({ embeds: [
            new EmbedBuilder()
              .setTitle('📆 Weekly Reward Claimed!')
              .setDescription(`${divider()}\n**Reward:** ${formatCredits(result.reward)}\n**New Balance:** ${formatCredits(result.balance)}\n${divider()}`)
              .setColor(config.colors.success)
              .setTimestamp()
          ], components: [backRow()] });
        } else {
          await interaction.update({ embeds: [
            new EmbedBuilder().setTitle('📆 Weekly Reward').setDescription(result.error || 'Already claimed this week. Come back next week!').setColor(config.colors.warning)
          ], components: [backRow()] });
        }
        break;
      }

      case 'transactions': {
        const transactions = getTransactions(user.id, 10);
        if (transactions.length === 0) {
          return interaction.update({ embeds: [
            new EmbedBuilder().setTitle('💳 Transactions').setDescription('No transactions yet.').setColor(config.colors.info)
          ], components: [backRow()] });
        }

        const typeEmojis = {
          'transfer': '💸', 'daily_reward': '📅', 'weekly_reward': '📆',
          'game_payout': '🎰', 'game_loss': '📉', 'giveaway_reward': '🎁',
          'event_reward': '🎉', 'shop_purchase': '🛒', 'admin_adjustment': '⚙️',
        };

        const embed = new EmbedBuilder()
          .setTitle('💳 Recent Transactions')
          .setColor(config.colors.economy)
          .setDescription(`${divider()}\nLast ${transactions.length} transactions\n${divider()}`)
          .setTimestamp();

        for (const t of transactions) {
          const emoji = typeEmojis[t.type] || '💳';
          embed.addFields({
            name: `${emoji} ${t.id}`,
            value: `**${t.type.replace(/_/g, ' ')}**\n${formatCredits(t.amount)}\n${formatTimestamp(t.created_at)}`,
            inline: true,
          });
        }

        await interaction.update({ embeds: [embed], components: [backRow()] });
        break;
      }

      case 'leaderboard': {
        const { getDb } = require('../database/init');
        const db = getDb();
        const top = db.prepare('SELECT user_id, credits, level FROM users WHERE guild_id = ? ORDER BY credits DESC LIMIT 10').all(guild.id);

        if (top.length === 0) {
          return interaction.update({ embeds: [
            new EmbedBuilder().setTitle('🏆 Leaderboard').setDescription('No data yet.').setColor(config.colors.info)
          ], components: [backRow()] });
        }

        const medals = ['🥇', '🥈', '🥉'];
        const leaderboard = top.map((u, i) => {
          const medal = i < 3 ? medals[i] : `**${i + 1}.**`;
          return `${medal} <@${u.user_id}> — **${formatCredits(u.credits)}** (Lv.${u.level})`;
        }).join('\n');

        await interaction.update({ embeds: [
          new EmbedBuilder()
            .setTitle('🏆 Economy Leaderboard')
            .setDescription(`${divider()}\n${leaderboard}\n${divider()}`)
            .setColor(config.colors.economy)
            .setTimestamp()
        ], components: [backRow()] });
        break;
      }
    }
  } catch (error) {
    console.error('[WALLET] Error:', error.message);
    await interaction.update({ embeds: [
      new EmbedBuilder().setTitle('❌ Error').setDescription('Something went wrong.').setColor(config.colors.error)
    ], components: [backRow()] });
  }
}

// Handle UserSelectMenu for transfers
async function handleTransferUserSelect(interaction) {
  try {
    const selectedUserId = interaction.values[0];

    if (selectedUserId === interaction.user.id) {
      return interaction.update({ embeds: [
        new EmbedBuilder().setTitle('❌ Self-Transfer').setDescription('You cannot transfer credits to yourself.').setColor(config.colors.error)
      ], components: [backRow()] });
    }

    // Show amount modal
    const modal = new ModalBuilder()
      .setCustomId(`transfer_modal_${interaction.user.id}_${selectedUserId}`)
      .setTitle('💸 Transfer Credits')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('amount').setLabel(`Amount to send to <@${selectedUserId}>`).setPlaceholder('Enter amount (e.g. 500)').setStyle(TextInputStyle.Short).setRequired(true)
        ),
      );
    await interaction.showModal(modal);
  } catch (error) {
    console.error('[TRANSFER_SELECT] Error:', error.message);
    await interaction.update({ embeds: [
      new EmbedBuilder().setTitle('❌ Error').setDescription('Something went wrong.').setColor(config.colors.error)
    ], components: [backRow()] });
  }
}

// Handle economy select (daily, weekly, transfer, shop, etc.)
async function handleEconomySelect(interaction) {
  try {
    const { user, guild } = interaction;
    const guildId = guild.id;
    const value = interaction.values[0];

    switch (value) {
      case 'daily': {
        const result = claimDaily(user.id, guildId);
        if (result.success) {
          await log(guild, 'economy', '📅 Daily Claimed', { actor: user.id, amount: result.reward });
          await interaction.update({ embeds: [
            new EmbedBuilder()
              .setTitle('📅 Daily Reward Claimed!')
              .setDescription(`${divider()}\n**Reward:** ${formatCredits(result.reward)}\n**New Balance:** ${formatCredits(result.balance)}\n${divider()}`)
              .setColor(config.colors.success)
              .setTimestamp()
          ], components: [backRow()] });
        } else {
          await interaction.update({ embeds: [
            new EmbedBuilder().setTitle('📅 Daily Reward').setDescription(result.error || 'Already claimed today!').setColor(config.colors.warning)
          ], components: [backRow()] });
        }
        break;
      }

      case 'weekly': {
        const result = claimWeekly(user.id, guildId);
        if (result.success) {
          await log(guild, 'economy', '📆 Weekly Claimed', { actor: user.id, amount: result.reward });
          await interaction.update({ embeds: [
            new EmbedBuilder()
              .setTitle('📆 Weekly Reward Claimed!')
              .setDescription(`${divider()}\n**Reward:** ${formatCredits(result.reward)}\n**New Balance:** ${formatCredits(result.balance)}\n${divider()}`)
              .setColor(config.colors.success)
              .setTimestamp()
          ], components: [backRow()] });
        } else {
          await interaction.update({ embeds: [
            new EmbedBuilder().setTitle('📆 Weekly Reward').setDescription(result.error || 'Already claimed this week!').setColor(config.colors.warning)
          ], components: [backRow()] });
        }
        break;
      }

      case 'transfer': {
        // Show UserSelectMenu
        const embed = new EmbedBuilder()
          .setTitle('💸 Transfer Credits')
          .setDescription('Select the user you want to send credits to.')
          .setColor(config.colors.economy);

        const userSelect = new ActionRowBuilder().addComponents(
          new UserSelectMenuBuilder()
            .setCustomId('transfer_user_select')
            .setPlaceholder('Select recipient...')
            .setMinValues(1)
            .setMaxValues(1)
        );

        await interaction.update({ embeds: [embed], components: [userSelect, backRow()] });
        break;
      }

      case 'shop': {
        const { getItems } = require('../systems/shop');
        const items = getItems(guildId);

        if (items.length === 0) {
          return interaction.update({ embeds: [
            new EmbedBuilder().setTitle('🛒 Shop').setDescription('No items available yet.').setColor(config.colors.info)
          ], components: [backRow()] });
        }

        const select = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('shop_select_item')
            .setPlaceholder('Select an item to purchase...')
            .addOptions(items.slice(0, 25).map(item => ({
              label: `${item.name} — ${item.price} Credits`,
              value: item.id,
              emoji: item.emoji,
              description: (item.description || 'Purchase').substring(0, 100),
            })))
        );

        await interaction.update({ embeds: [
          new EmbedBuilder().setTitle('🛒 Shop').setDescription('Select an item to purchase.').setColor(config.colors.economy)
        ], components: [select, backRow()] });
        break;
      }

      case 'transactions': {
        const transactions = getTransactions(user.id, 10);
        if (transactions.length === 0) {
          return interaction.update({ embeds: [
            new EmbedBuilder().setTitle('💳 Transactions').setDescription('No transactions yet.').setColor(config.colors.info)
          ], components: [backRow()] });
        }

        const typeEmojis = {
          'transfer': '💸', 'daily_reward': '📅', 'weekly_reward': '📆',
          'game_payout': '🎰', 'game_loss': '📉', 'giveaway_reward': '🎁',
          'event_reward': '🎉', 'shop_purchase': '🛒', 'admin_adjustment': '⚙️',
        };

        const embed = new EmbedBuilder()
          .setTitle('💳 Recent Transactions')
          .setColor(config.colors.economy)
          .setDescription(`${divider()}\nLast ${transactions.length} transactions\n${divider()}`)
          .setTimestamp();

        for (const t of transactions) {
          const emoji = typeEmojis[t.type] || '💳';
          embed.addFields({
            name: `${emoji} ${t.id}`,
            value: `**${t.type.replace(/_/g, ' ')}**\n${formatCredits(t.amount)}\n${formatTimestamp(t.created_at)}`,
            inline: true,
          });
        }

        await interaction.update({ embeds: [embed], components: [backRow()] });
        break;
      }

      case 'leaderboard': {
        const { getDb } = require('../database/init');
        const db = getDb();
        const top = db.prepare('SELECT user_id, credits, level FROM users WHERE guild_id = ? ORDER BY credits DESC LIMIT 10').all(guildId);

        if (top.length === 0) {
          return interaction.update({ embeds: [
            new EmbedBuilder().setTitle('🏆 Leaderboard').setDescription('No data yet.').setColor(config.colors.info)
          ], components: [backRow()] });
        }

        const medals = ['🥇', '🥈', '🥉'];
        const leaderboard = top.map((u, i) => {
          const medal = i < 3 ? medals[i] : `**${i + 1}.**`;
          return `${medal} <@${u.user_id}> — **${formatCredits(u.credits)}** (Lv.${u.level})`;
        }).join('\n');

        await interaction.update({ embeds: [
          new EmbedBuilder()
            .setTitle('🏆 Economy Leaderboard')
            .setDescription(`${divider()}\n${leaderboard}\n${divider()}`)
            .setColor(config.colors.economy)
            .setTimestamp()
        ], components: [backRow()] });
        break;
      }
    }
  } catch (error) {
    console.error('[ECONOMY_SELECT] Error:', error.message);
    await interaction.update({ embeds: [
      new EmbedBuilder().setTitle('❌ Error').setDescription('Something went wrong.').setColor(config.colors.error)
    ], components: [backRow()] });
  }
}
