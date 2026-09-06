const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { isAdmin, getStaffLevel } = require('../utils/permissions');
const { getConfig, setConfig } = require('../systems/config');
const config = require('../config');
const { generateDarkBanner } = require('../utils/images');

// Editable settings per category
const CATEGORY_SETTINGS = {
  economy: {
    title: 'Economy',
    emoji: '\uD83D\uDCB0',
    settings: {
      daily_reward: { label: 'Daily Reward', default: String(config.economy.dailyReward), kind: 'number' },
      weekly_reward: { label: 'Weekly Reward', default: String(config.economy.weeklyReward), kind: 'number' },
      starting_balance: { label: 'Starting Balance', default: String(config.economy.startingBalance), kind: 'number' },
      transfer_fee_percent: { label: 'Transfer Fee %', default: String(config.economy.transferFeePercent), kind: 'number' },
      min_transfer: { label: 'Minimum Transfer', default: String(config.economy.minTransfer), kind: 'number' },
    },
  },
  xp: {
    title: 'XP & Levels',
    emoji: '\u2B50',
    settings: {
      message_xp_min: { label: 'XP Per Message (min)', default: String(config.xp.messageXpMin), kind: 'number' },
      message_xp_max: { label: 'XP Per Message (max)', default: String(config.xp.messageXpMax), kind: 'number' },
      message_cooldown_s: { label: 'XP Cooldown (seconds)', default: String(Math.round(config.xp.messageCooldownMs / 1000)), kind: 'number' },
      game_win_xp: { label: 'Game Win XP', default: String(config.xp.gameWinXp), kind: 'number' },
      invite_xp: { label: 'Invite XP', default: String(config.xp.inviteXp), kind: 'number' },
    },
  },
  reputation: {
    title: 'Reputation',
    emoji: '\u2B50',
    settings: {
      initial_score: { label: 'Initial Score', default: String(config.reputation.initialScore), kind: 'number' },
      warn_decrease: { label: 'Warn Decrease', default: String(config.reputation.warnDecrease), kind: 'number' },
      spam_decrease: { label: 'Spam Decrease', default: String(config.reputation.spamDecrease), kind: 'number' },
      daily_recovery: { label: 'Daily Recovery', default: String(config.reputation.dailyRecovery), kind: 'number' },
    },
  },
  moderation: {
    title: 'Moderation',
    emoji: '\uD83D\uDD28',
    settings: {
      mod_log_enabled: { label: 'Moderation Logging', default: '1', kind: 'onoff' },
      dm_on_action: { label: 'DM Users On Mod Action', default: '1', kind: 'onoff' },
      require_reason: { label: 'Require Reason Always', default: '1', kind: 'onoff' },
    },
  },
  automod: {
    title: 'Automod',
    emoji: '\uD83D\uDEE1\uFE0F',
    settings: {
      automod_enabled: { label: 'Automod Enabled', default: '1', kind: 'onoff' },
      badwords_enabled: { label: 'Bad Words Filter', default: '1', kind: 'onoff' },
      badwords_action: { label: 'Bad Words Action', default: 'warn', kind: 'text' },
      link_filter: { label: 'Block Invite Links', default: '1', kind: 'onoff' },
    },
  },
  antispam: {
    title: 'Anti-Spam',
    emoji: '\uD83D\uDEAB',
    settings: {
      antispam_enabled: { label: 'Anti-Spam Enabled', default: '1', kind: 'onoff' },
      spam_max_messages: { label: 'Max Messages (per window)', default: '7', kind: 'number' },
      spam_window_s: { label: 'Window (seconds)', default: '10', kind: 'number' },
    },
  },
};

function divider() {
  return '\u2501'.repeat(32);
}

function getSettingValue(guildId, key, def) {
  return getConfig(guildId, `cfg_${key}`, def);
}

function buildHomeEmbed(guild, banner) {
  const embed = new EmbedBuilder()
    .setColor(config.colors.staff)
    .setDescription(
      `Select a category from the dropdown to view and edit its settings.\n\n` +
      `**Categories**\n` +
      `\uD83D\uDCB0 Economy \u2014 rewards, fees, starting balance\n` +
      `\u2B50 XP & Levels \u2014 XP rates and cooldowns\n` +
      `\uD83C\uDFAF Reputation \u2014 penalties and recovery\n` +
      `\uD83D\uDD28 Moderation \u2014 logging and DM behavior\n` +
      `\uD83D\uDEE1\uFE0F Automod \u2014 filters and actions\n` +
      `\uD83D\uDEAB Anti-Spam \u2014 thresholds\n` +
      `\uD83D\uDCB3 Credits Manager \u2014 add / set / remove user credits\n\n` +
      `${divider()}\n` +
      `Changes apply instantly and are logged to the staff channel.`
    )
    .setFooter({ text: 'NEXAVERSE Configuration' })
    .setTimestamp();

  if (banner) {
    embed.setImage('attachment://banner.png');
  }

  const select = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('config_select')
      .setPlaceholder('Select a category...')
      .addOptions([
        { label: '\uD83D\uDCB0 Economy', value: 'economy', description: 'Rewards, fees, limits' },
        { label: '\u2B50 XP & Levels', value: 'xp', description: 'XP rates and cooldowns' },
        { label: '\uD83C\uDFAF Reputation', value: 'reputation', description: 'Penalties and recovery' },
        { label: '\uD83D\uDD28 Moderation', value: 'moderation', description: 'Logging and DM behavior' },
        { label: '\uD83D\uDEE1\uFE0F Automod', value: 'automod', description: 'Filters and actions' },
        { label: '\uD83D\uDEAB Anti-Spam', value: 'antispam', description: 'Spam thresholds' },
        { label: '\uD83D\uDCB3 Credits Manager', value: 'credits', description: 'Add / set / remove credits' },
      ])
  );

  return { embed, select };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Server configuration panel (Admin only)'),

  async execute(interaction) {
    const level = getStaffLevel(interaction.member);
    if (!isAdmin(interaction.member) && level < 4) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setTitle('Access Denied').setDescription('Administrator or Head of Staff required.').setColor(config.colors.error)],
        flags: 64,
      });
    }

    await interaction.deferReply();

    const banner = await generateDarkBanner('NEXAVERSE', 'CONFIGURATION');
    const { embed, select } = buildHomeEmbed(interaction.guild, banner);
    await interaction.editReply({ embeds: [embed], files: [banner], components: [select] });
  },
};

module.exports.CATEGORY_SETTINGS = CATEGORY_SETTINGS;
module.exports.buildHomeEmbed = buildHomeEmbed;
module.exports.getSettingValue = getSettingValue;
module.exports.divider = divider;
