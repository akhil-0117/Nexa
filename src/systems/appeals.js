const { getDb } = require('../database/init');
const { generateAppealId } = require('../utils/helpers');

function createAppeal(guildId, userId, caseId, reason, additionalInfo = '') {
  const db = getDb();
  const id = generateAppealId();
  db.prepare(`INSERT INTO appeals (id, guild_id, user_id, case_id, reason, additional_info, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, guildId, userId, caseId, reason, additionalInfo, 'pending', Date.now());
  return { id };
}

function getAppeal(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM appeals WHERE id = ?').get(id);
}

function getPendingAppeals(guildId) {
  const db = getDb();
  return db.prepare('SELECT * FROM appeals WHERE guild_id = ? AND status = ? ORDER BY created_at DESC').all(guildId, 'pending');
}

function reviewAppeal(id, staffId, decision) {
  const db = getDb();
  db.prepare('UPDATE appeals SET reviewed_by = ?, decision = ?, status = ? WHERE id = ?').run(staffId, decision, 'reviewed', id);
  return { success: true };
}

function acceptAppeal(id, staffId) {
  const db = getDb();
  db.prepare('UPDATE appeals SET reviewed_by = ?, decision = ?, status = ? WHERE id = ?').run(staffId, 'accepted', 'accepted', id);
  return { success: true };
}

function rejectAppeal(id, staffId) {
  const db = getDb();
  db.prepare('UPDATE appeals SET reviewed_by = ?, decision = ?, status = ? WHERE id = ?').run(staffId, 'rejected', 'rejected', id);
  return { success: true };
}

module.exports = { createAppeal, getAppeal, getPendingAppeals, reviewAppeal, acceptAppeal, rejectAppeal };
