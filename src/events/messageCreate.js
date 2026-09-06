const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDb } = require('../database/init');
const { addXp } = require('../systems/xp');
const { checkMessage, checkSpam } = require('../systems/automod');
const { checkBadWords } = require('../systems/badwords');
const { decreaseReputation } = require('../systems/reputation');
const { log } = require('../systems/logging');
const { checkAchievements } = require('../systems/achievements');
const { updateNickname } = require('../utils/helpers');
const config = require('../config');

module.exports = {
  name: Events.MessageCreate,
  async execute(message, client) {
    if (!message.guild || message.author.bot) return;

    const { author, guild, content } = message;
    const guildId = guild.id;
    const userId = author.id;
    const db = getDb();

    // Prefix commands
    if (content === '-close' || content.toLowerCase().startsWith('-close ')) {
      const { isHigherOfficial } = require('../utils/permissions');
      if (!isHigherOfficial(message.member)) {
        return message.reply('Only Head of Staff or higher can close tickets.').catch(() => {});
      }
      const { getDb } = require('../database/init');
      const { log } = require('../systems/logging');
      const ticketDb = getDb();
      const ticket = ticketDb.prepare("SELECT * FROM tickets WHERE channel_id = ? AND status = 'open'").get(message.channel.id);
      if (!ticket) {
        return message.reply('No open ticket found in this channel.').catch(() => {});
      }
      ticketDb.prepare('UPDATE tickets SET status = ?, closed_at = ? WHERE id = ?').run('closed', Date.now(), ticket.id);
      if (ticket.category === 'report') {
        const reportMatch = (ticket.subject || '').match(/Report: (RPT-[A-Z0-9]+)/);
        if (reportMatch) ticketDb.prepare('UPDATE reports SET status = ? WHERE id = ?').run('resolved', reportMatch[1]);
      }
      await log(guild, 'tickets', 'Ticket Closed', { actor: userId, reason: 'Ticket ' + ticket.id });
      await message.reply({
        embeds: [new EmbedBuilder().setTitle('Ticket Closed').setColor(config.colors.info)
          .setDescription('This ticket has been closed by <@' + userId + '>.')
          .setTimestamp()],
      }).catch(() => {});
      setTimeout(() => { message.channel.delete().catch(() => {}); }, 10000);
      return;
    }

    // Verification channel: delete all non-bot messages and re-post panel if needed
    if (config.verificationChannelId && message.channel.id === config.verificationChannelId) {
      try {
        await message.delete().catch(() => {});
      } catch (e) {}

      try {
        const recentMessages = await message.channel.messages.fetch({ limit: 20 });
        const hasPanel = recentMessages.some(m => m.author.id === client.user.id && m.embeds.length > 0 && m.embeds[0].title?.includes('Verification'));
        if (!hasPanel) {
          const embed = new EmbedBuilder()
            .setTitle('🔐 NEXAVERSE Verification')
            .setDescription(
              '**Welcome to the server!**\n\n' +
              'To gain full access, you need to verify your account.\n\n' +
              '**How it works:**\n' +
              '1. Click the **Verify** button below\n' +
              '2. Confirm in the popup that appears\n' +
              '3. You will receive the **Verified** role\n\n' +
              '*This confirms you are a real member and not a bot.*'
            )
            .setColor(config.colors.primary)
            .setFooter({ text: 'NEXAVERSE Verification System' })
            .setTimestamp();
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('verify_confirm').setLabel('Begin Verification').setStyle(ButtonStyle.Success).setEmoji('🔐')
          );
          await message.channel.send({ embeds: [embed], components: [row] });
        }
      } catch (e) {}
      return;
    }

    // Ensure user exists
    db.prepare('INSERT OR IGNORE INTO users (user_id, guild_id, username, created_at) VALUES (?, ?, ?, ?)').run(userId, guildId, author.username, Date.now());

    // Track messages
    db.prepare(`UPDATE users SET messages = messages + 1, daily_messages = daily_messages + 1,
      weekly_messages = weekly_messages + 1, monthly_messages = monthly_messages + 1,
      last_message_time = ?, updated_at = ? WHERE user_id = ? AND guild_id = ?`)
      .run(Date.now(), Date.now(), userId, guildId);

    // Periodically update nickname (every 20 messages)
    const msgCount = db.prepare('SELECT messages FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
    if (msgCount && msgCount.messages % 20 === 0) {
      updateNickname(message.member).catch(() => {});
    }

    // Check bad words
    const badWord = checkBadWords(content);
    if (badWord) {
      await message.delete().catch(() => {});
      decreaseReputation(userId, config.reputation.warnDecrease, badWord.type, guildId);
      const { warn } = require('../systems/moderation');
      const result = warn(userId, client.user.id, `Auto-warn: ${badWord.type} detected`, guildId);
      await log(guild, 'moderation', `🤖 Auto-Warn: ${badWord.type}`, {
        actor: userId,
        reason: `Word/pattern detected: ${badWord.word || badWord.type}`,
        caseId: result.caseId,
      });
      const { sendDM, modActionDM } = require('../utils/dm');
      sendDM(author, modActionDM({
        action: 'warn',
        caseId: result.caseId,
        reason: `Automatic filter: inappropriate language detected. Your message was removed.`,
        moderatorId: client.user.id,
        guildName: guild.name,
      })).catch(() => {});
      return;
    }

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
      return;
    }

    // Check spam
    const spamResult = checkSpam(userId, guildId, content);
    if (spamResult.spamDetected) {
      decreaseReputation(userId, config.reputation.spamDecrease, spamResult.spamType, guildId);
      await log(guild, 'messages', `🚨 Spam: ${spamResult.spamType}`, {
        actor: userId,
        reason: `${spamResult.messageCount} messages in window`,
      });
      return;
    }

    // Add XP
    const xpResult = addXp(userId, Math.floor(Math.random() * (config.xp.messageXpMax - config.xp.messageXpMin + 1)) + config.xp.messageXpMin, 'message', guildId);

    if (xpResult && xpResult.leveled) {
      await log(guild, 'members', `⭐ Level Up`, {
        actor: userId,
        reason: `Now level ${xpResult.level}`,
      });

      // Role rewards: auto-assign role on level up
      const roleReward = config.roleRewards[xpResult.level];
      if (roleReward && message.member) {
        try {
          const role = guild.roles.cache.get(roleReward);
          if (role) {
            await message.member.roles.add(role, 'Level-up role reward');
            await log(guild, 'members', `🏆 Role Reward`, {
              actor: userId,
              reason: `Level ${xpResult.level} — granted ${role.name}`,
            });
          }
        } catch (e) {
          console.error('[XP] Role reward failed:', e.message);
        }
      }
    }

    // Check achievements
    const user = db.prepare('SELECT * FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
    if (user) {
      const newAchievements = checkAchievements(userId, user, guildId);
      for (const ach of newAchievements) {
        await log(guild, 'members', `🏆 ${ach.icon} ${ach.name}`, {
          actor: userId,
          reason: ach.description,
        });
      }
    }
  },
};
