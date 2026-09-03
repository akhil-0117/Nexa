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
        { name: '👥 Members', value: `${memberCount}`, inline: true },
        { name: '💬 Messages', value: `${formatNumber(totalMessages?.total || 0)}`, inline: true },
        { name: '💰 Credits', value: `${formatNumber(totalCredits?.total || 0)}`, inline: true },
        { name: '👤 Accounts', value: `${totalUsers?.count || 0}`, inline: true },
        { name: '🎮 Active Games', value: `${activeGames?.count || 0}`, inline: true },
        { name: '🎁 Active Giveaways', value: `${activeGiveaways?.count || 0}`, inline: true },
        { name: '🎫 Open Tickets', value: `${openTickets?.count || 0}`, inline: true },
        { name: '🚨 Pending Reports', value: `${pendingReports?.count || 0}`, inline: true },
      )
      .setFooter({ text: 'NEXAVERSE Server Statistics' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
