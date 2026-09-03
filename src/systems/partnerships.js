const { getDb } = require('../database/init');
const { generatePartnershipId } = require('../utils/helpers');

function createPartnership(guildId, userId, data) {
  const db = getDb();
  const id = generatePartnershipId();
  db.prepare(`INSERT INTO partnerships (id, guild_id, user_id, server_name, owner, member_count, server_age, invite, description, reason, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, guildId, userId, data.serverName, data.owner || '', data.memberCount || 0,
    data.serverAge || '', data.invite || '', data.description || '', data.reason || '', 'pending', Date.now()
  );
  return { id };
}

function getPartnership(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM partnerships WHERE id = ?').get(id);
}

function getPendingPartnerships(guildId) {
  const db = getDb();
  return db.prepare('SELECT * FROM partnerships WHERE guild_id = ? AND status = ? ORDER BY created_at DESC').all(guildId, 'pending');
}

function acceptPartnership(id, staffId) {
  const db = getDb();
  db.prepare('UPDATE partnerships SET reviewed_by = ?, status = ? WHERE id = ?').run(staffId, 'accepted', id);
  return { success: true };
}

function rejectPartnership(id, staffId) {
  const db = getDb();
  db.prepare('UPDATE partnerships SET reviewed_by = ?, status = ? WHERE id = ?').run(staffId, 'rejected', id);
  return { success: true };
}

module.exports = { createPartnership, getPartnership, getPendingPartnerships, acceptPartnership, rejectPartnership };
