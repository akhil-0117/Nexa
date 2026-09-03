const { getDb } = require('../database/init');
const config = require('../config');

function getNotifications(userId, guildId) {
  const db = getDb();
  const user = db.prepare('SELECT notifications FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  if (!user) return {};
  try { return JSON.parse(user.notifications); } catch { return {}; }
}

function setNotification(userId, guildId, category, enabled) {
  const db = getDb();
  const current = getNotifications(userId, guildId);
  current[category] = enabled;
  db.prepare('UPDATE users SET notifications = ?, updated_at = ? WHERE user_id = ? AND guild_id = ?')
    .run(JSON.stringify(current), Date.now(), userId, guildId);
  return current;
}

function wantsNotification(userId, guildId, category) {
  const prefs = getNotifications(userId, guildId);
  return prefs[category] !== false; // default to true
}

module.exports = { getNotifications, setNotification, wantsNotification };
