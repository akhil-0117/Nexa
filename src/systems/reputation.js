const { getDb } = require('../database/init');
const config = require('../config');
const { getReputationLevel } = require('../utils/helpers');

function getReputation(userId, guildId = '0') {
  const db = getDb();
  const user = db.prepare('SELECT reputation FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  return user ? user.reputation : config.reputation.initialScore;
}

function setReputation(userId, score, guildId = '0') {
  const db = getDb();
  const clamped = Math.max(config.reputation.minScore, Math.min(config.reputation.maxScore, score));
  db.prepare('UPDATE users SET reputation = ?, updated_at = ? WHERE user_id = ? AND guild_id = ?').run(clamped, Date.now(), userId, guildId);
  return clamped;
}

function modifyReputation(userId, amount, guildId = '0') {
  const current = getReputation(userId, guildId);
  return setReputation(userId, current + amount, guildId);
}

function decreaseReputation(userId, amount, reason, guildId = '0') {
  return modifyReputation(userId, -amount, guildId);
}

function increaseReputation(userId, amount, reason, guildId = '0') {
  return modifyReputation(userId, amount, guildId);
}

function recoverReputation(userId, guildId = '0') {
  const current = getReputation(userId, guildId);
  const maxScore = config.reputation.maxScore;
  if (current >= maxScore) return current;
  const recovered = Math.min(config.reputation.dailyRecovery, maxScore - current);
  if (recovered <= 0) return current;
  return modifyReputation(userId, recovered, guildId);
}

function getRepInfo(userId, guildId = '0') {
  const score = getReputation(userId, guildId);
  const level = getReputationLevel(score);
  return { score, level, restrictions: level.restrictions };
}

module.exports = { getReputation, setReputation, modifyReputation, decreaseReputation, increaseReputation, recoverReputation, getRepInfo };
