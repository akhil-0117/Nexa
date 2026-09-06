const { getDb } = require('../database/init');
const config = require('../config');
const { generateTransactionId, getReputationLevel, getEffectiveMaxTransfer, getStaffRole } = require('../utils/helpers');

function getUser(userId, guildId = '0') {
  const db = getDb();
  let user = db.prepare('SELECT * FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  if (!user) {
    db.prepare('INSERT OR IGNORE INTO users (user_id, guild_id, credits, reputation, created_at) VALUES (?, ?, ?, ?, ?)').run(
      userId, guildId, config.economy.startingBalance, config.reputation.initialScore, Date.now()
    );
    user = db.prepare('SELECT * FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  }
  return user;
}

function updateBalance(userId, amount, guildId = '0') {
  const db = getDb();
  getUser(userId, guildId);
  db.prepare('UPDATE users SET credits = credits + ?, updated_at = ? WHERE user_id = ? AND guild_id = ?').run(amount, Date.now(), userId, guildId);
}

function getBalance(userId, guildId = '0') {
  const user = getUser(userId, guildId);
  return user ? user.credits : config.economy.startingBalance;
}

function createTransaction(userId, amount, type, options = {}) {
  const db = getDb();
  const id = generateTransactionId();
  db.prepare(`INSERT INTO transactions (id, user_id, target_user_id, amount, type, status, description, game_id, event_id, giveaway_id, case_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, userId, options.targetUserId || null, amount, type, options.status || 'completed',
    options.description || '', options.gameId || null, options.eventId || null,
    options.giveawayId || null, options.caseId || null, Date.now()
  );
  return id;
}

function transfer(senderId, recipientId, amount, guildId = '0') {
  const db = getDb();
  const sender = getUser(senderId, guildId);
  const recipient = getUser(recipientId, guildId);

  if (!sender || !recipient) return { success: false, error: 'User not found' };
  if (senderId === recipientId) return { success: false, error: 'Cannot transfer to yourself' };
  if (amount <= 0) return { success: false, error: 'Amount must be positive' };

  const senderMember = { roles: { cache: { some: () => false } } };
  const roleBonus = config.economy.roleBonusMultipliers.MEMBER || 1.0;
  const maxTransfer = getEffectiveMaxTransfer(sender.reputation, roleBonus);

  if (amount > maxTransfer) return { success: false, error: `Transfer limit: ${maxTransfer} Credits based on your reputation` };

  const fee = Math.floor(amount * (config.economy.transferFeePercent / 100));
  const totalCost = amount + fee;

  if (sender.credits < totalCost) return { success: false, error: `Insufficient balance. Need ${totalCost} (including ${fee} fee)` };

  const transaction = db.transaction(() => {
    db.prepare('UPDATE users SET credits = credits - ?, transfers_sent = transfers_sent + 1, updated_at = ? WHERE user_id = ? AND guild_id = ?').run(totalCost, Date.now(), senderId, guildId);
    db.prepare('UPDATE users SET credits = credits + ?, transfers_received = transfers_received + 1, updated_at = ? WHERE user_id = ? AND guild_id = ?').run(amount, Date.now(), recipientId, guildId);

    const senderTxId = createTransaction(senderId, -totalCost, 'transfer', { targetUserId: recipientId, description: `Transfer to ${recipientId}` });
    const recipientTxId = createTransaction(recipientId, amount, 'transfer', { targetUserId: senderId, description: `Transfer from ${senderId}` });

    return { senderTxId, recipientTxId };
  });

  const result = transaction();
  return { success: true, fee, finalAmount: amount, ...result };
}

function claimDaily(userId, guildId = '0') {
  const db = getDb();
  const user = getUser(userId, guildId);
  const now = Date.now();
  const cooldown = 24 * 60 * 60 * 1000;

  if (user.last_daily_time && (now - user.last_daily_time) < cooldown) {
    const remaining = cooldown - (now - user.last_daily_time);
    return { success: false, error: `Daily already claimed. Try again in ${Math.ceil(remaining / 3600000)}h`, reason: `Daily already claimed. Try again <t:${Math.floor((now + remaining) / 1000)}:R>.` };
  }

  const repLevel = getReputationLevel(user.reputation);
  let reward = config.economy.dailyReward;
  if (repLevel.key === 'low') reward = Math.floor(reward * 0.5);
  if (repLevel.key === 'veryLow') reward = Math.floor(reward * 0.25);

  const txId = createTransaction(userId, reward, 'daily_reward', { description: 'Daily reward' });

  db.prepare('UPDATE users SET credits = credits + ?, last_daily_time = ?, daily_claims = daily_claims + 1, updated_at = ? WHERE user_id = ? AND guild_id = ?')
    .run(reward, now, now, userId, guildId);

  return { success: true, reward, txId, balance: getBalance(userId, guildId) };
}

function claimWeekly(userId, guildId = '0') {
  const db = getDb();
  const user = getUser(userId, guildId);
  const now = Date.now();
  const cooldown = 7 * 24 * 60 * 60 * 1000;

  if (user.last_weekly_time && (now - user.last_weekly_time) < cooldown) {
    const remaining = cooldown - (now - user.last_weekly_time);
    return { success: false, error: `Weekly already claimed. Try again in ${Math.ceil(remaining / 86400000)}d`, reason: `Weekly already claimed. Try again <t:${Math.floor((now + remaining) / 1000)}:R>.` };
  }

  const repLevel = getReputationLevel(user.reputation);
  let reward = config.economy.weeklyReward;
  if (repLevel.key === 'low') reward = Math.floor(reward * 0.5);
  if (repLevel.key === 'veryLow') reward = Math.floor(reward * 0.25);

  const txId = createTransaction(userId, reward, 'weekly_reward', { description: 'Weekly reward' });

  db.prepare('UPDATE users SET credits = credits + ?, last_weekly_time = ?, updated_at = ? WHERE user_id = ? AND guild_id = ?')
    .run(reward, now, now, userId, guildId);

  return { success: true, reward, txId, balance: getBalance(userId, guildId) };
}

function getTransactions(userId, guildId = null, limit = 20, offset = 0) {
  const db = getDb();
  // Support both (userId, limit) and (userId, guildId, limit) signatures
  if (typeof guildId === 'number' && guildId <= 100) {
    offset = limit || 0;
    limit = guildId;
    guildId = null;
  }
  // transactions table has no guild_id column — filter only by user_id
  return db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(userId, limit, offset);
}

function getLeaderboard(guildId, limit = 10) {
  const db = getDb();
  return db.prepare('SELECT user_id, username, credits FROM users WHERE guild_id = ? ORDER BY credits DESC LIMIT ?').all(guildId, limit);
}

function adjustBalance(userId, amount, moderatorId, reason, guildId = '0') {
  const db = getDb();
  getUser(userId, guildId);
  updateBalance(userId, amount, guildId);
  const txId = createTransaction(userId, amount, 'admin_adjustment', {
    targetUserId: moderatorId,
    description: reason || 'Admin adjustment',
  });
  return { success: true, txId };
}

module.exports = {
  getUser, updateBalance, getBalance, createTransaction, transfer,
  claimDaily, claimWeekly, getTransactions, adjustBalance, getLeaderboard,
};
