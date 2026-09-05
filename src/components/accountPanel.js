const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { formatCredits, formatTimestamp, backToMainMenu } = require('../utils/helpers');
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

async function handleAccountSelect(interaction) {
  const option = interaction.values[0];

  try {
    switch (option) {
      case 'economy':
        await showEconomyPanel(interaction);
        break;
      case 'activity':
        await showActivityPanel(interaction);
        break;
      case 'reputation':
        await showReputationPanel(interaction);
        break;
      case 'achievements':
        await showAchievementsPanel(interaction);
        break;
      case 'transactions':
        await showTransactionsPanel(interaction);
        break;
      case 'invites':
        await showInvitesPanel(interaction);
        break;
      default:
        await interaction.update({ embeds: [new EmbedBuilder().setTitle('Coming Soon').setDescription('This panel is under development.').setColor(config.colors.primary)], components: [] });
    }
  } catch (error) {
    console.error('[ACCOUNT PANEL] Error:', error.message);
    await interaction.update({ embeds: [new EmbedBuilder().setTitle('Error').setDescription('Failed to load panel.').setColor(config.colors.error)], components: [] }).catch(() => {});
  }
}

async function showEconomyPanel(interaction) {
  const { getUser } = require('../systems/economy');
  const { getRepInfo } = require('../systems/reputation');
  const { formatCredits, getEffectiveMaxTransfer } = require('../utils/helpers');

  const userData = getUser(interaction.user.id, interaction.guild.id);
  const repInfo = getRepInfo(interaction.user.id, interaction.guild.id);
  const maxTransfer = getEffectiveMaxTransfer(userData.reputation);

  const embed = new EmbedBuilder()
    .setTitle('Economy')
    .setColor(config.colors.economy)
    .setDescription(
      `${divider()}\n` +
      `**Balance:** ${formatCredits(userData.credits)}\n` +
      `**Reputation:** ${repInfo.score}/100 \u00b7 ${repInfo.level.label}\n` +
      `**Max Transfer:** ${formatCredits(maxTransfer)}\n` +
      `**Transfer Fee:** ${config.economy.transferFeePercent}%\n` +
      `${divider()}\n` +
      `**Daily Reward:** ${formatCredits(config.economy.dailyReward)}\n` +
      `**Weekly Reward:** ${formatCredits(config.economy.weeklyReward)}\n` +
      `${divider()}\n` +
      `Use `/wallet` for full wallet access.`
    )
    .setTimestamp();

  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('nav_account_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
  );

  await interaction.update({ embeds: [embed], components: [backRow] });
}

async function showActivityPanel(interaction) {
  const { getUser } = require('../systems/economy');

  const userData = getUser(interaction.user.id, interaction.guild.id);

  const embed = new EmbedBuilder()
    .setTitle('Activity')
    .setColor(config.colors.primary)
    .setDescription(
      `${divider()}\n` +
      `**Total Messages:** ${userData.messages}\n` +
      `**Daily Messages:** ${userData.daily_messages || 0}\n` +
      `**Weekly Messages:** ${userData.weekly_messages || 0}\n` +
      `**Monthly Messages:** ${userData.monthly_messages || 0}\n` +
      `${divider()}`
    )
    .setTimestamp();

  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('nav_account_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
  );

  await interaction.update({ embeds: [embed], components: [backRow] });
}

async function showReputationPanel(interaction) {
  const { getRepInfo } = require('../systems/reputation');
  const repInfo = getRepInfo(interaction.user.id, interaction.guild.id);

  const restrictions = repInfo.level.restrictions.length > 0
    ? repInfo.level.restrictions.join('\n')
    : 'None';

  const embed = new EmbedBuilder()
    .setTitle('Reputation')
    .setColor(config.colors.primary)
    .setDescription(
      `${divider()}\n` +
      `**Score:** ${repInfo.score}/100\n` +
      `**Level:** ${repInfo.level.label}\n` +
      `${divider()}\n` +
      `**Restrictions:**\n${restrictions}\n` +
      `${divider()}\n` +
      'Reputation recovers slowly through good behavior.'
    )
    .setTimestamp();

  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('nav_account_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
  );

  await interaction.update({ embeds: [embed], components: [backRow] });
}

async function showAchievementsPanel(interaction) {
  const { getAchievements, getAllAchievements } = require('../systems/achievements');
  const unlocked = getAchievements(interaction.user.id, interaction.guild.id);
  const all = getAllAchievements();

  let desc = `${divider()}\n`;
  desc += `**Unlocked:** ${unlocked.length}/${all.length}\n`;
  desc += `${divider()}\n`;

  if (unlocked.length === 0) {
    desc += 'No achievements unlocked yet.';
  } else {
    for (const a of unlocked.slice(0, 10)) {
      desc += `${a.icon || ''} **${a.name}** \u2014 ${a.description}\n`;
    }
    if (unlocked.length > 10) desc += `...and ${unlocked.length - 10} more`;
  }

  const embed = new EmbedBuilder()
    .setTitle('Achievements')
    .setColor(config.colors.achievement)
    .setDescription(desc)
    .setTimestamp();

  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('nav_account_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
  );

  await interaction.update({ embeds: [embed], components: [backRow] });
}

async function showTransactionsPanel(interaction) {
  const { getTransactions } = require('../systems/economy');

  const txns = getTransactions(interaction.user.id, interaction.guild.id, 10);

  let desc = `${divider()}\n`;
  if (txns.length === 0) {
    desc += 'No transactions yet.';
  } else {
    for (const tx of txns) {
      const typeEmoji = { transfer: '\u{1F4B8}', daily: '\u{1F4C5}', weekly: '\u{1F4C6}', game: '\u{1F3AE}', giveaway: '\u{1F389}', event: '\u{1F386}', admin: '\u2699\uFE0F', refund: '\u{1F504}' }[tx.type] || '\u{1F4B3}';
      desc += `${typeEmoji} **${tx.type}** \u2014 ${tx.amount > 0 ? '+' : ''}${tx.amount} credits\n`;
    }
  }
  desc += `\n${divider()}`;

  const embed = new EmbedBuilder()
    .setTitle('Transactions')
    .setColor(config.colors.economy)
    .setDescription(desc)
    .setTimestamp();

  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('nav_account_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
  );

  await interaction.update({ embeds: [embed], components: [backRow] });
}

async function showInvitesPanel(interaction) {
  const { getInviteStats } = require('../systems/invites');

  const stats = getInviteStats(interaction.user.id, interaction.guild.id);

  const embed = new EmbedBuilder()
    .setTitle('Invites')
    .setColor(config.colors.primary)
    .setDescription(
      `${divider()}\n` +
      `**Total Invites:** ${stats.total || 0}\n` +
      `**Valid Invites:** ${stats.valid || 0}\n` +
      `**Members Who Left:** ${stats.left || 0}\n` +
      `${divider()}`
    )
    .setTimestamp();

  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('nav_account_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
  );

  await interaction.update({ embeds: [embed], components: [backRow] });
}

// === WALLET ACTION HANDLER ===

async function handleWalletAction(interaction) {
  const action = interaction.values[0];

  try {
    switch (action) {
      case 'daily': {
        const { claimDaily } = require('../systems/economy');
        const { formatCredits } = require('../utils/helpers');
        const result = claimDaily(interaction.user.id, interaction.guild.id);
        const embed = new EmbedBuilder()
          .setTitle(result.success ? 'Daily Claimed' : 'Cannot Claim')
          .setDescription(result.success ? `You claimed **${formatCredits(result.amount)}** credits.` : result.reason)
          .setColor(result.success ? config.colors.success : config.colors.error)
          .setTimestamp();
        await interaction.update({ embeds: [embed], components: [] });
        break;
      }
      case 'weekly': {
        const { claimWeekly } = require('../systems/economy');
        const { formatCredits } = require('../utils/helpers');
        const result = claimWeekly(interaction.user.id, interaction.guild.id);
        const embed = new EmbedBuilder()
          .setTitle(result.success ? 'Weekly Claimed' : 'Cannot Claim')
          .setDescription(result.success ? `You claimed **${formatCredits(result.amount)}** credits.` : result.reason)
          .setColor(result.success ? config.colors.success : config.colors.error)
          .setTimestamp();
        await interaction.update({ embeds: [embed], components: [] });
        break;
      }
      case 'transfer': {
        // Show UserSelectMenu to pick recipient
        const userSelect = new ActionRowBuilder().addComponents(
          new (require('discord.js').UserSelectMenuBuilder)()
            .setCustomId(`wallet_transfer_select_${interaction.user.id}`)
            .setPlaceholder('Select recipient...')
            .setMinValues(1)
            .setMaxValues(1)
        );
        const embed = new EmbedBuilder()
          .setTitle('Transfer Credits')
          .setDescription('Select the user you want to transfer credits to.')
          .setColor(config.colors.economy)
          .setTimestamp();
        await interaction.update({ embeds: [embed], components: [userSelect] });
        break;
      }
      case 'transactions': {
        await showTransactionsPanel(interaction);
        break;
      }
      case 'leaderboard': {
        const { getLeaderboard } = require('../systems/economy');
        const { formatCredits } = require('../utils/helpers');
        const lb = getLeaderboard(interaction.guild.id, 10);

        let desc = `${divider()}\n`;
        if (lb.length === 0) {
          desc += 'No data yet.';
        } else {
          const medals = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];
          for (let i = 0; i < lb.length; i++) {
            const medal = medals[i] || `${i + 1}.`;
            desc += `${medal} **${lb[i].username}** \u2014 ${formatCredits(lb[i].credits)}\n`;
          }
        }
        desc += `\n${divider()}`;

        const embed = new EmbedBuilder()
          .setTitle('Leaderboard')
          .setColor(config.colors.economy)
          .setDescription(desc)
          .setTimestamp();
        await interaction.update({ embeds: [embed], components: [] });
        break;
      }
      default:
        await interaction.update({ embeds: [new EmbedBuilder().setTitle('Coming Soon').setDescription('This action is under development.').setColor(config.colors.primary)], components: [] });
    }
  } catch (error) {
    console.error('[WALLET ACTION] Error:', error.message);
    await interaction.update({ embeds: [new EmbedBuilder().setTitle('Error').setDescription('Something went wrong.').setColor(config.colors.error)], components: [] }).catch(() => {});
  }
}
