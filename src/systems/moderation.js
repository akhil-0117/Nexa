const { getDb } = require('../database/init');
const config = require('../config');
const { generateCaseId, formatDateTime } = require('../utils/helpers');
const { decreaseReputation } = require('./reputation');
const { createTransaction } = require('./economy');

function createCase(userId, moderatorId, action, reason, options = {}) {
  const db = getDb();
  const caseId = generateCaseId();
  const repChange = options.reputationChange || 0;

  db.prepare(`INSERT INTO cases (id, user_id, moderator_id, action, reason, evidence, duration, reputation_change, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    caseId, userId, moderatorId, action, reason, options.evidence || '',
    options.duration || 0, repChange, 'active', Date.now()
  );

  if (repChange !== 0) {
    decreaseReputation(userId, Math.abs(repChange), action, options.guildId || '0');
  }

  return caseId;
}

function getCase(caseId) {
  const db = getDb();
  return db.prepare('SELECT * FROM cases WHERE id = ?').get(caseId);
}

function getUserCases(userId, limit = 50) {
  const db = getDb();
  return db.prepare('SELECT * FROM cases WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(userId, limit);
}

function warn(userId, moderatorId, reason, guildId = '0') {
  const repDecrease = config.reputation.warnDecrease;
  const caseId = createCase(userId, moderatorId, 'warn', reason, { reputationChange: repDecrease, guildId });

  const db = getDb();
  db.prepare(`INSERT INTO warnings (case_id, user_id, moderator_id, reason, severity, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(caseId, userId, moderatorId, reason, 'minor', 'active', Date.now());

  const warnCount = db.prepare('SELECT COUNT(*) as count FROM warnings WHERE user_id = ? AND status = ?').get(userId, 'active');

  return { caseId, warnCount: warnCount.count, reputationDecrease: repDecrease };
}

function getWarnings(userId) {
  const db = getDb();
  return db.prepare('SELECT * FROM warnings WHERE user_id = ? AND status = ? ORDER BY created_at DESC').all(userId, 'active');
}

let db;

function timeout(userId, moderatorId, durationMs, reason, guildId = '0') {
  const caseId = createCase(userId, moderatorId, 'timeout', reason, { duration: durationMs, reputationChange: 3, guildId });
  return { caseId };
}

function removeTimeout(userId, moderatorId, reason, guildId = '0') {
  const caseId = createCase(userId, moderatorId, 'untimeout', reason, { guildId });
  return { caseId };
}

function kick(userId, moderatorId, reason, guildId = '0') {
  const caseId = createCase(userId, moderatorId, 'kick', reason, { reputationChange: 10, guildId });
  return { caseId };
}

function ban(userId, moderatorId, reason, options = {}) {
  const caseId = createCase(userId, moderatorId, 'ban', reason, { reputationChange: 15, duration: options.deleteDays ? options.deleteDays * 86400000 : 0, ...options });
  return { caseId };
}

function unban(userId, moderatorId, reason, guildId = '0') {
  const caseId = createCase(userId, moderatorId, 'unban', reason, { guildId });
  const dbInstance = getDb();
  dbInstance.prepare('UPDATE cases SET status = ? WHERE user_id = ? AND action = ? AND status = ?').run('resolved', userId, 'ban', 'active');
  return { caseId };
}

function mute(userId, moderatorId, reason, guildId = '0') {
  const caseId = createCase(userId, moderatorId, 'mute', reason, { reputationChange: 5, guildId });
  return { caseId };
}

function unmute(userId, moderatorId, reason, guildId = '0') {
  const caseId = createCase(userId, moderatorId, 'unmute', reason, { guildId });
  return { caseId };
}

module.exports = {
  createCase, getCase, getUserCases, warn, getWarnings,
  timeout, removeTimeout, kick, ban, unban, mute, unmute,
};
