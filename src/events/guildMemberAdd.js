const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDb } = require('../database/init');
const { trackJoinWithAge } = require('../systems/antiRaid');
const { log } = require('../systems/logging');
const { recordJoin } = require('../systems/invites');
const { updateNickname } = require('../utils/helpers');
const { sendDM, welcomeDM } = require('../utils/dm');
const config = require('../config');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member, client) {
    const { guild, user } = member;
    const guildId = guild.id;
    const db = getDb();

    // Ensure user record
    db.prepare('INSERT OR IGNORE INTO users (user_id, guild_id, username, joined_at, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(user.id, guildId, user.username, Date.now(), Date.now());
    db.prepare('UPDATE users SET username = ?, updated_at = ? WHERE user_id = ? AND guild_id = ?')
      .run(user.username, Date.now(), user.id, guildId);

    // Track join for anti-raid
    const accountAge = Date.now() - user.createdTimestamp;
    const raidResult = trackJoinWithAge(guildId, user.id, accountAge);

    if (raidResult.raidDetected) {
      await log(guild, 'security', '🚨 Possible Raid Detected', {
        reason: `${raidResult.joinCount} joins detected. Severity: ${raidResult.severity}`,
      });

      if (raidResult.severity === 'high') {
        const lockdownChannel = guild.channels.cache.find(c => c.name.includes('security') || c.name.includes('staff'));
        if (lockdownChannel) {
          await lockdownChannel.send({ embeds: [
            new EmbedBuilder()
              .setTitle('🚨 HIGH SECURITY ALERT')
              .setDescription('Possible raid detected! Consider enabling lockdown.')
              .setColor(config.colors.error)
              .setTimestamp()
          ] });
        }
      }
    }

    // Log join
    await log(guild, 'members', '👋 Member Joined', {
      actor: user.id,
      reason: `Account age: ${Math.floor(accountAge / 86400000)} days`,
    });

    // Welcome message
    const welcomeChannelId = db.prepare('SELECT value FROM guild_config WHERE guild_id = ? AND key = ?').get(guildId, 'welcome_channel');
    const channel = welcomeChannelId ? guild.channels.cache.get(welcomeChannelId.value) : guild.systemChannel;

    if (channel) {
      const embed = new EmbedBuilder()
        .setTitle(`Welcome to ${guild.name}!`)
        .setDescription(`Hey ${member}, welcome to **${guild.name}**! You are member #${guild.memberCount}.\n\nUse \`/verify\` to verify your account.`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setColor(config.colors.success)
        .setTimestamp();

      await channel.send({ embeds: [embed] }).catch(() => {});
    }

    // Welcome DM (fast, non-blocking)
    sendDM(user, welcomeDM({ user, guildName: guild.name })).catch(() => {});

    // Update nickname to show role
    await updateNickname(member);
  },
};
