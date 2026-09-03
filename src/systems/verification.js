const { getDb } = require('../database/init');
const { isRaidActive, getLockdownLevel } = require('./antiRaid');

// Pending OTP challenges: userId -> { code, timestamp }
const pendingOTPs = new Map();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function createOTPChallenge(userId) {
  const code = generateOTP();
  pendingOTPs.set(userId, { code, timestamp: Date.now() });

  // Auto-expire after 5 minutes
  setTimeout(() => {
    const pending = pendingOTPs.get(userId);
    if (pending && Date.now() - pending.timestamp > 300000) {
      pendingOTPs.delete(userId);
    }
  }, 300000);

  return code;
}

function verifyOTP(userId, userCode) {
  const pending = pendingOTPs.get(userId);
  if (!pending) return { success: false, reason: 'No OTP active. Start verification again.' };

  if (Date.now() - pending.timestamp > 300000) {
    pendingOTPs.delete(userId);
    return { success: false, reason: 'OTP expired. Start verification again.' };
  }

  pendingOTPs.delete(userId);

  if (userCode.trim() === pending.code) {
    return { success: true };
  }
  return { success: false, reason: 'Wrong OTP. Try again.' };
}

function canVerify(member, guildId) {
  const lockdownLevel = getLockdownLevel(guildId);

  if (lockdownLevel >= 3) {
    const accountAge = Date.now() - (member.user?.createdTimestamp || Date.now());
    if (accountAge < 7 * 24 * 60 * 60 * 1000) {
      return { allowed: false, reason: 'Server is in critical lockdown. New accounts cannot verify yet.' };
    }
  }

  if (lockdownLevel >= 2) {
    const accountAge = Date.now() - (member.user?.createdTimestamp || Date.now());
    if (accountAge < 24 * 60 * 60 * 1000) {
      return { allowed: false, reason: 'Enhanced verification active. Account too new.' };
    }
  }

  return { allowed: true };
}

function verifyUser(userId, guildId) {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO verifications (user_id, guild_id, status, method, verified_at, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(userId, guildId, 'verified', 'otp', Date.now(), Date.now());
  db.prepare('UPDATE users SET verified = 1, updated_at = ? WHERE user_id = ? AND guild_id = ?').run(Date.now(), userId, guildId);
  return { success: true };
}

function isVerified(userId, guildId) {
  const db = getDb();
  const v = db.prepare('SELECT status FROM verifications WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  return v && v.status === 'verified';
}

module.exports = { canVerify, verifyUser, isVerified, createOTPChallenge, verifyOTP };
