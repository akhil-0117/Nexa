const { getDb } = require('../database/init');

function getConfig(guildId, key, defaultValue = '') {
  const db = getDb();
  const row = db.prepare('SELECT value FROM guild_config WHERE guild_id = ? AND key = ?').get(guildId, key);
  return row ? row.value : defaultValue;
}

function setConfig(guildId, key, value) {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO guild_config (guild_id, key, value) VALUES (?, ?, ?)').run(guildId, key, value.toString());
  return { success: true };
}

function getAllConfig(guildId) {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM guild_config WHERE guild_id = ?').all(guildId);
  const config = {};
  for (const row of rows) config[row.key] = row.value;
  return config;
}

function deleteConfig(guildId, key) {
  const db = getDb();
  db.prepare('DELETE FROM guild_config WHERE guild_id = ? AND key = ?').run(guildId, key);
  return { success: true };
}

module.exports = { getConfig, setConfig, getAllConfig, deleteConfig };
