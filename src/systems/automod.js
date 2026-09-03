const { getDb } = require('../database/init');
const config = require('../config');

const spamCache = new Map();

const SCAM_PATTERNS = [
  /discord\.gg\/\w+/i,
  /free\s*nitro/i,
  /steam.*gift/i,
  /click.*here.*win/i,
  /congratulations.*won/i,
  /verify.*account.*link/i,
];

const CAPS_THRESHOLD = 0.7;
const MENTION_THRESHOLD = 5;
const REPEATED_CHARS_THRESHOLD = 5;
const DUPLICATE_WINDOW = 10000;

function checkMessage(message, client) {
  const { content, author, channel, guild } = message;
  if (!content || author.bot) return null;

  const violations = [];

  if (SCAM_PATTERNS.some(p => p.test(content))) {
    violations.push({ type: 'scam_link', action: 'delete_warn', severity: 'high' });
  }

  const uppercaseRatio = (content.replace(/[^A-Z]/g, '').length) / content.length;
  if (content.length > 10 && uppercaseRatio > CAPS_THRESHOLD) {
    violations.push({ type: 'caps_abuse', action: 'warn', severity: 'low' });
  }

  const mentionCount = content.match(/<@!?\d+>/g)?.length || 0;
  if (mentionCount > MENTION_THRESHOLD) {
    violations.push({ type: 'mass_mentions', action: 'delete_warn', severity: 'medium' });
  }

  if (/(.)\1{REPEATED_CHARS_THRESHOLD,}/i.test(content)) {
    violations.push({ type: 'repeated_chars', action: 'warn', severity: 'low' });
  }

  const inviteMatch = content.match(/discord\.gg\/(\w+)/i);
  if (inviteMatch && !channel.permissionsFor(author)?.has('ManageMessages')) {
    violations.push({ type: 'invite_link', action: 'delete', severity: 'medium' });
  }

  return violations.length > 0 ? violations : null;
}

function checkSpam(userId, guildId, content) {
  const key = `${userId}_${guildId}`;
  const now = Date.now();

  if (!spamCache.has(key)) {
    spamCache.set(key, { messages: [], count: 0 });
  }

  const tracking = spamCache.get(key);
  tracking.messages.push({ content, time: now });
  tracking.messages = tracking.messages.filter(m => now - m.time < DUPLICATE_WINDOW);
  tracking.count = tracking.messages.length;

  let spamDetected = false;
  let spamType = null;

  const similarCount = tracking.messages.filter(m =>
    levenshteinDistance(m.content.toLowerCase(), content.toLowerCase()) < 5
  ).length;

  if (similarCount >= 3) {
    spamDetected = true;
    spamType = 'duplicate_messages';
  }

  if (tracking.count >= 5) {
    spamDetected = true;
    spamType = spamType || 'message_flooding';
  }

  return { spamDetected, spamType, messageCount: tracking.count };
}

function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i - 1] === a[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

// Cleanup old spam cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, tracking] of spamCache.entries()) {
    tracking.messages = tracking.messages.filter(m => now - m.time < DUPLICATE_WINDOW);
    if (tracking.messages.length === 0) spamCache.delete(key);
  }
}, 60000);

module.exports = { checkMessage, checkSpam };
