const { getDb } = require('../database/init');
const { isRaidActive, getLockdownLevel } = require('./antiRaid');

// Pending captcha challenges: userId -> { answer, timestamp }
const pendingCaptchas = new Map();

function generateCaptcha() {
  const ops = ['+', '-', '×'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a, b, answer;

  switch (op) {
    case '+':
      a = Math.floor(Math.random() * 50) + 1;
      b = Math.floor(Math.random() * 50) + 1;
      answer = a + b;
      break;
    case '-':
      a = Math.floor(Math.random() * 50) + 20;
      b = Math.floor(Math.random() * 20) + 1;
      answer = a - b;
      break;
    case '×':
      a = Math.floor(Math.random() * 12) + 1;
      b = Math.floor(Math.random() * 12) + 1;
      answer = a * b;
      break;
  }

  return { question: `What is ${a} ${op} ${b}?`, answer: answer.toString() };
}

function createCaptchaChallenge(userId) {
  const captcha = generateCaptcha();
  pendingCaptchas.set(userId, { answer: captcha.answer, timestamp: Date.now() });

  // Auto-expire after 5 minutes
  setTimeout(() => {
    const pending = pendingCaptchas.get(userId);
    if (pending && Date.now() - pending.timestamp > 300000) {
      pendingCaptchas.delete(userId);
    }
  }, 300000);

  return captcha;
}

function verifyCaptcha(userId, userAnswer) {
  const pending = pendingCaptchas.get(userId);
  if (!pending) return { success: false, reason: 'No captcha active. Start verification again.' };

  if (Date.now() - pending.timestamp > 300000) {
    pendingCaptchas.delete(userId);
    return { success: false, reason: 'Captcha expired. Start verification again.' };
  }

  pendingCaptchas.delete(userId);

  if (userAnswer.trim() === pending.answer) {
    return { success: true };
  }
  return { success: false, reason: 'Wrong answer. Try again.' };
}

function canVerify(member, guildId) {
  const raidActive = isRaidActive(guildId);
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
    .run(userId, guildId, 'verified', 'captcha', Date.now(), Date.now());
  db.prepare('UPDATE users SET verified = 1, updated_at = ? WHERE user_id = ? AND guild_id = ?').run(Date.now(), userId, guildId);
  return { success: true };
}

function isVerified(userId, guildId) {
  const db = getDb();
  const v = db.prepare('SELECT status FROM verifications WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  return v && v.status === 'verified';
}

module.exports = { canVerify, verifyUser, isVerified, createCaptchaChallenge, verifyCaptcha };
