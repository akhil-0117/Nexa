const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUser } = require('../systems/economy');
const { getXpInfo } = require('../systems/xp');
const { getRepInfo } = require('../systems/reputation');
const { getInviteStats } = require('../systems/invites');
const { getAchievements } = require('../systems/achievements');
const config = require('../config');
const { formatCredits, formatDateTime, getRankForXp } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('account')
    .setDescription('Open your Account Panel'),

  async execute(interaction) {
    const { user, guild } = interaction;
    const userId = user.id;
    const guildId = guild.id;

    const userData = getUser(userId, guildId);
    const xpInfo = getXpInfo(userId, guildId);
    const repInfo = getRepInfo(userId, guildId);
    const inviteStats = getInviteStats(userId, guildId);
    const achievements = getAchievements(userId, guildId);

    const rank = getRankForXp(userData.total_xp);

    const embed = new EmbedBuilder()
      .setTitle(`${user.username}'s Account`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setColor(rank.color)
      .addFields(
        { name: '👤 Username', value: user.username, inline: true },
        { name: '📅 Joined', value: formatDateTime(userData.joined_at), inline: true },
        { name: '⭐ Level', value: `${xpInfo.level}`, inline: true },
        { name: '🎖️ Rank', value: rank.name, inline: true },
        { name: '✨ XP', value: `${xpInfo.xp}/${xpInfo.xpNeeded}`, inline: true },
        { name: '📊 Progress', value: `${xpInfo.progress}%`, inline: true },
        { name: '💰 Credits', value: formatCredits(userData.credits), inline: true },
        { name: '🤝 Reputation', value: `${repInfo.score} (${repInfo.level.label})`, inline: true },
        { name: '💬 Messages', value: `${userData.messages}`, inline: true },
        { name: '📨 Invites', value: `${inviteStats.valid_invites}`, inline: true },
        { name: '🎮 Games', value: `${userData.games_played} played, ${userData.games_won} won`, inline: true },
        { name: '🏆 Achievements', value: `${achievements.length}/${config.achievements.length}`, inline: true },
      )
      .setFooter({ text: 'NEXAVERSE Account Panel • Click buttons below to explore' })
      .setTimestamp();

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('account_profile').setLabel('Profile').setStyle(ButtonStyle.Primary).setEmoji('👤'),
      new ButtonBuilder().setCustomId('account_wallet').setLabel('Wallet').setStyle(ButtonStyle.Primary).setEmoji('💰'),
      new ButtonBuilder().setCustomId('account_activity').setLabel('Activity').setStyle(ButtonStyle.Primary).setEmoji('📊'),
      new ButtonBuilder().setCustomId('account_reputation').setLabel('Reputation').setStyle(ButtonStyle.Primary).setEmoji('🤝'),
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('account_achievements').setLabel('Achievements').setStyle(ButtonStyle.Primary).setEmoji('🏆'),
      new ButtonBuilder().setCustomId('account_statistics').setLabel('Statistics').setStyle(ButtonStyle.Primary).setEmoji('📈'),
      new ButtonBuilder().setCustomId('account_transactions').setLabel('Transactions').setStyle(ButtonStyle.Primary).setEmoji('💳'),
      new ButtonBuilder().setCustomId('account_invites').setLabel('Invites').setStyle(ButtonStyle.Primary).setEmoji('📨'),
    );

    await interaction.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
  },
};
