const { getDb } = require('../database/init');
const { generateId } = require('../utils/helpers');

function trackInvite(code, inviterId, guildId) {
  const db = getDb();
  db.prepare('INSERT INTO invites (code, inviter_id, guild_id, uses, created_at) VALUES (?, ?, ?, 0, ?)').run(code, inviterId, guildId, Date.now());
}

function recordJoin(code, userId, guildId) {
  const db = getDb();
  const invite = db.prepare('SELECT * FROM invites WHERE code = ? AND guild_id = ?').get(code, guildId);
  if (invite) {
    db.prepare('UPDATE invites SET uses = uses + 1 WHERE code = ? AND guild_id = ?').run(code, guildId);
    db.prepare('UPDATE users SET total_invites = total_invites + 1, valid_invites = valid_invites + 1, updated_at = ? WHERE user_id = ? AND guild_id = ?')
      .run(Date.now(), invite.inviter_id, guildId);
  }
}

function recordLeave(userId, guildId) {
  const db = getDb();
  db.prepare('UPDATE users SET leaves = leaves + 1, updated_at = ? WHERE user_id = ? AND guild_id = ?').run(Date.now(), userId, guildId);
}

function getInviteStats(userId, guildId) {
  const db = getDb();
  const user = db.prepare('SELECT total_invites, valid_invites, leaves FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  return user || { total_invites: 0, valid_invites: 0, leaves: 0 };
}

function getTopInviters(guildId, limit = 10) {
  const db = getDb();
  return db.prepare('SELECT user_id, valid_invites, total_invites, leaves FROM users WHERE guild_id = ? AND valid_invites > 0 ORDER BY valid_invites DESC LIMIT ?').all(guildId, limit);
}

module.exports = { trackInvite, recordJoin, recordLeave, getInviteStats, getTopInviters };
