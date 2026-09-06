const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, UserSelectMenuBuilder } = require('discord.js');
const { formatCredits, backToMainMenu } = require('../utils/helpers');
const { getUser, getBalance, getTransactions, getLeaderboard } = require('../systems/economy');
const { log } = require('../systems/logging');
const config = require('../config');

module.exports = {
  selectMenus: {
    account_select: handleAccountSelect,
    wallet_action_select: handleWalletAction,
  },
  buttons: {},
  modals: {},
};

function divider() {
  return '\u2501'.repeat(32);
}

// ===== ACCOUNT SELECT HANDLER =====

async function handleAccountSelect(interaction) {
  const option = interaction.values[0];

  try {
    await interaction.deferUpdate();

    switch (option) {
      case 'profile': await showProfilePanel(interaction); break;
      case 'activity': await showActivityPanel(interaction); break;
      case 'reputation': await showReputationPanel(interaction); break;
      case 'achievements': await showAchievementsPanel(interaction); break;
      case 'transactions': await showTransactionsPanel(interaction); break;
      case 'invites': await showInvitesPanel(interaction); break;
      default:
        await interaction.editReply({ embeds: [new EmbedBuilder().setTitle('Coming Soon').setDescription('This panel is under development.').setColor(config.colors.primary)], components: [] });
    }
  } catch (error) {
    console.error('[ACCOUNT PANEL] Error:', error.message);
    await interaction.editReply({ embeds: [errEmbed('Error', 'Failed to load panel.')], components: [] }).catch(() => {});
  }
}

// ===== PANELS =====

async function showProfilePanel(interaction) {
  const { getXpInfo } = require('../systems/xp');
  const { getRepInfo } = require('../systems/reputation');
  const { getMemberRoleName } = require('../utils/permissions');
  const { getRankForXp } = require('../utils/helpers');
  const { generateProfileCard } = require('../utils/images');

  const userData = getUser(interaction.user.id, interaction.guild.id);
  const xpInfo = getXpInfo(interaction.user.id, interaction.guild.id);
  const rank = getRankForXp(userData.total_xp);
  const repInfo = getRepInfo(interaction.user.id, interaction.guild.id);
  const roleName = getMemberRoleName(interaction.member);

  const attachment = await generateProfileCard(interaction.user, userData, xpInfo, rank, repInfo, roleName);

  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('nav_account_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
  );

  // Send image directly without embed wrapper — displays at full size
  await interaction.editReply({ content: null, embeds: [], files: [attachment], attachments: [], components: [backRow] });
}

async function showActivityPanel(interaction) {
  const userData = getUser(interaction.user.id, interaction.guild.id);
  const { getXpInfo } = require('../systems/xp');
  const xpInfo = getXpInfo(interaction.user.id, interaction.guild.id);

  const embed = new EmbedBuilder()
    .setTitle('NEXAVERSE \u00b7 Activity')
    .setColor(config.colors.primary)
    .setDescription(
      `${divider()}\n` +
      `**Total Messages** ${userData.messages.toLocaleString()}\n` +
      `**Today** ${userData.daily_messages || 0}  \u00b7  **This Week** ${userData.weekly_messages || 0}\n` +
      `**This Month** ${userData.monthly_messages || 0}\n` +
      `**Level** ${xpInfo.level}  \u00b7  **XP** ${xpInfo.xp}/${xpInfo.xpNeeded}\n` +
      `${divider()}`
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed], attachments: [], components: [backButton()] });
}

async function showReputationPanel(interaction) {
  const { getRepInfo } = require('../systems/reputation');
  const repInfo = getRepInfo(interaction.user.id, interaction.guild.id);

  const restrictions = repInfo.level.restrictions.length > 0
    ? repInfo.level.restrictions.map(r => r.replace(/_/g, ' ')).join('\n')
    : 'None';

  const embed = new EmbedBuilder()
    .setTitle('NEXAVERSE \u00b7 Reputation')
    .setColor(config.colors.primary)
    .setDescription(
      `${divider()}\n` +
      `**Score** ${repInfo.score}/100  \u00b7  **Level** ${repInfo.level.label}\n` +
      `${divider()}\n` +
      `**Restrictions**\n${restrictions}\n` +
      `${divider()}\n` +
      `Reputation recovers slowly through good behavior.`
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed], components: [backButton()] });
}

async function showAchievementsPanel(interaction) {
  const { getAchievements, getAllAchievements } = require('../systems/achievements');
  const unlocked = getAchievements(interaction.user.id, interaction.guild.id);
  const all = getAllAchievements();

  let desc = `${divider()}\n**Unlocked** ${unlocked.length}/${all.length}\n${divider()}\n`;
  if (unlocked.length === 0) {
    desc += 'No achievements unlocked yet.';
  } else {
    for (const a of unlocked.slice(0, 10)) {
      desc += `${a.icon || '\u2022'} **${a.name}** \u2014 ${a.description}\n`;
    }
    if (unlocked.length > 10) desc += `\n...and ${unlocked.length - 10} more`;
  }

  const embed = new EmbedBuilder()
    .setTitle('NEXAVERSE \u00b7 Achievements')
    .setColor(config.colors.achievement)
    .setDescription(desc)
    .setTimestamp();

  await interaction.editReply({ embeds: [embed], components: [backButton()] });
}

async function showTransactionsPanel(interaction) {
  const txns = getTransactions(interaction.user.id, interaction.guild.id, 10);

  let desc = `${divider()}\n`;
  if (!txns || txns.length === 0) {
    desc += 'No transactions yet.';
  } else {
    for (const tx of txns) {
      const label = { transfer: 'Transfer', daily_reward: 'Daily', weekly_reward: 'Weekly', game_payout: 'Game Win', admin_adjustment: 'Adjustment', event_payout: 'Event', giveaway_win: 'Giveaway' }[tx.type] || tx.type;
      desc += `**${label}** \u2014 ${tx.amount > 0 ? '+' : ''}${formatCredits(tx.amount)}\n`;
    }
  }
  desc += `\n${divider()}`;

  const embed = new EmbedBuilder()
    .setTitle('NEXAVERSE \u00b7 Transactions')
    .setColor(config.colors.economy)
    .setDescription(desc)
    .setTimestamp();

  await interaction.editReply({ embeds: [embed], components: [backButton()] });
}

async function showInvitesPanel(interaction) {
  const { getInviteStats } = require('../systems/invites');
  const stats = getInviteStats(interaction.user.id, interaction.guild.id);

  const embed = new EmbedBuilder()
    .setTitle('NEXAVERSE \u00b7 Invites')
    .setColor(config.colors.primary)
    .setDescription(
      `${divider()}\n` +
      `**Total Invites** ${stats.total || 0}\n` +
      `**Valid** ${stats.valid || 0}\n` +
      `**Members Who Left** ${stats.left || 0}\n` +
      `${divider()}`
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed], components: [backButton()] });
}

// ===== WALLET ACTION HANDLER =====

async function handleWalletAction(interaction) {
  const action = interaction.values[0];

  try {
    await interaction.deferUpdate();

    switch (action) {
      case 'daily': {
        const { claimDaily } = require('../systems/economy');
        const result = claimDaily(interaction.user.id, interaction.guild.id);
        const embed = result.success
          ? new EmbedBuilder()
              .setTitle('NEXAVERSE \u00b7 Daily Reward')
              .setDescription(`${divider()}\n**Claimed** ${formatCredits(result.reward)}\n**Balance** ${formatCredits(result.balance)}\n${divider()}`)
              .setColor(config.colors.success)
              .setTimestamp()
          : new EmbedBuilder()
              .setTitle('NEXAVERSE \u00b7 Daily Reward')
              .setDescription(`${divider()}\n${result.reason || result.error || 'Already claimed.'}\n${divider()}`)
              .setColor(config.colors.warning)
              .setTimestamp();

        if (result.success) {
          log(interaction.guild, 'economy', 'Daily Reward Claimed', { actor: interaction.user.id, amount: result.reward }).catch(() => {});
        }

        const backRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('nav_wallet_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
        );
        await interaction.editReply({ embeds: [embed], components: [backRow] });
        break;
      }
      case 'weekly': {
        const { claimWeekly } = require('../systems/economy');
        const result = claimWeekly(interaction.user.id, interaction.guild.id);
        const embed = result.success
          ? new EmbedBuilder()
              .setTitle('NEXAVERSE \u00b7 Weekly Reward')
              .setDescription(`${divider()}\n**Claimed** ${formatCredits(result.reward)}\n**Balance** ${formatCredits(result.balance)}\n${divider()}`)
              .setColor(config.colors.success)
              .setTimestamp()
          : new EmbedBuilder()
              .setTitle('NEXAVERSE \u00b7 Weekly Reward')
              .setDescription(`${divider()}\n${result.reason || result.error || 'Already claimed.'}\n${divider()}`)
              .setColor(config.colors.warning)
              .setTimestamp();

        if (result.success) {
          log(interaction.guild, 'economy', 'Weekly Reward Claimed', { actor: interaction.user.id, amount: result.reward }).catch(() => {});
        }

        const backRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('nav_wallet_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
        );
        await interaction.editReply({ embeds: [embed], components: [backRow] });
        break;
      }
      case 'transfer': {
        const userSelect = new ActionRowBuilder().addComponents(
          new UserSelectMenuBuilder()
            .setCustomId(`wallet_transfer_select_${interaction.user.id}`)
            .setPlaceholder('Select recipient...')
            .setMinValues(1)
            .setMaxValues(1)
        );
        const embed = new EmbedBuilder()
          .setTitle('NEXAVERSE \u00b7 Transfer')
          .setDescription(`${divider()}\nSelect a user from the dropdown below to send credits.\n${divider()}`)
          .setColor(config.colors.economy)
          .setTimestamp();

        const backRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('nav_wallet_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
        );
        await interaction.editReply({ embeds: [embed], components: [userSelect, backRow] });
        break;
      }
      case 'transactions': {
        await showTransactionsPanel(interaction);
        break;
      }
      case 'leaderboard': {
        const lb = getLeaderboard(interaction.guild.id, 10);

        let desc = `${divider()}\n`;
        if (!lb || lb.length === 0) {
          desc += 'No data yet.';
        } else {
          lb.forEach((row, i) => {
            desc += `**${i + 1}.** ${row.username || `<@${row.user_id}>`} \u2014 ${formatCredits(row.credits)}\n`;
          });
        }
        desc += `\n${divider()}`;

        const embed = new EmbedBuilder()
          .setTitle('NEXAVERSE \u00b7 Leaderboard')
          .setDescription(desc)
          .setColor(config.colors.economy)
          .setTimestamp();

        const backRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('nav_wallet_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
        );
        await interaction.editReply({ embeds: [embed], components: [backRow] });
        break;
      }
      default:
        await interaction.editReply({ embeds: [new EmbedBuilder().setTitle('Coming Soon').setDescription('This action is under development.').setColor(config.colors.primary)], components: [] });
    }
  } catch (error) {
    console.error('[WALLET ACTION] Error:', error.message);
    await interaction.editReply({ embeds: [errEmbed('Error', 'Something went wrong.')], components: [] }).catch(() => {});
  }
}

// ===== SHARED HELPERS =====

function backButton(customId = 'nav_account_back') {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(customId).setLabel('Back').setStyle(ButtonStyle.Secondary)
  );
}

function errEmbed(title, description) {
  return new EmbedBuilder().setTitle(title).setDescription(description).setColor(config.colors.error);
}
