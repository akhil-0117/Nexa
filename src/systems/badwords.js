const config = require('../config');

// Bad words list (expandable)
const BAD_WORDS = [
  // Common slurs and offensive terms
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'retarded',
  'cunt', 'bitch', 'slut', 'whore',
  // Server-specific (customize as needed)
  'hack', 'exploit', 'cheat',
];

// Patterns that indicate scam/phishing
const SCAM_PATTERNS = [
  /free\s*nitro/i,
  /discord\.gg\/\w+/i,
  /click\s*here\s*to\s*claim/i,
  /you\s*won/i,
  /congratulations.*won/i,
  /verify\s*your\s*account\s*at/i,
  /steamcommunity\.com.*trade/i,
  /gift\s*card/i,
];

function checkBadWords(content) {
  if (!content) return null;
  const lower = content.toLowerCase();
  const words = lower.split(/\s+/);

  for (const word of words) {
    const clean = word.replace(/[^a-z0-9]/g, '');
    if (BAD_WORDS.includes(clean)) {
      return { type: 'bad_word', word: clean, severity: 'high' };
    }
  }

  for (const pattern of SCAM_PATTERNS) {
    if (pattern.test(content)) {
      return { type: 'scam_link', severity: 'critical' };
    }
  }

  return null;
}

function shouldAutoWarn(content) {
  const result = checkBadWords(content);
  if (!result) return false;
  return result.severity === 'high' || result.severity === 'critical';
}

module.exports = { checkBadWords, shouldAutoWarn, BAD_WORDS, SCAM_PATTERNS };
