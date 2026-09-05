const { EmbedBuilder } = require('discord.js');
const config = require('../config');

/**
 * Send a DM to a user. Never throws — failures are logged and returned.
 * @param {import('discord.js').User} user
 * @param {EmbedBuilder|EmbedBuilder[]} embeds
 * @returns {Promise<{sent: boolean, error?: string}>}
 */
async function sendDM(user, embeds) {
  try {
    if (!user || user.bot) return { sent: false, error: 'Bot user' };
    const embedArray = Array.isArray(embeds) ? embeds : [embeds];
    await user.send({ embeds: embedArray });
    return { sent: true };
  } catch (e) {
    console.error(`[DM] Failed to DM ${user?.id}:`, e.message);
    return { sent: false, error: e.message };
  }
}

/**
 * Send a DM to a member by ID via guild fetch.
 */
async function sendDMById(guild, userId, embeds) {
  try {
    const member = await guild.members.fetch(userId);
    if (!member) return { sent: false, error: 'Member not found' };
    return await sendDM(member.user, embeds);
  } catch (e) {
    return { sent: false, error: e.message };
  }
}

// ===== STANDARD DM TEMPLATES =====

function modActionDM({ action, caseId, reason, moderatorId, duration, guildName }) {
  const colorMap = {
    warn: config.colors.warning,
    timeout: config.colors.warning,
    untimeout: config.colors.success,
    kick: config.colors.error,
    ban: config.colors.error,
    unban: config.colors.success,
    mute: config.colors.warning,
    unmute: config.colors.success,
  };

  const titles = {
    warn: 'You received a warning',
    timeout: 'You were timed out',
    untimeout: 'Your timeout was removed',
    kick: 'You were kicked',
    ban: 'You were banned',
    unban: 'You were unbanned',
    mute: 'You were muted',
    unmute: 'You were unmuted',
  };

  const embed = new EmbedBuilder()
    .setAuthor({ name: 'NEXAVERSE Moderation' })
    .setTitle(titles[action] || 'Moderation Action')
    .setColor(colorMap[action] || config.colors.moderation)
    .setDescription(
      `\u2501`.repeat(32) + '\n' +
      `**Server** ${guildName}\n` +
      `**Action** ${action.charAt(0).toUpperCase() + action.slice(1)}\n` +
      `**Case** ${caseId}\n` +
      (duration ? `**Duration** ${duration}\n` : '') +
      `**Reason** ${reason}\n` +
      `**Moderator** <@${moderatorId}>\n` +
      `\u2501`.repeat(32)
    )
    .setFooter({ text: 'Contact staff if you believe this is a mistake.' })
    .setTimestamp();

  return embed;
}

function welcomeDM({ user, guildName }) {
  return new EmbedBuilder()
    .setAuthor({ name: 'NEXAVERSE' })
    .setTitle(`Welcome to ${guildName}`)
    .setColor(config.colors.primary)
    .setDescription(
      `\u2501`.repeat(32) + '\n' +
      `Thanks for joining **${guildName}**.\n\n` +
      `**Getting started**\n` +
      `Verify with \`/verify\` to unlock all channels\n` +
      `Check \`/account\` for your profile and stats\n` +
      `Try \`/games\` to play and earn credits\n` +
      `\u2501`.repeat(32)
    )
    .setFooter({ text: 'NEXAVERSE System' })
    .setTimestamp();
}

function levelUpDM({ level, rankName }) {
  return new EmbedBuilder()
    .setAuthor({ name: 'NEXAVERSE Progress' })
    .setTitle(`Level Up \u2014 Level ${level}`)
    .setColor(config.colors.success)
    .setDescription(
      `You reached **Level ${level}**${rankName ? ` \u00b7 ${rankName}` : ''}.\n` +
      `Keep being active to earn more rewards.`
    )
    .setTimestamp();
}

function transferDM({ direction, fromId, toId, amount, fee, txId }) {
  const isIncoming = direction === 'received';
  return new EmbedBuilder()
    .setAuthor({ name: 'NEXAVERSE Economy' })
    .setTitle(isIncoming ? 'Transfer Received' : 'Transfer Sent')
    .setColor(isIncoming ? config.colors.success : config.colors.economy)
    .setDescription(
      `\u2501`.repeat(32) + '\n' +
      (isIncoming ? `**From** <@${fromId}>\n` : `**To** <@${toId}>\n`) +
      `**Amount** ${amount} Credits\n` +
      (fee ? `**Fee** ${fee} Credits\n` : '') +
      `**TxID** \`${txId}\`\n` +
      `\u2501`.repeat(32)
    )
    .setTimestamp();
}

function otpDM({ code, purpose, expiresIn = '5 minutes' }) {
  return new EmbedBuilder()
    .setAuthor({ name: 'NEXAVERSE Security' })
    .setTitle(purpose === 'verify' ? 'Verification Code' : 'Transfer Confirmation Code')
    .setColor(config.colors.primary)
    .setDescription(
      `\u2501`.repeat(32) + '\n' +
      `Your code is:\n\n` +
      `**\`${code}\`**\n\n` +
      `Enter this in the server to ${purpose === 'verify' ? 'complete verification' : 'confirm your transfer'}.\n` +
      `Expires in ${expiresIn}.\n` +
      `\u2501`.repeat(32) + '\n' +
      `If you did not request this, ignore this message.`
    )
    .setFooter({ text: 'Never share this code with anyone.' })
    .setTimestamp();
}

function eventPrizeDM({ prize, eventName, position }) {
  return new EmbedBuilder()
    .setAuthor({ name: 'NEXAVERSE Events' })
    .setTitle(`Event Reward \u2014 ${eventName}`)
    .setColor(config.colors.success)
    .setDescription(
      `${position ? `You placed **${position}**.\n` : ''}` +
      `**Prize** ${prize} Credits\n` +
      `Added to your wallet.`
    )
    .setTimestamp();
}

module.exports = {
  sendDM,
  sendDMById,
  modActionDM,
  welcomeDM,
  levelUpDM,
  transferDM,
  otpDM,
  eventPrizeDM,
};
