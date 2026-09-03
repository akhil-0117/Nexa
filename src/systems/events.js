const { getDb } = require('../database/init');
const { generateId } = require('../utils/helpers');
const { createTransaction, updateBalance } = require('./economy');
const { addXp } = require('./xp');

function createEvent(guildId, creatorId, name, options = {}) {
  const db = getDb();
  const id = generateId('EVT');
  db.prepare(`INSERT INTO events (id, guild_id, creator_id, name, description, event_type, start_time, end_time, max_participants, reward_credits, reward_xp, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, guildId, creatorId, name, options.description || '', options.eventType || 'general',
    options.startTime || 0, options.endTime || 0, options.maxParticipants || 0,
    options.rewardCredits || 0, options.rewardXp || 0, 'planned', Date.now()
  );
  return { id };
}

function getEvent(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM events WHERE id = ?').get(id);
}

function getActiveEvents(guildId) {
  const db = getDb();
  return db.prepare('SELECT * FROM events WHERE guild_id = ? AND status IN (?, ?) ORDER BY start_time ASC').all(guildId, 'planned', 'active');
}

function registerParticipant(id, userId) {
  const db = getDb();
  const event = getEvent(id);
  if (!event) return { success: false, reason: 'Event not found' };

  let participants = [];
  try { participants = JSON.parse(event.participants); } catch { participants = []; }
  if (participants.includes(userId)) return { success: false, reason: 'Already registered' };
  if (event.max_participants > 0 && participants.length >= event.max_participants) return { success: false, reason: 'Event is full' };

  participants.push(userId);
  db.prepare('UPDATE events SET participants = ? WHERE id = ?').run(JSON.stringify(participants), id);
  return { success: true, count: participants.length };
}

function endEvent(id) {
  const db = getDb();
  db.prepare('UPDATE events SET status = ? WHERE id = ?').run('ended', id);
  return { success: true };
}

function rewardParticipant(eventId, userId, guildId) {
  const event = getEvent(eventId);
  if (!event) return null;

  if (event.reward_credits > 0) {
    updateBalance(userId, event.reward_credits, guildId);
    createTransaction(userId, event.reward_credits, 'event_reward', { eventId, description: event.name });
  }
  if (event.reward_xp > 0) {
    addXp(userId, event.reward_xp, 'event', guildId);
  }

  const database = getDb();
  database.prepare('UPDATE users SET events_joined = events_joined + 1, updated_at = ? WHERE user_id = ? AND guild_id = ?').run(Date.now(), userId, guildId);

  return { credits: event.reward_credits, xp: event.reward_xp };
}

module.exports = { createEvent, getEvent, getActiveEvents, registerParticipant, endEvent, rewardParticipant };
