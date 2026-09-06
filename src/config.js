const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID || null,
  prefix: process.env.BOT_PREFIX || '!',
  logLevel: process.env.LOG_LEVEL || 'info',

  dbPath: path.join(__dirname, 'database', 'nexaverse.db'),

  verificationChannelId: process.env.VERIFICATION_CHANNEL_ID || null,
  statusChannelId: process.env.STATUS_CHANNEL_ID || null,

  // Owner: allowed by Discord user ID (recommended) or exact username
  ownerUserId: process.env.OWNER_USER_ID || '',
  ownerUsername: process.env.OWNER_USERNAME || 'akhilthegreat_7',

  // OAuth: set OAUTH_REDIRECT_URI in the Developer Portal + here to enable guilds.join authorization
  oauthRedirectUri: process.env.OAUTH_REDIRECT_URI || '',

  logChannels: {
    moderation: process.env.LOG_CHANNEL_MODERATION || null,
    members: process.env.LOG_CHANNEL_MEMBERS || null,
    messages: process.env.LOG_CHANNEL_MESSAGES || null,
    economy: process.env.LOG_CHANNEL_ECONOMY || null,
    games: process.env.LOG_CHANNEL_GAMES || null,
    giveaways: process.env.LOG_CHANNEL_GIVEAWAYS || null,
    events: process.env.LOG_CHANNEL_EVENTS || null,
    tickets: process.env.LOG_CHANNEL_TICKETS || null,
    reports: process.env.LOG_CHANNEL_REPORTS || null,
    security: process.env.LOG_CHANNEL_SECURITY || null,
    staff: process.env.LOG_CHANNEL_STAFF || null,
  },

  roleIds: {
    president: process.env.PRESIDENT_ROLE_ID || '',
    coPresident: process.env.CO_PRESIDENT_ROLE_ID || '',
    headOfStaff: process.env.HEAD_OF_STAFF_ROLE_ID || '',
    seniorModerator: process.env.SENIOR_MODERATOR_ROLE_ID || '',
    moderator: process.env.MODERATOR_ROLE_ID || '',
    trialModerator: process.env.TRIAL_MODERATOR_ROLE_ID || '',
    verified: process.env.VERIFIED_ROLE_ID || '',
  },

  ranks: [
    { name: 'Newcomer', xp: 0, color: '#95a5a6' },
    { name: 'Member', xp: 500, color: '#3498db' },
    { name: 'Regular', xp: 2000, color: '#2ecc71' },
    { name: 'Active', xp: 5000, color: '#e67e22' },
    { name: 'Veteran', xp: 12000, color: '#9b59b6' },
    { name: 'Elite', xp: 25000, color: '#e74c3c' },
    { name: 'Legend', xp: 50000, color: '#f1c40f' },
  ],

  xp: {
    messageXpMin: 15,
    messageXpMax: 35,
    messageCooldownMs: 60000,
    eventXp: 50,
    gameWinXp: 100,
    gameParticipationXp: 25,
    inviteXp: 75,
    achievementXp: 200,
    dailyXpBonus: 100,
  },

  reputation: {
    initialScore: 100,
    maxScore: 100,
    minScore: 0,
    spamDecrease: 2,
    warnDecrease: 5,
    majorViolationDecrease: 15,
    dailyRecovery: 1,
    maxDailyRecovery: 5,
    levels: {
      veryLow: { min: 0, max: 15, label: 'Very Low', color: '#e74c3c', restrictions: ['economy_restricted', 'game_restricted', 'staff_review', 'security_monitoring'] },
      low: { min: 16, max: 30, label: 'Low', color: '#e67e22', restrictions: ['lower_transfer_limits', 'lower_game_bets', 'reduced_economy_rewards', 'giveaway_restrictions'] },
      medium: { min: 31, max: 60, label: 'Medium', color: '#f1c40f', restrictions: ['some_restrictions'] },
      high: { min: 61, max: 80, label: 'High', color: '#2ecc71', restrictions: [] },
      excellent: { min: 81, max: 100, label: 'Excellent', color: '#3498db', restrictions: [] },
    },
  },

  economy: {
    dailyReward: 100,
    weeklyReward: 1000,
    startingBalance: 500,
    transferFeePercent: 5,
    minTransfer: 10,
    maxTransferBase: 50000,
    reputationTransferMultipliers: { veryLow: 0.25, low: 0.5, medium: 1.0, high: 1.0, excellent: 1.0 },
    roleBonusMultipliers: { MEMBER: 1.0, VIP: 1.25, ELITE: 1.5, VETERAN: 1.75, LEGEND: 2.0 },
  },

  staffHierarchy: [
    { name: 'TRIAL_MODERATOR', level: 1, label: 'Trial Moderator', roleIdKey: 'trialModerator' },
    { name: 'MODERATOR', level: 2, label: 'Moderator', roleIdKey: 'moderator' },
    { name: 'SENIOR_MODERATOR', level: 3, label: 'Senior Moderator', roleIdKey: 'seniorModerator' },
    { name: 'HEAD_OF_STAFF', level: 4, label: 'Head of Staff', roleIdKey: 'headOfStaff' },
    { name: 'PRESIDENT', level: 5, label: 'President', roleIdKey: 'president' },
    { name: 'CO_PRESIDENT', level: 5, label: 'Co-President', roleIdKey: 'coPresident' },
  ],

  games: {
    cooldownMs: 5000,
    minBet: 10,
    maxBetBase: 10000,
    reputationBetMultipliers: { veryLow: 0.25, low: 0.5, medium: 1.0, high: 1.0, excellent: 1.0 },
    roleBetMultipliers: { MEMBER: 1.0, VIP: 1.25, ELITE: 1.5, VETERAN: 1.75, LEGEND: 2.0 },
    roulette: {
      redNumbers: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36],
      greenNumbers: [0],
      numberMultiplier: 35,
      colorMultiplier: 2,
    },
    blackjack: { dealerStand: 17, blackjackMultiplier: 2.5, winMultiplier: 2 },
    slots: {
      symbols: ['\u{1F352}', '\u{1F34B}', '\u{1F34A}', '\u{1F347}', '\u{1F48E}', '\u{1F51F}', '\u{2B50}'],
      threeMatchMultipliers: { '\u{1F352}': 5, '\u{1F34B}': 8, '\u{1F34A}': 10, '\u{1F347}': 15, '\u{1F48E}': 25, '\u{1F51F}': 50, '\u{2B50}': 100 },
      twoMatchMultiplier: 2,
    },
  },

  lockdownLevels: [
    { level: 0, name: 'Normal', color: '#2ecc71', description: 'No restrictions' },
    { level: 1, name: 'Elevated', color: '#f1c40f', description: 'Enhanced monitoring' },
    { level: 2, name: 'High', color: '#e67e22', description: 'Restricted new members' },
    { level: 3, name: 'Critical', color: '#e74c3c', description: 'New member access restricted' },
  ],

  colors: {
    primary: '#7c3aed',
    success: '#2ecc71',
    warning: '#f39c12',
    error: '#e74c3c',
    info: '#2b2b2b',
    economy: '#7c3aed',
    game: '#2b2b2b',
    moderation: '#7c3aed',
    staff: '#2b2b2b',
    achievement: '#7c3aed',
    security: '#e74c3c',
    ticket: '#2b2b2b',
    giveaway: '#7c3aed',
    event: '#7c3aed',
    nexaverse: '#7c3aed',
  },

  achievements: [
    { id: 'first_message', name: 'First Steps', description: 'Send your first message', category: 'Activity', icon: '💬', requirement: { type: 'messages', count: 1 } },
    { id: '100_messages', name: 'Chatterbox', description: 'Send 100 messages', category: 'Activity', icon: '🗣️', requirement: { type: 'messages', count: 100 } },
    { id: '1000_messages', name: 'Conversationalist', description: 'Send 1,000 messages', category: 'Activity', icon: '📢', requirement: { type: 'messages', count: 1000 } },
    { id: '10000_messages', name: 'Living Legend', description: 'Send 10,000 messages', category: 'Activity', icon: '🏆', requirement: { type: 'messages', count: 10000 } },
    { id: 'first_transfer', name: 'Generous', description: 'Make your first transfer', category: 'Economy', icon: '💸', requirement: { type: 'transfers_sent', count: 1 } },
    { id: 'first_daily', name: 'Daily Devotee', description: 'Claim your first daily reward', category: 'Economy', icon: '📅', requirement: { type: 'daily_claims', count: 1 } },
    { id: 'first_win', name: 'Winner', description: 'Win your first game', category: 'Games', icon: '🏅', requirement: { type: 'games_won', count: 1 } },
    { id: '10_wins', name: 'Competitor', description: 'Win 10 games', category: 'Games', icon: '🥇', requirement: { type: 'games_won', count: 10 } },
    { id: '100_games', name: 'Veteran Player', description: 'Play 100 games', category: 'Games', icon: '🎮', requirement: { type: 'games_played', count: 100 } },
    { id: 'first_event', name: 'Participant', description: 'Join your first event', category: 'Events', icon: '🎉', requirement: { type: 'events_joined', count: 1 } },
    { id: 'first_invite', name: 'Recruiter', description: 'Get your first valid invite', category: 'Invites', icon: '📨', requirement: { type: 'valid_invites', count: 1 } },
    { id: '10_invites', name: 'Ambassador', description: 'Get 10 valid invites', category: 'Invites', icon: '🌐', requirement: { type: 'valid_invites', count: 10 } },
    { id: '50_invites', name: 'Influencer', description: 'Get 50 valid invites', category: 'Invites', icon: '🌟', requirement: { type: 'valid_invites', count: 50 } },
    { id: '100_invites', name: 'Recruitment Master', description: 'Get 100 valid invites', category: 'Invites', icon: '👑', requirement: { type: 'valid_invites', count: 100 } },
    { id: '7_day_streak', name: 'Consistent', description: '7-day activity streak', category: 'Activity', icon: '🔥', requirement: { type: 'streak', count: 7 } },
    { id: '30_day_streak', name: 'Dedicated', description: '30-day activity streak', category: 'Activity', icon: '💪', requirement: { type: 'streak', count: 30 } },
    { id: '100_day_streak', name: 'Unstoppable', description: '100-day activity streak', category: 'Activity', icon: '⚡', requirement: { type: 'streak', count: 100 } },
  ],

  notificationCategories: ['giveaways', 'events', 'economy', 'level_ups', 'invites', 'announcements', 'tickets'],

  // Role rewards: auto-assign role on level up
  // Set ROLE_REWARD_<LEVEL>=<role_id> in .env to enable
  roleRewards: {
    5: process.env.ROLE_REWARD_5 || '',
    10: process.env.ROLE_REWARD_10 || '',
    15: process.env.ROLE_REWARD_15 || '',
    20: process.env.ROLE_REWARD_20 || '',
    30: process.env.ROLE_REWARD_30 || '',
    50: process.env.ROLE_REWARD_50 || '',
    75: process.env.ROLE_REWARD_75 || '',
    100: process.env.ROLE_REWARD_100 || '',
  },

  // Birthday role: auto-assign on birthday
  birthdayRoleId: process.env.BIRTHDAY_ROLE_ID || '',
};

module.exports = config;
