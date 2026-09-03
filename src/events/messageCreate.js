const { Events, EmbedBuilder } = require('discord.js');
const { getDb } = require('../database/init');
const { addXp } = require('../systems/xp');
const { checkMessage, checkSpam } = require('../systems/automod');
const { decreaseReputation } = require('../systems/reputation');
const { log } = require('../systems/logging');
const { checkAchievements } = require('../systems/achievements');
const config = require('../config');

module.exports = {
  name: Events.MessageCreate,
  async execute(message, client) {
    if (!message.guild || message.author.bot) return;

    const { author, guild, content } = message;
    const guildId = guild.id;
    const userId = author.id;
    const db = getDb();

    // Ensure user exists
    db.prepare('INSERT OR IGNORE INTO users (user_id, guild_id, username, created_at) VALUES (?, ?, ?, ?)').run(userId, guildId, author.username, Date.now());

    // Track messages
    db.prepare(`UPDATE users SET messages = messages + 1, daily_messages = daily_messages + 1,
      weekly_messages = weekly_messages + 1, monthly_messages = monthly_messages + 1,
      last_message_time = ?, updated_at = ? WHERE user_id = ? AND guild_id = ?`)
      .run(Date.now(), Date.now(), userId, guildId);

    // Check automod
    const violations = checkMessage(message, client);
    if (violations) {
      for (const violation of violations) {
        if (violation.action === 'delete_warn' || violation.action === 'delete') {
          await message.delete().catch(() => {});
        }
        if (violation.severity !== 'low') {
          decreaseReputation(userId, config.reputation.spamDecrease, violation.type, guildId);
          await log(guild, 'messages', `🤖 Automod: ${violation.type}`, {
            actor: userId,
            reason: `Severity: ${violation.severity}`,
          });
        }
      }
      return; // Don't give XP for automod-violating messages
    }

    // Check spam
    const spamResult = checkSpam(userId, guildId, content);
    if (spamResult.spamDetected) {
      decreaseReputation(userId, config.reputation.spamDecrease, spamResult.spamType, guildId);
      await log(guild, 'messages', `🚨 Spam Detected: ${spamResult.spamType}`, {
        actor: userId,
        reason: `${spamResult.messageCount} messages in window`,
      });
      return; // Don't give XP for spam
    }

    // Add XP
    const xpResult = addXp(userId, Math.floor(Math.random() * (config.xp.messageXpMax - config.xp.messageXpMin + 1)) + config.xp.messageXpMin, 'message', guildId);

    if (xpResult && xpResult.leveled) {
      await log(guild, 'members', `⭐ Level Up!`, {
        actor: userId,
        reason: `Now level ${xpResult.level}`,
      });
    }

    // Check achievements
    const user = db.prepare('SELECT * FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
    if (user) {
      const newAchievements = checkAchievements(userId, user, guildId);
      for (const ach of newAchievements) {
        await log(guild, 'members', `🏆 Achievement Unlocked: ${ach.icon} ${ach.name}`, {
          actor: userId,
          reason: ach.description,
        });
      }
    }
  },
};
