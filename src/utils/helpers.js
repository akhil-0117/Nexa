const { EmbedBuilder } = require('discord.js');
const config = require('../config');

function generateId(prefix = 'NV') {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = `${prefix}-`;
  for (let i = 0; i < 5; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function generateCaseId() {
  return generateId('CASE');
}

function generateTransactionId() {
  return generateId('TX');
}

function generateGameId() {
  return generateId('GAME');
}

function generateGiveawayId() {
  return generateId('GW');
}

function generateTicketId() {
  return generateId('TKT');
}

function generateReportId() {
  return generateId('RPT');
}

function generateAppealId() {
  return generateId('APL');
}

function generatePartnershipId() {
  return generateId('PTR');
}

function generateStaffAppId() {
  return generateId('STA');
}

function generatePollId() {
  return generateId('POLL');
}

function generateSubmissionId() {
  return generateId('SUB');
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function formatCredits(amount) {
  return `💰 ${formatNumber(amount)} Credits`;
}

function formatTimestamp(ts) {
  if (!ts) return 'N/A';
  return `<t:${Math.floor(ts / 1000)}:R>`;
}

function formatDateTime(ts) {
  if (!ts) return 'N/A';
  return `<t:${Math.floor(ts / 1000)}:F>`;
}

function getRankForXp(xp) {
  let rank = config.ranks[0];
  for (const r of config.ranks) {
    if (xp >= r.xp) rank = r;
  }
  return rank;
}

function getXpForNextLevel(currentLevel) {
  return Math.floor(100 * Math.pow(1.5, currentLevel - 1));
}

function getReputationLevel(score) {
  for (const [key, level] of Object.entries(config.reputation.levels)) {
    if (score >= level.min && score <= level.max) {
      return { key, ...level };
    }
  }
  return { key: 'medium', ...config.reputation.levels.medium };
}

function hasReputationRestriction(reputationScore, restriction) {
  const level = getReputationLevel(reputationScore);
  return level.restrictions.includes(restriction);
}

function getEffectiveMaxBet(reputationScore, roleBonus = 1.0) {
  const repMultiplier = config.games.reputationBetMultipliers[getReputationLevel(reputationScore).key] || 1.0;
  return Math.floor(config.games.maxBetBase * repMultiplier * roleBonus);
}

function getEffectiveMaxTransfer(reputationScore, roleBonus = 1.0) {
  const repMultiplier = config.economy.reputationTransferMultipliers[getReputationLevel(reputationScore).key] || 1.0;
  return Math.floor(config.economy.maxTransferBase * repMultiplier * roleBonus);
}

function createEmbed(options) {
  const embed = new EmbedBuilder();
  if (options.title) embed.setTitle(options.title);
  if (options.description) embed.setDescription(options.description);
  if (options.color) embed.setColor(options.color);
  if (options.fields) embed.addFields(options.fields);
  if (options.footer) embed.setFooter({ text: options.footer });
  if (options.thumbnail) embed.setThumbnail(options.thumbnail);
  if (options.image) embed.setImage(options.image);
  if (options.timestamp !== false) embed.setTimestamp();
  return embed;
}

function errorEmbed(message) {
  return createEmbed({ title: '❌ Error', description: message, color: config.colors.error });
}

function successEmbed(title, message) {
  return createEmbed({ title: `✅ ${title}`, description: message, color: config.colors.success });
}

function infoEmbed(title, message) {
  return createEmbed({ title, description: message, color: config.colors.info });
}

function warningEmbed(title, message) {
  return createEmbed({ title: `⚠️ ${title}`, description: message, color: config.colors.warning });
}

function paginateItems(items, page = 1, perPage = 10) {
  const totalPages = Math.ceil(items.length / perPage);
  const safePage = Math.max(1, Math.min(page, totalPages || 1));
  const start = (safePage - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    page: safePage,
    totalPages,
    total: items.length,
  };
}

function getPaginationButtons(page, totalPages, customIdPrefix) {
  const buttons = [];
  buttons.push({
    type: 2,
    custom_id: `${customIdPrefix}_prev_${page}`,
    label: '◀',
    style: 2,
    disabled: page <= 1,
  });
  buttons.push({
    type: 2,
    custom_id: `${customIdPrefix}_page_${page}`,
    label: `${page}/${totalPages}`,
    style: 2,
    disabled: true,
  });
  buttons.push({
    type: 2,
    custom_id: `${customIdPrefix}_next_${page}`,
    label: '▶',
    style: 2,
    disabled: page >= totalPages,
  });
  return buttons;
}

function parseDuration(str) {
  const match = str.match(/^(\d+)([smhdw])$/i);
  if (!match) return 0;
  const num = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
  return num * (multipliers[unit] || 0);
}

function msToDuration(ms) {
  if (ms <= 0) return '0s';
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60000) % 60;
  const hours = Math.floor(ms / 3600000) % 24;
  const days = Math.floor(ms / 86400000);
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);
  return parts.join(' ');
}

module.exports = {
  generateId, generateCaseId, generateTransactionId, generateGameId,
  generateGiveawayId, generateTicketId, generateReportId, generateAppealId,
  generatePartnershipId, generateStaffAppId, generatePollId, generateSubmissionId,
  formatNumber, formatCredits, formatTimestamp, formatDateTime,
  getRankForXp, getXpForNextLevel, getReputationLevel, hasReputationRestriction,
  getEffectiveMaxBet, getEffectiveMaxTransfer,
  createEmbed, errorEmbed, successEmbed, infoEmbed, warningEmbed,
  paginateItems, getPaginationButtons,
  parseDuration, msToDuration,
};
