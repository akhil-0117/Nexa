const { getDb } = require('../database/init');
const config = require('../config');
const { generateGiveawayId } = require('../utils/helpers');
const { getUser, createTransaction, updateBalance } = require('./economy');

function createGiveaway(guildId, channelId, creatorId, prize, durationMs, options = {}) {
  const db = getDb();
  const id = generateGiveawayId();
  const endTime = Date.now() + durationMs;

  db.prepare(`INSERT INTO giveaways (id, guild_id, channel_id, creator_id, prize, description, winner_count, end_time,
    required_role, min_level, min_reputation, min_invites, min_account_age, min_server_age, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, guildId, channelId, creatorId, prize, options.description || '', options.winnerCount || 1,
    endTime, options.requiredRole || '', options.minLevel || 0, options.minReputation || 0,
    options.minInvites || 0, options.minAccountAge || 0, options.minServerAge || 0, 'active', Date.now()
  );
  return { id, endTime };
}

function getGiveaway(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM giveaways WHERE id = ?').get(id);
}

function getActiveGiveaways(guildId) {
  const db = getDb();
  return db.prepare('SELECT * FROM giveaways WHERE guild_id = ? AND status = ? AND end_time > ?').all(guildId, 'active', Date.now());
}

function enterGiveaway(id, userId, guildId) {
  const db = getDb();
  const giveaway = getGiveaway(id);
  if (!giveaway) return { success: false, reason: 'Giveaway not found' };
  if (giveaway.status !== 'active') return { success: false, reason: 'Giveaway is no longer active' };
  if (Date.now() > giveaway.end_time) return { success: false, reason: 'Giveaway has ended' };

  let entries = [];
  try { entries = JSON.parse(giveaway.entries); } catch { entries = []; }
  if (entries.includes(userId)) return { success: false, reason: 'You already entered' };

  const user = getUser(userId, guildId);
  if (!user) return { success: false, reason: 'Account not found' };

  if (giveaway.min_level > 0 && user.level < giveaway.min_level) return { success: false, reason: `Requires level ${giveaway.min_level}` };
  if (giveaway.min_reputation > 0 && user.reputation < giveaway.min_reputation) return { success: false, reason: `Requires ${giveaway.min_reputation} reputation` };
  if (giveaway.min_invites > 0 && user.valid_invites < giveaway.min_invites) return { success: false, reason: `Requires ${giveaway.min_invites} valid invites` };

  entries.push(userId);
  db.prepare('UPDATE giveaways SET entries = ? WHERE id = ?').run(JSON.stringify(entries), id);
  return { success: true, entryCount: entries.length };
}

function endGiveaway(id) {
  const db = getDb();
  const giveaway = getGiveaway(id);
  if (!giveaway) return { success: false, reason: 'Giveaway not found' };

  let entries = [];
  try { entries = JSON.parse(giveaway.entries); } catch { entries = []; }

  let winners = [];
  if (entries.length > 0) {
    const shuffled = [...entries].sort(() => 0.5 - Math.random());
    winners = shuffled.slice(0, giveaway.winner_count);
  }

  db.prepare('UPDATE giveaways SET winners = ?, status = ? WHERE id = ?').run(JSON.stringify(winners), 'ended', id);

  return { winners, entryCount: entries.length };
}

function rerollGiveaway(id) {
  const db = getDb();
  const giveaway = getGiveaway(id);
  if (!giveaway) return { success: false, reason: 'Giveaway not found' };

  let entries = [];
  try { entries = JSON.parse(giveaway.entries); } catch { entries = []; }
  let oldWinners = [];
  try { oldWinners = JSON.parse(giveaway.winners); } catch { oldWinners = []; }

  const available = entries.filter(e => !oldWinners.includes(e));
  if (available.length === 0) return { success: false, reason: 'No eligible entries remaining' };

  const newWinners = available.sort(() => 0.5 - Math.random()).slice(0, giveaway.winner_count);
  db.prepare('UPDATE giveaways SET winners = ?, rerolls = rerolls + 1 WHERE id = ?').run(JSON.stringify(newWinners), id);

  return { winners: newWinners };
}

function cancelGiveaway(id) {
  const db = getDb();
  db.prepare('UPDATE giveaways SET status = ? WHERE id = ?').run('cancelled', id);
  return { success: true };
}

module.exports = { createGiveaway, getGiveaway, getActiveGiveaways, enterGiveaway, endGiveaway, rerollGiveaway, cancelGiveaway };
