const { getDb } = require('../database/init');
const { generatePollId } = require('../utils/helpers');

function createPoll(guildId, creatorId, question, options, durationMs = 0) {
  const db = getDb();
  const id = generatePollId();
  const endTime = durationMs > 0 ? Date.now() + durationMs : 0;
  db.prepare(`INSERT INTO polls (id, guild_id, creator_id, question, options, votes, end_time, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, guildId, creatorId, question, JSON.stringify(options), '{}', endTime, 'active', Date.now());
  return { id, endTime };
}

function getPoll(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM polls WHERE id = ?').get(id);
}

function votePoll(id, userId, optionIndex) {
  const db = getDb();
  const poll = getPoll(id);
  if (!poll) return { success: false, reason: 'Poll not found' };
  if (poll.status !== 'active') return { success: false, reason: 'Poll is closed' };

  let votes = {};
  try { votes = JSON.parse(poll.votes); } catch { votes = {}; }

  // Remove previous vote
  for (const [opt, voters] of Object.entries(votes)) {
    votes[opt] = voters.filter(v => v !== userId);
  }

  const optKey = optionIndex.toString();
  if (!votes[optKey]) votes[optKey] = [];
  votes[optKey].push(userId);

  db.prepare('UPDATE polls SET votes = ? WHERE id = ?').run(JSON.stringify(votes), id);
  return { success: true };
}

function endPoll(id) {
  const db = getDb();
  db.prepare('UPDATE polls SET status = ? WHERE id = ?').run('ended', id);
  return getPoll(id);
}

function getResults(id) {
  const poll = getPoll(id);
  if (!poll) return null;

  let options, votes;
  try { options = JSON.parse(poll.options); } catch { options = []; }
  try { votes = JSON.parse(poll.votes); } catch { votes = {}; }

  const results = options.map((opt, i) => ({
    option: opt,
    votes: (votes[i.toString()] || []).length,
  }));

  const totalVotes = results.reduce((sum, r) => sum + r.votes, 0);
  return { results, totalVotes, question: poll.question };
}

module.exports = { createPoll, getPoll, votePoll, endPoll, getResults };
