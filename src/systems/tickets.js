const { getDb } = require('../database/init');
const { generateTicketId } = require('../utils/helpers');

function createTicket(guildId, creatorId, category, subject = '') {
  const db = getDb();
  const id = generateTicketId();
  db.prepare(`INSERT INTO tickets (id, guild_id, creator_id, category, subject, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, guildId, creatorId, category, subject, 'open', Date.now());
  return { id };
}

function getTicket(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
}

function getOpenTickets(guildId) {
  const db = getDb();
  return db.prepare('SELECT * FROM tickets WHERE guild_id = ? AND status IN (?, ?) ORDER BY created_at DESC').all(guildId, 'open', 'claimed');
}

function claimTicket(id, staffId) {
  const db = getDb();
  db.prepare('UPDATE tickets SET claimed_by = ?, status = ?, assigned_to = ? WHERE id = ?').run(staffId, 'claimed', staffId, id);
  return { success: true };
}

function closeTicket(id) {
  const db = getDb();
  db.prepare('UPDATE tickets SET status = ?, closed_at = ? WHERE id = ?').run('closed', Date.now(), id);
  return { success: true };
}

function reopenTicket(id) {
  const db = getDb();
  db.prepare('UPDATE tickets SET status = ?, closed_at = 0 WHERE id = ?').run('open', id);
  return { success: true };
}

function setChannel(id, channelId) {
  const db = getDb();
  db.prepare('UPDATE tickets SET channel_id = ? WHERE id = ?').run(channelId, id);
}

function incrementMessages(id) {
  const db = getDb();
  db.prepare('UPDATE tickets SET messages_count = messages_count + 1 WHERE id = ?').run(id);
}

function getUserTickets(userId, guildId) {
  const db = getDb();
  return db.prepare('SELECT * FROM tickets WHERE creator_id = ? AND guild_id = ? ORDER BY created_at DESC LIMIT 20').all(userId, guildId);
}

module.exports = { createTicket, getTicket, getOpenTickets, claimTicket, closeTicket, reopenTicket, setChannel, incrementMessages, getUserTickets };
