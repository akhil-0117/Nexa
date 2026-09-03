const { getDb } = require('../database/init');
const { isRaidActive, getLockdownLevel } = require('./antiRaid');

function canVerify(member, guildId) {
  const raidActive = isRaidActive(guildId);
  const lockdownLevel = getLockdownLevel(guildId);

  if (lockdownLevel >= 3) {
    const accountAge = Date.now() - (member.user?.createdTimestamp || Date.now());
    if (accountAge < 7 * 24 * 60 * 60 * 1000) {
      return { allowed: false, reason: 'Server is in critical lockdown. New accounts cannot verify yet.' };
    }
  }

  if (lockdownLevel >= 2) {
    const accountAge = Date.now() - (member.user?.createdTimestamp || Date.now());
    if (accountAge < 24 * 60 * 60 * 1000) {
      return { allowed: false, reason: 'Enhanced verification active. Account too new.' };
    }
  }

  return { allowed: true };
}

function verifyUser(userId, guildId) {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO verifications (user_id, guild_id, status, method, verified_at, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(userId, guildId, 'verified', 'button', Date.now(), Date.now());
  db.prepare('UPDATE users SET verified = 1, updated_at = ? WHERE user_id = ? AND guild_id = ?').run(Date.now(), userId, guildId);
  return { success: true };
}

function isVerified(userId, guildId) {
  const db = getDb();
  const v = db.prepare('SELECT status FROM verifications WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  return v && v.status === 'verified';
}

module.exports = { canVerify, verifyUser, isVerified };
