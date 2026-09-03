const { getDb } = require('../database/init');
const { generateReportId } = require('../utils/helpers');

function createReport(guildId, reporterId, targetId, reason, options = {}) {
  const db = getDb();
  const id = generateReportId();
  db.prepare(`INSERT INTO reports (id, guild_id, reporter_id, target_id, reason, evidence, message_id, channel_id, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, guildId, reporterId, targetId, reason, options.evidence || '',
    options.messageId || '', options.channelId || '', 'pending', Date.now()
  );
  return { id };
}

function getReport(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
}

function getPendingReports(guildId) {
  const db = getDb();
  return db.prepare('SELECT * FROM reports WHERE guild_id = ? AND status = ? ORDER BY created_at DESC').all(guildId, 'pending');
}

function claimReport(id, staffId) {
  const db = getDb();
  db.prepare('UPDATE reports SET claimed_by = ?, status = ? WHERE id = ?').run(staffId, 'claimed', id);
  return { success: true };
}

function resolveReport(id, staffId, resolution) {
  const db = getDb();
  db.prepare('UPDATE reports SET status = ?, resolution = ? WHERE id = ?').run('resolved', resolution, id);
  return { success: true };
}

function dismissReport(id) {
  const db = getDb();
  db.prepare('UPDATE reports SET status = ? WHERE id = ?').run('dismissed', id);
  return { success: true };
}

module.exports = { createReport, getReport, getPendingReports, claimReport, resolveReport, dismissReport };
