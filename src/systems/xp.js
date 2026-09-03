const { getDb } = require('../database/init');
const config = require('../config');
const { getRankForXp, getXpForNextLevel } = require('../utils/helpers');

function addXp(userId, amount, reason = 'message', guildId = '0') {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  if (!user) return null;

  const now = Date.now();
  const timeSinceLastXp = now - (user.last_xp_time || 0);

  if (reason === 'message' && timeSinceLastXp < config.xp.messageCooldownMs) {
    return { leveled: false, rateLimited: true };
  }

  let totalXp = user.total_xp + amount;
  let userXp = user.xp + amount;
  let level = user.level;

  const xpNeeded = getXpForNextLevel(level);
  let leveled = false;

  while (userXp >= xpNeeded) {
    userXp -= xpNeeded;
    level++;
    leveled = true;
  }

  db.prepare(`UPDATE users SET xp = ?, total_xp = ?, level = ?, last_xp_time = ?, updated_at = ? WHERE user_id = ? AND guild_id = ?`)
    .run(userXp, totalXp, level, now, now, userId, guildId);

  const newRank = getRankForXp(totalXp);

  return { leveled, level, xp: userXp, totalXp, rank: newRank };
}

function checkLevelUp(userId, guildId = '0') {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  if (!user) return null;

  const xpNeeded = getXpForNextLevel(user.level);
  if (user.xp >= xpNeeded) {
    const result = addXp(userId, 0, 'level_check', guildId);
    return result;
  }
  return null;
}

function getXpInfo(userId, guildId = '0') {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  if (!user) return null;

  const rank = getRankForXp(user.total_xp);
  const xpNeeded = getXpForNextLevel(user.level);
  const nextRank = config.ranks.find(r => r.xp > user.total_xp) || config.ranks[config.ranks.length - 1];

  return {
    level: user.level,
    xp: user.xp,
    totalXp: user.total_xp,
    xpNeeded,
    rank,
    nextRank,
    progress: Math.floor((user.xp / xpNeeded) * 100),
  };
}

module.exports = { addXp, checkLevelUp, getXpInfo };
