const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDb } = require('../database/init');
const config = require('../config');
const { formatNumber } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Show server statistics'),

  async execute(interaction) {
    const { guild } = interaction;
    const db = getDb();

    const memberCount = guild.memberCount;
    const onlineCount = guild.members.cache.filter(m => m.presence?.status !== 'offline').size;
    const botCount = guild.members.cache.filter(m => m.user.bot).size;

    const totalMessages = db.prepare('SELECT SUM(messages) as total FROM users WHERE guild_id = ?').get(guild.id);
    const totalCredits = db.prepare('SELECT SUM(credits) as total FROM users WHERE guild_id = ?').get(guild.id);
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE guild_id = ?').get(guild.id);
    const activeGames = db.prepare("SELECT COUNT(*) as count FROM game_sessions WHERE guild_id = ? AND status = 'active'").get(guild.id);
    const activeGiveaways = db.prepare("SELECT COUNT(*) as count FROM giveaways WHERE guild_id = ? AND status = 'active'").get(guild.id);
    const openTickets = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE guild_id = ? AND status IN ('open', 'claimed')").get(guild.id);
    const pendingReports = db.prepare("SELECT COUNT(*) as count FROM reports WHERE guild_id = ? AND status = 'pending'").get(guild.id);

    const embed = new EmbedBuilder()
      .setTitle(`📊 ${guild.name} Statistics`)
      .setColor(config.colors.info)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .addFields(
        { name: '👥 Members', value: `${memberCount} total\n${onlineCount} online\n${botCount} bots`, inline: true },
        { name: '💬 Messages', value: `${formatNumber(totalMessages?.total || 0)} total`, inline: true },
        { name: '💰 Economy', value: `${formatNumber(totalCredits?.total || 0)} credits\n${totalUsers?.count || 0} accounts`, inline: true },
        { name: '🎮 Games', value: `${activeGames?.count || 0} active`, inline: true },
        { name: '🎁 Giveaways', value: `${activeGiveaways?.count || 0} active`, inline: true },
        { name: '🎫 Tickets', value: `${openTickets?.count || 0} open`, inline: true },
        { name: '🚨 Reports', value: `${pendingReports?.count || 0} pending`, inline: true },
        { name: '📈 Server', value: `Created: <t:${Math.floor(guild.createdTimestamp / 1000)}:R>\nRoles: ${guild.roles.cache.size}\nChannels: ${guild.channels.cache.size}`, inline: true },
      )
      .setFooter({ text: 'NEXAVERSE Server Statistics' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
