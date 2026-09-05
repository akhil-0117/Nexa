// Security utilities for NEXAVERSE bot
// Rate limiting, anti-exploit, input validation

const { Collection } = require('discord.js');

// Rate limiter: tracks actions per user
const rateLimits = new Collection();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_ACTIONS_PER_WINDOW = 10;

// Duplicate interaction prevention
const processedInteractions = new Collection();
const INTERACTION_TTL = 300000; // 5 minutes

// Active game sessions per user (prevent multi-game abuse)
const activeGames = new Collection();

/**
 * Check if a user is rate limited
 * @param {string} userId
 * @param {string} action - action type for separate buckets
 * @returns {{ allowed: boolean, retryAfter: number }}
 */
function checkRateLimit(userId, action = 'default') {
  const key = `${userId}:${action}`;
  const now = Date.now();
  
  if (!rateLimits.has(key)) {
    rateLimits.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfter: 0 };
  }
  
  const limit = rateLimits.get(key);
  
  // Reset window if expired
  if (now - limit.windowStart > RATE_LIMIT_WINDOW) {
    limit.count = 1;
    limit.windowStart = now;
    return { allowed: true, retryAfter: 0 };
  }
  
  limit.count++;
  
  if (limit.count > MAX_ACTIONS_PER_WINDOW) {
    const retryAfter = RATE_LIMIT_WINDOW - (now - limit.windowStart);
    return { allowed: false, retryAfter };
  }
  
  return { allowed: true, retryAfter: 0 };
}

/**
 * Prevent duplicate interaction processing
 * @param {string} interactionId
 * @returns {boolean} true if this is a new interaction (should process)
 */
function isNewInteraction(interactionId) {
  if (processedInteractions.has(interactionId)) {
    return false;
  }
  processedInteractions.set(interactionId, Date.now());
  
  // Cleanup old entries periodically
  if (processedInteractions.size > 1000) {
    const cutoff = Date.now() - INTERACTION_TTL;
    for (const [id, timestamp] of processedInteractions) {
      if (timestamp < cutoff) processedInteractions.delete(id);
    }
  }
  
  return true;
}

/**
 * Check if user can start a new game (prevent multi-game abuse)
 * @param {string} userId
 * @returns {boolean}
 */
function canStartGame(userId) {
  const userGames = activeGames.get(userId) || 0;
  if (userGames >= 3) return false; // Max 3 concurrent games
  activeGames.set(userId, userGames + 1);
  return true;
}

/**
 * Mark a game as finished for a user
 * @param {string} userId
 */
function finishGame(userId) {
  const current = activeGames.get(userId) || 0;
  if (current <= 1) {
    activeGames.delete(userId);
  } else {
    activeGames.set(userId, current - 1);
  }
}

/**
 * Validate transfer input
 * @param {object} params
 * @returns {{ valid: boolean, error?: string }}
 */
function validateTransfer({ senderId, recipientId, amount, balance }) {
  if (senderId === recipientId) {
    return { valid: false, error: 'Cannot transfer to yourself.' };
  }
  if (!amount || amount <= 0) {
    return { valid: false, error: 'Amount must be positive.' };
  }
  if (!Number.isInteger(amount)) {
    return { valid: false, error: 'Amount must be a whole number.' };
  }
  if (amount > 1000000) {
    return { valid: false, error: 'Maximum single transfer is 1,000,000 Credits.' };
  }
  if (amount > balance) {
    return { valid: false, error: 'Insufficient balance.' };
  }
  return { valid: true };
}

/**
 * Validate bet input
 * @param {number} amount
 * @param {number} balance
 * @param {number} maxBet
 * @returns {{ valid: boolean, error?: string }}
 */
function validateBet(amount, balance, maxBet) {
  if (!amount || amount <= 0) {
    return { valid: false, error: 'Bet must be positive.' };
  }
  if (!Number.isInteger(amount)) {
    return { valid: false, error: 'Bet must be a whole number.' };
  }
  if (amount > balance) {
    return { valid: false, error: 'Insufficient balance.' };
  }
  if (amount > maxBet) {
    return { valid: false, error: `Maximum bet is ${maxBet} Credits.` };
  }
  return { valid: true };
}

/**
 * Check if a user is exploiting (suspicious activity detection)
 * @param {string} userId
 * @returns {{ suspicious: boolean, reason?: string }}
 */
function checkSuspiciousActivity(userId) {
  const key = `${userId}:transfer`;
  const limit = rateLimits.get(key);
  
  if (limit && limit.count > 5) {
    return { suspicious: true, reason: 'Excessive transfers in short period.' };
  }
  
  return { suspicious: false };
}

/**
 * Sanitize user input to prevent injection
 * @param {string} input
 * @returns {string}
 */
function sanitize(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>@!]/g, '')
    .trim()
    .substring(0, 500);
}

// Cleanup rate limits every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - RATE_LIMIT_WINDOW * 2;
  for (const [key, data] of rateLimits) {
    if (data.windowStart < cutoff) rateLimits.delete(key);
  }
}, 300000);

module.exports = {
  checkRateLimit,
  isNewInteraction,
  canStartGame,
  finishGame,
  validateTransfer,
  validateBet,
  checkSuspiciousActivity,
  sanitize,
};
