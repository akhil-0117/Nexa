const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the server leaderboard')
    .addStringOption(opt =>
      opt.setName('category')
        .setDescription('Leaderboard category')
        .addChoices(
          { name: 'Credits', value: 'credits' },
          { name: 'XP / Level', value: 'xp' },
          { name: 'Messages', value: 'messages' },
          { name: 'Reputation', value: 'reputation' },
          { name: 'Games Won', value: 'games' },
          { name: 'Invites', value: 'invites' },
        )
    ),

  async execute(interaction) {
    const category = interaction.options.getString('category') || 'credits';
    await showLeaderboard(interaction, category);
  },
};

async function showLeaderboard(interaction, category, isUpdate = false) {
  const { getDb } = require('../database/init');
  const { formatCredits } = require('../utils/helpers');
  const db = getDb();
  const guildId = interaction.guild.id;

  const sortMap = {
    credits: { col: 'credits', label: 'Credits', format: (v) => formatCredits(v) },
    xp: { col: 'total_xp', label: 'Total XP', format: (v) => v.toLocaleString() + ' XP' },
    messages: { col: 'messages', label: 'Messages', format: (v) => v.toLocaleString() },
    reputation: { col: 'reputation', label: 'Reputation', format: (v) => v + '/100' },
    games: { col: 'games_won', label: 'Games Won', format: (v) => v + 'W' },
    invites: { col: 'valid_invites', label: 'Invites', format: (v) => v.toString() },
  };

  const sort = sortMap[category];
  const rows = db.prepare(`SELECT user_id, username, ${sort.col} as value FROM users WHERE guild_id = ? ORDER BY ${sort.col} DESC LIMIT 15`).all(guildId);

  const medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];
  let desc = `\u2501`.repeat(32) + '\n';

  if (rows.length === 0) {
    desc += 'No data yet.';
  } else {
    rows.forEach((row, i) => {
      const medal = i < 3 ? medals[i] + ' ' : `**${i + 1}.** `;
      const name = row.username || `<@${row.user_id}>`;
      desc += `${medal}**${name}** \u2014 ${sort.format(row.value)}\n`;
    });
  }

  desc += `\n\u2501`.repeat(32);

  const embed = new EmbedBuilder()
    .setTitle(`NEXAVERSE \u00b7 ${sort.label} Leaderboard`)
    .setColor(config.colors.primary)
    .setDescription(desc)
    .setFooter({ text: `Top ${rows.length} users \u00b7 ${interaction.guild.name}` })
    .setTimestamp();

  const select = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('leaderboard_select')
      .setPlaceholder('Switch category...')
      .addOptions([
        { label: 'Credits', value: 'credits', emoji: '\uD83D\uDCB0' },
        { label: 'XP / Level', value: 'xp', emoji: '\u2B50' },
        { label: 'Messages', value: 'messages', emoji: '\uD83D\uDCAC' },
        { label: 'Reputation', value: 'reputation', emoji: '\uD83C\uDFAF' },
        { label: 'Games Won', value: 'games', emoji: '\uD83C\uDFAE' },
        { label: 'Invites', value: 'invites', emoji: '\uD83D\uDCE3' },
      ])
  );

  if (isUpdate) {
    await interaction.update({ embeds: [embed], components: [select] });
  } else {
    await interaction.reply({ embeds: [embed], components: [select] });
  }
}

module.exports.showLeaderboard = showLeaderboard;
