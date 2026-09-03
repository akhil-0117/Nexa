const Database = require('better-sqlite3');
const path = require('path');
const config = require('../config');

let db;

function getDb() {
  if (!db) {
    db = new Database(config.dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDatabase() {
  const database = getDb();

  database.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL DEFAULT '0',
      username TEXT DEFAULT '',
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      total_xp INTEGER DEFAULT 0,
      credits INTEGER DEFAULT ${config.economy.startingBalance},
      reputation INTEGER DEFAULT ${config.reputation.initialScore},
      messages INTEGER DEFAULT 0,
      daily_messages INTEGER DEFAULT 0,
      weekly_messages INTEGER DEFAULT 0,
      monthly_messages INTEGER DEFAULT 0,
      last_message_time INTEGER DEFAULT 0,
      last_xp_time INTEGER DEFAULT 0,
      last_daily_time INTEGER DEFAULT 0,
      last_weekly_time INTEGER DEFAULT 0,
      games_played INTEGER DEFAULT 0,
      games_won INTEGER DEFAULT 0,
      valid_invites INTEGER DEFAULT 0,
      total_invites INTEGER DEFAULT 0,
      leaves INTEGER DEFAULT 0,
      events_joined INTEGER DEFAULT 0,
      events_won INTEGER DEFAULT 0,
      transfers_sent INTEGER DEFAULT 0,
      transfers_received INTEGER DEFAULT 0,
      daily_claims INTEGER DEFAULT 0,
      streak_days INTEGER DEFAULT 0,
      last_active_day TEXT DEFAULT '',
      achievements TEXT DEFAULT '[]',
      notifications TEXT DEFAULT '{}',
      verified INTEGER DEFAULT 0,
      joined_at INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT ${Date.now()},
      updated_at INTEGER DEFAULT ${Date.now()}
    );

    -- Transactions table
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      target_user_id TEXT,
      amount INTEGER NOT NULL,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'completed',
      description TEXT DEFAULT '',
      game_id TEXT,
      event_id TEXT,
      giveaway_id TEXT,
      case_id TEXT,
      created_at INTEGER DEFAULT ${Date.now()}
    );

    -- Warnings table
    CREATE TABLE IF NOT EXISTS warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      severity TEXT DEFAULT 'minor',
      status TEXT DEFAULT 'active',
      created_at INTEGER DEFAULT ${Date.now()},
      expires_at INTEGER DEFAULT 0
    );

    -- Cases table
    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      action TEXT NOT NULL,
      reason TEXT NOT NULL,
      evidence TEXT DEFAULT '',
      duration INTEGER DEFAULT 0,
      reputation_change INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at INTEGER DEFAULT ${Date.now()}
    );

    -- Game sessions table
    CREATE TABLE IF NOT EXISTS game_sessions (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      game_type TEXT NOT NULL,
      bet INTEGER NOT NULL DEFAULT 0,
      result TEXT DEFAULT '',
      winner TEXT DEFAULT '',
      payout INTEGER DEFAULT 0,
      transaction_id TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      created_at INTEGER DEFAULT ${Date.now()}
    );

    -- Giveaways table
    CREATE TABLE IF NOT EXISTS giveaways (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      creator_id TEXT NOT NULL,
      prize TEXT NOT NULL,
      description TEXT DEFAULT '',
      winner_count INTEGER DEFAULT 1,
      end_time INTEGER NOT NULL,
      required_role TEXT DEFAULT '',
      min_level INTEGER DEFAULT 0,
      min_reputation INTEGER DEFAULT 0,
      min_invites INTEGER DEFAULT 0,
      min_account_age INTEGER DEFAULT 0,
      min_server_age INTEGER DEFAULT 0,
      entries TEXT DEFAULT '[]',
      winners TEXT DEFAULT '[]',
      rerolls INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at INTEGER DEFAULT ${Date.now()}
    );

    -- Events table
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      creator_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      event_type TEXT DEFAULT 'general',
      start_time INTEGER DEFAULT 0,
      end_time INTEGER DEFAULT 0,
      participants TEXT DEFAULT '[]',
      max_participants INTEGER DEFAULT 0,
      reward_credits INTEGER DEFAULT 0,
      reward_xp INTEGER DEFAULT 0,
      status TEXT DEFAULT 'planned',
      created_at INTEGER DEFAULT ${Date.now()}
    );

    -- Tickets table
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      channel_id TEXT DEFAULT '',
      creator_id TEXT NOT NULL,
      category TEXT NOT NULL,
      subject TEXT DEFAULT '',
      status TEXT DEFAULT 'open',
      assigned_to TEXT DEFAULT '',
      claimed_by TEXT DEFAULT '',
      messages_count INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT ${Date.now()},
      closed_at INTEGER DEFAULT 0
    );

    -- Reports table
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      reporter_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      evidence TEXT DEFAULT '',
      message_id TEXT DEFAULT '',
      channel_id TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      claimed_by TEXT DEFAULT '',
      resolution TEXT DEFAULT '',
      created_at INTEGER DEFAULT ${Date.now()}
    );

    -- Appeals table
    CREATE TABLE IF NOT EXISTS appeals (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      case_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      additional_info TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      reviewed_by TEXT DEFAULT '',
      decision TEXT DEFAULT '',
      created_at INTEGER DEFAULT ${Date.now()}
    );

    -- Partnerships table
    CREATE TABLE IF NOT EXISTS partnerships (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      server_name TEXT NOT NULL,
      owner TEXT DEFAULT '',
      member_count INTEGER DEFAULT 0,
      server_age TEXT DEFAULT '',
      invite TEXT DEFAULT '',
      description TEXT DEFAULT '',
      reason TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      reviewed_by TEXT DEFAULT '',
      created_at INTEGER DEFAULT ${Date.now()}
    );

    -- Staff applications table
    CREATE TABLE IF NOT EXISTS staff_applications (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      experience TEXT DEFAULT '',
      activity TEXT DEFAULT '',
      timezone TEXT DEFAULT '',
      motivation TEXT DEFAULT '',
      situational TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      reviewed_by TEXT DEFAULT '',
      created_at INTEGER DEFAULT ${Date.now()}
    );

    -- Invites table
    CREATE TABLE IF NOT EXISTS invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      inviter_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      uses INTEGER DEFAULT 0,
      fake INTEGER DEFAULT 0,
      left INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT ${Date.now()}
    );

    -- Verification table
    CREATE TABLE IF NOT EXISTS verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      method TEXT DEFAULT 'button',
      verified_at INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT ${Date.now()}
    );

    -- Staff table
    CREATE TABLE IF NOT EXISTS staff (
      user_id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      role_name TEXT NOT NULL,
      level INTEGER NOT NULL DEFAULT 1,
      joined_at INTEGER DEFAULT ${Date.now()},
      actions_count INTEGER DEFAULT 0
    );

    -- Shops table
    CREATE TABLE IF NOT EXISTS shop_items (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT DEFAULT 'roles',
      price INTEGER NOT NULL,
      stock INTEGER DEFAULT -1,
      role_id TEXT DEFAULT '',
      emoji TEXT DEFAULT '🎁',
      active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT ${Date.now()}
    );

    -- Logs table
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      category TEXT NOT NULL,
      action TEXT NOT NULL,
      actor_id TEXT DEFAULT '',
      target_id TEXT DEFAULT '',
      details TEXT DEFAULT '{}',
      created_at INTEGER DEFAULT ${Date.now()}
    );

    -- Polls table
    CREATE TABLE IF NOT EXISTS polls (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      creator_id TEXT NOT NULL,
      question TEXT NOT NULL,
      options TEXT NOT NULL DEFAULT '[]',
      votes TEXT NOT NULL DEFAULT '{}',
      end_time INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at INTEGER DEFAULT ${Date.now()}
    );

    -- Config table for server settings
    CREATE TABLE IF NOT EXISTS guild_config (
      guild_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT DEFAULT '',
      PRIMARY KEY (guild_id, key)
    );

    -- Spam tracking table
    CREATE TABLE IF NOT EXISTS spam_tracking (
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      message_count INTEGER DEFAULT 0,
      window_start INTEGER DEFAULT 0,
      last_warning INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, guild_id)
    );

    -- Raid tracking table
    CREATE TABLE IF NOT EXISTS raid_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      details TEXT DEFAULT '{}',
      severity TEXT DEFAULT 'low',
      resolved INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT ${Date.now()}
    );

    -- Reminders table
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message TEXT NOT NULL,
      remind_at INTEGER NOT NULL,
      created_at INTEGER DEFAULT ${Date.now()}
    );

    -- Submissions table
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      data TEXT DEFAULT '{}',
      status TEXT DEFAULT 'pending',
      reviewed_by TEXT DEFAULT '',
      created_at INTEGER DEFAULT ${Date.now()}
    );
  `);

  console.log('[DB] Database initialized successfully');
  return database;
}

module.exports = { getDb, initDatabase };
