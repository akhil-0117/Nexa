const { getDb } = require('../database/init');
const { createEmbed } = require('../utils/helpers');
const config = require('../config');

function getLogChannel(guildId, category) {
  const db = getDb();
  const row = db.prepare('SELECT value FROM guild_config WHERE guild_id = ? AND key = ?').get(guildId, `log_channel_${category}`);
  return row ? row.value : null;
}

function setLogChannel(guildId, category, channelId) {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO guild_config (guild_id, key, value) VALUES (?, ?, ?)').run(guildId, `log_channel_${category}`, channelId);
}

const CATEGORY_MAP = {
  warn: 'moderation', timeout: 'moderation', kick: 'moderation', ban: 'moderation',
  unban: 'moderation', mute: 'moderation', unmute: 'moderation', purge: 'moderation',
  join: 'members', leave: 'members', verification: 'members', nickname: 'members', role_change: 'members',
  message_delete: 'messages', message_edit: 'messages', spam: 'messages', automod: 'messages',
  transfer: 'economy', reward: 'economy', purchase: 'economy', admin_adjust: 'economy', refund: 'economy',
  game_create: 'games', game_start: 'games', game_bet: 'games', game_result: 'games', game_win: 'games', game_loss: 'games',
  giveaway_create: 'giveaways', giveaway_entry: 'giveaways', giveaway_end: 'giveaways', giveaway_winner: 'giveaways',
  event_create: 'events', event_register: 'events', event_end: 'events',
  ticket_create: 'tickets', ticket_claim: 'tickets', ticket_close: 'tickets', ticket_reopen: 'tickets',
  report_create: 'reports', report_claim: 'reports', report_action: 'reports',
  raid: 'security', lockdown: 'security', suspicious: 'security', verification_fail: 'security',
  staff_action: 'staff',
};

async function log(guild, category, action, details = {}) {
  const channelId = getLogChannel(guild.id, category);
  if (!channelId) return;

  const channel = guild.channels.cache.get(channelId);
  if (!channel) return;

  const fields = [];
  if (details.actor) fields.push({ name: 'Actor', value: `<@${details.actor}>`, inline: true });
  if (details.target) fields.push({ name: 'Target', value: `<@${details.target}>`, inline: true });
  if (details.reason) fields.push({ name: 'Reason', value: details.reason, inline: false });
  if (details.caseId) fields.push({ name: 'Case', value: details.caseId, inline: true });
  if (details.amount) fields.push({ name: 'Amount', value: `${details.amount} Credits`, inline: true });
  if (details.type) fields.push({ name: 'Type', value: details.type, inline: true });

  const colorMap = {
    moderation: config.colors.moderation, members: config.colors.info, messages: config.colors.warning,
    economy: config.colors.economy, games: config.colors.game, giveaways: config.colors.giveaway,
    events: config.colors.event, tickets: config.colors.ticket, reports: config.colors.warning,
    security: config.colors.security, staff: config.colors.staff,
  };

  const embed = createEmbed({
    title: `📋 ${action}`,
    color: colorMap[category] || config.colors.info,
    fields,
    footer: details.footer || `${category.toUpperCase()} LOG`,
  });

  try {
    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error(`[LOG] Failed to send log to ${channelId}:`, err.message);
  }

  // Also store in database
  const db = getDb();
  db.prepare('INSERT INTO logs (guild_id, category, action, actor_id, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(guild.id, category, action, details.actor || '', details.target || '', JSON.stringify(details), Date.now());
}

module.exports = { getLogChannel, setLogChannel, log };
