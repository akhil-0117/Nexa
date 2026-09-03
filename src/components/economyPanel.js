const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { claimDaily, claimWeekly, getBalance, transfer, getTransactions, createTransaction } = require('../systems/economy');
const { getUser } = require('../systems/economy');
const { getRepInfo } = require('../systems/reputation');
const { getDb } = require('../database/init');
const config = require('../config');
const { formatCredits, formatTimestamp } = require('../utils/helpers');
const { log } = require('../systems/logging');

module.exports = {
  buttons: {
    economy_daily: handleDaily,
    economy_weekly: handleWeekly,
    economy_transfer: handleTransfer,
    economy_shop: handleShop,
    economy_transactions: handleTxHistory,
    economy_leaderboard: handleLeaderboard,
  },
};

async function handleDaily(interaction) {
  const result = claimDaily(interaction.user.id, interaction.guild.id);
  if (result.success) {
    await log(interaction.guild, 'economy', '📅 Daily Claimed', { actor: interaction.user.id, amount: result.reward });
    await interaction.reply({ embeds: [
      new EmbedBuilder()
        .setTitle('📅 Daily Reward')
        .setDescription(`You claimed **${formatCredits(result.reward)}**!\nBalance: **${formatCredits(result.balance)}**`)
        .setColor(config.colors.success)
        .setTimestamp()
    ], ephemeral: true });
  } else {
    await interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('❌ Daily').setDescription(result.reason).setColor(config.colors.error)
    ], ephemeral: true });
  }
}

async function handleWeekly(interaction) {
  const result = claimWeekly(interaction.user.id, interaction.guild.id);
  if (result.success) {
    await log(interaction.guild, 'economy', '📆 Weekly Claimed', { actor: interaction.user.id, amount: result.reward });
    await interaction.reply({ embeds: [
      new EmbedBuilder()
        .setTitle('📆 Weekly Reward')
        .setDescription(`You claimed **${formatCredits(result.reward)}**!\nBalance: **${formatCredits(result.balance)}**`)
        .setColor(config.colors.success)
        .setTimestamp()
    ], ephemeral: true });
  } else {
    await interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('❌ Weekly').setDescription(result.reason).setColor(config.colors.error)
    ], ephemeral: true });
  }
}

async function handleTransfer(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('transfer_modal')
    .setTitle('Transfer Credits')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('transfer_recipient').setLabel('Recipient User ID').setPlaceholder('Enter user ID').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('transfer_amount').setLabel('Amount').setPlaceholder('Enter amount').setStyle(TextInputStyle.Short).setRequired(true)
      ),
    );

  await interaction.showModal(modal);
}

async function handleShop(interaction) {
  const { getItems } = require('../systems/shop');
  const items = getItems(interaction.guild.id);

  if (items.length === 0) {
    return interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('🛒 Shop').setDescription('No items available yet.').setColor(config.colors.info)
    ], ephemeral: true });
  }

  const select = new ActionRowBuilder().addComponents(
    new (require('discord.js').StringSelectMenuBuilder)()
      .setCustomId('shop_select_item')
      .setPlaceholder('Select an item to purchase...')
      .addOptions(items.slice(0, 25).map(item => ({
        label: `${item.name} - ${item.price} Credits`,
        value: item.id,
        emoji: item.emoji,
        description: item.description?.substring(0, 100) || 'Purchase',
      })))
  );

  await interaction.reply({ embeds: [
    new EmbedBuilder().setTitle('🛒 Shop').setDescription('Select an item to purchase.').setColor(config.colors.economy)
  ], components: [select], ephemeral: true });
}

async function handleTxHistory(interaction) {
  const transactions = getTransactions(interaction.user.id, 10);
  if (transactions.length === 0) {
    return interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('💳 Transactions').setDescription('No transactions yet.').setColor(config.colors.info)
    ], ephemeral: true });
  }

  const fields = transactions.map(t => ({
    name: t.id, value: `${t.type}\n${formatCredits(t.amount)}\n${formatTimestamp(t.created_at)}`, inline: true,
  }));

  await interaction.reply({ embeds: [
    new EmbedBuilder().setTitle('💳 Recent Transactions').setColor(config.colors.economy).addFields(fields).setTimestamp()
  ], ephemeral: true });
}

async function handleLeaderboard(interaction) {
  const db = getDb();
  const top = db.prepare('SELECT user_id, credits, level, reputation FROM users WHERE guild_id = ? ORDER BY credits DESC LIMIT 10').all(interaction.guild.id);

  if (top.length === 0) {
    return interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('🏆 Leaderboard').setDescription('No data yet.').setColor(config.colors.info)
    ], ephemeral: true });
  }

  const leaderboard = top.map((u, i) => `**${i + 1}.** <@${u.user_id}> - ${formatCredits(u.credits)} (Lv.${u.level})`).join('\n');

  await interaction.reply({ embeds: [
    new EmbedBuilder().setTitle('🏆 Economy Leaderboard').setDescription(leaderboard).setColor(config.colors.economy).setTimestamp()
  ], ephemeral: true });
}
