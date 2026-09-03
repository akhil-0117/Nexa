const config = require('../config');

// Comprehensive bad words list (case-insensitive matching)
const BAD_WORDS = [
  // Slurs and offensive terms
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'retarded',
  'cunt', 'bitch', 'slut', 'whore', 'dyke', 'kike',
  'spic', 'chink', 'gook', 'wetback', 'beaner',
  'tranny', 'shemale', 'he-she',
  // Threats and violence
  'kill yourself', 'kys', 'commit suicide', 'hang yourself',
  // Server-specific
  'hack', 'exploit', 'cheat', 'mod menu', 'raid tool',
  // Hate speech patterns
  'go die', 'should die', 'hope you die',
];

// Scam/phishing patterns
const SCAM_PATTERNS = [
  /free\s*nitro/gi,
  /discord\.gg\/\w+/gi,
  /click\s*here\s*to\s*claim/gi,
  /you\s*won/gi,
  /congratulations.*won/gi,
  /verify\s*your\s*account\s*at/gi,
  /steamcommunity\.com.*trade/gi,
  /gift\s*card/gi,
  /dm\s*me\s*for/gi,
  /add\s*me\s*on\s*discord/gi,
  /check\s*my\s*profile/gi,
  /free\s*robux/gi,
  /free\s*v-bucks/gi,
  /earn\s*money\s*fast/gi,
  /crypto\s*investment/gi,
  /double\s*your\s*credits/gi,
  /send\s*me\s*credits/gi,
  /trust\s*trade/gi,
  /middleman/gi,
];

// Check content for violations
function checkBadWords(content) {
  if (!content) return null;
  const lower = content.toLowerCase();

  // Check direct bad words
  const words = lower.split(/\s+/);
  for (const word of words) {
    const clean = word.replace(/[^a-z0-9]/g, '');
    if (BAD_WORDS.includes(clean)) {
      return { type: 'bad_word', word: clean, severity: 'high' };
    }
  }

  // Check multi-word patterns
  for (const badWord of BAD_WORDS) {
    if (badWord.includes(' ') && lower.includes(badWord)) {
      return { type: 'bad_word', word: badWord, severity: 'high' };
    }
  }

  // Check scam patterns
  for (const pattern of SCAM_PATTERNS) {
    if (pattern.test(content)) {
      return { type: 'scam_link', severity: 'critical' };
    }
  }

  return null;
}

// Check if message should auto-warn
function shouldAutoWarn(content) {
  const result = checkBadWords(content);
  if (!result) return false;
  return result.severity === 'high' || result.severity === 'critical';
}

// Get appropriate action for violation
function getAutoModAction(content) {
  const result = checkBadWords(content);
  if (!result) return null;

  if (result.severity === 'critical') {
    return { action: 'timeout', duration: 3600, reason: 'Scam/phishing content detected', result };
  }

  if (result.severity === 'high') {
    return { action: 'warn', reason: 'Inappropriate content detected', result };
  }

  return { action: 'delete', reason: 'Content violates server rules', result };
}

module.exports = { checkBadWords, shouldAutoWarn, getAutoModAction, BAD_WORDS, SCAM_PATTERNS };
