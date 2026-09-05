const { getDb } = require('../database/init');
const { isRaidActive, getLockdownLevel } = require('./antiRaid');
const config = require('../config');

// Pending OTP challenges: userId -> { code, timestamp }
const pendingOTPs = new Map();

// Pending OAuth authorizations: state -> { userId, timestamp }
const pendingOAuth = new Map();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateState() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 32; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}

/**
 * Build the Discord OAuth2 authorize URL for guilds.join scope.
 * Returns null if OAUTH_REDIRECT_URI is not configured.
 */
function buildOAuthUrl(userId) {
  if (!process.env.DISCORD_TOKEN) return null;
  const clientId = config.clientId;
  const redirectUri = config.oauthRedirectUri;
  if (!clientId || !redirectUri) return null;

  const state = generateState();
  pendingOAuth.set(state, { userId, timestamp: Date.now() });

  // Expire states after 15 min
  setTimeout(() => pendingOAuth.delete(state), 15 * 60 * 1000);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'guilds.join identify',
    state,
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
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

function verifyUser(userId, guildId, method = 'otp') {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO verifications (user_id, guild_id, status, method, verified_at, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(userId, guildId, 'verified', method, Date.now(), Date.now());
  db.prepare('UPDATE users SET verified = 1, updated_at = ? WHERE user_id = ? AND guild_id = ?').run(Date.now(), userId, guildId);
  return { success: true };
}

function isVerified(userId, guildId) {
  const db = getDb();
  const v = db.prepare('SELECT status FROM verifications WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  return v && v.status === 'verified';
}

function isVerifiedAnywhere(userId) {
  const db = getDb();
  const v = db.prepare("SELECT status FROM verifications WHERE user_id = ? AND status = 'verified' LIMIT 1").get(userId);
  return !!v;
}

function getVerifiedUserCount() {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(DISTINCT user_id) as count FROM verifications WHERE status = 'verified'").get();
  return row.count;
}

module.exports = {
  canVerify, verifyUser, isVerified, isVerifiedAnywhere, getVerifiedUserCount,
  createOTPChallenge, verifyOTP, buildOAuthUrl,
};
