const { getDb } = require('../database/init');

const joinTracker = new Map();
const LOCKOUT_WINDOW = 30000;
const JOIN_THRESHOLD = 5;

function trackJoin(guildId, userId) {
  const now = Date.now();
  if (!joinTracker.has(guildId)) joinTracker.set(guildId, []);

  const joins = joinTracker.get(guildId);
  joins.push({ userId, time: now });

  const recentJoins = joins.filter(j => now - j.time < LOCKOUT_WINDOW);
  joinTracker.set(guildId, recentJoins);

  if (recentJoins.length >= JOIN_THRESHOLD) {
    return { raidDetected: true, joinCount: recentJoins.length, severity: recentJoins.length >= 10 ? 'high' : 'medium' };
  }

  return { raidDetected: false, joinCount: recentJoins.length };
}

function trackJoinWithAge(guildId, userId, accountAge) {
  const result = trackJoin(guildId, userId);
  if (accountAge && accountAge < 7 * 24 * 60 * 60 * 1000) {
    result.suspiciousAge = true;
  }
  return result;
}

function getLockdownLevel(guildId) {
  const db = getDb();
  const config_row = db.prepare('SELECT value FROM guild_config WHERE guild_id = ? AND key = ?').get(guildId, 'lockdown_level');
  return config_row ? parseInt(config_row.value) : 0;
}

function setLockdownLevel(guildId, level) {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO guild_config (guild_id, key, value) VALUES (?, ?, ?)').run(guildId, 'lockdown_level', level.toString());
}

function isRaidActive(guildId) {
  return getLockdownLevel(guildId) > 0;
}

module.exports = { trackJoin, trackJoinWithAge, getLockdownLevel, setLockdownLevel, isRaidActive };
