const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { isAdmin, getStaffLevel } = require('../utils/permissions');
const { getConfig, setConfig } = require('../systems/config');
const config = require('../config');

// Editable settings per category: key -> { label, default, kind }
// kind: 'number' | 'text' | 'onoff'
const CATEGORY_SETTINGS = {
  economy: {
    title: 'Economy',
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
    settings: {
      initial_score: { label: 'Initial Score', default: String(config.reputation.initialScore), kind: 'number' },
      warn_decrease: { label: 'Warn Decrease', default: String(config.reputation.warnDecrease), kind: 'number' },
      spam_decrease: { label: 'Spam Decrease', default: String(config.reputation.spamDecrease), kind: 'number' },
      daily_recovery: { label: 'Daily Recovery', default: String(config.reputation.dailyRecovery), kind: 'number' },
    },
  },
  moderation: {
    title: 'Moderation',
    settings: {
      mod_log_enabled: { label: 'Moderation Logging', default: '1', kind: 'onoff' },
      dm_on_action: { label: 'DM Users On Mod Action', default: '1', kind: 'onoff' },
      require_reason: { label: 'Require Reason Always', default: '1', kind: 'onoff' },
    },
  },
  automod: {
    title: 'Automod',
    settings: {
      automod_enabled: { label: 'Automod Enabled', default: '1', kind: 'onoff' },
      badwords_enabled: { label: 'Bad Words Filter', default: '1', kind: 'onoff' },
      badwords_action: { label: 'Bad Words Action', default: 'warn', kind: 'text' },
      link_filter: { label: 'Block Invite Links', default: '1', kind: 'onoff' },
    },
  },
  antispam: {
    title: 'Anti-Spam',
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

function buildHomeEmbed(guild) {
  const embed = new EmbedBuilder()
    .setAuthor({ name: `${guild.name} \u2014 Configuration`, iconURL: guild.iconURL({ dynamic: true }) || undefined })
    .setTitle('NEXAVERSE \u00b7 Server Settings')
    .setColor(config.colors.staff)
    .setDescription(
      `Select a category from the dropdown to view and edit its settings.\n\n` +
      `**Categories**\n` +
      `Economy \u2014 rewards, fees, starting balance\n` +
      `XP & Levels \u2014 XP rates and cooldowns\n` +
      `Reputation \u2014 penalties and recovery\n` +
      `Moderation \u2014 logging and DM behavior\n` +
      `Automod \u2014 filters and actions\n` +
      `Anti-Spam \u2014 thresholds\n` +
      `Credits Manager \u2014 add / set / remove user credits\n` +
      `${divider()}`
    )
    .setFooter({ text: 'Changes apply instantly and are logged' })
    .setTimestamp();

  const select = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('config_select')
      .setPlaceholder('Select a category...')
      .addOptions([
        { label: 'Economy', value: 'economy', description: 'Rewards, fees, limits' },
        { label: 'XP & Levels', value: 'xp', description: 'XP rates and cooldowns' },
        { label: 'Reputation', value: 'reputation', description: 'Penalties and recovery' },
        { label: 'Moderation', value: 'moderation', description: 'Logging and DM behavior' },
        { label: 'Automod', value: 'automod', description: 'Filters and actions' },
        { label: 'Anti-Spam', value: 'antispam', description: 'Spam thresholds' },
        { label: 'Credits Manager', value: 'credits', description: 'Add / set / remove credits' },
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

    const { embed, select } = buildHomeEmbed(interaction.guild);
    await interaction.editReply({ embeds: [embed], components: [select] });
  },
};

module.exports.CATEGORY_SETTINGS = CATEGORY_SETTINGS;
module.exports.buildHomeEmbed = buildHomeEmbed;
module.exports.getSettingValue = getSettingValue;
module.exports.divider = divider;
