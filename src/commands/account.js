const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUser } = require('../systems/economy');
const { getXpInfo } = require('../systems/xp');
const { getRepInfo } = require('../systems/reputation');
const { getInviteStats } = require('../systems/invites');
const { getAchievements, getAllAchievements } = require('../systems/achievements');
const { getRankForXp, formatCredits, formatTimestamp, backToMainMenu } = require('../utils/helpers');
const { getMemberRoleName, getStaffRole } = require('../utils/permissions');
const config = require('../config');

const PRESIDENT_GIFS = [
  'https://c.tenor.com/YW9ehEp6X0kAAAAd/tenor.gif',
  'https://c.tenor.com/Z31b_uCKPVEAAAAd/tenor.gif',
];

function getPresidentGif() {
  return PRESIDENT_GIFS[Math.floor(Math.random() * PRESIDENT_GIFS.length)];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('account')
    .setDescription('Open your NEXAVERSE account panel')
    .addSubcommand(sub =>
      sub.setName('economy').setDescription('Open the economy panel')
    ),

  async execute(interaction) {
    const { user, guild, member } = interaction;
    const guildId = guild.id;

    if (interaction.options.getSubcommand(false) === 'economy') {
      return showEconomyPanel(interaction);
    }

    // Loading screen
    await interaction.deferReply();

    const userData = getUser(user.id, guildId);
    const xpInfo = getXpInfo(user.id, guildId);
    const rank = getRankForXp(userData.total_xp);
    const repInfo = getRepInfo(user.id, guildId);
    const roleName = getMemberRoleName(member);
    const staffRole = getStaffRole(member);

    const embed = new EmbedBuilder()
      .setAuthor({ name: `${user.username}'s Account`, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setTitle('NEXAVERSE Account')
      .setColor(rank.color)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'Level', value: `${xpInfo.level}`, inline: true },
        { name: 'Rank', value: rank.name, inline: true },
        { name: 'XP', value: `${xpInfo.xp}/${xpInfo.xpNeeded}`, inline: true },
        { name: 'Credits', value: formatCredits(userData.credits), inline: true },
        { name: 'Reputation', value: `${repInfo.score} \u00b7 ${repInfo.level.label}`, inline: true },
        { name: 'Role', value: roleName, inline: true },
        { name: 'Messages', value: `${userData.messages}`, inline: true },
        { name: 'Games Won', value: `${userData.games_won}/${userData.games_played}`, inline: true },
        { name: 'Achievements', value: `${getAchievements(user.id, guildId).length}/${getAllAchievements().length}`, inline: true },
      )
      .setFooter({ text: 'Select an option below' })
      .setTimestamp();

    // Add GIF for President/Co-President roles
    if (staffRole && (staffRole.name === 'PRESIDENT' || staffRole.name === 'CO_PRESIDENT')) {
      embed.setImage(getPresidentGif());
    }

    const select = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('account_select')
        .setPlaceholder('Choose an option...')
        .addOptions([
          { label: 'Profile', value: 'profile', description: 'View full profile card' },
          { label: 'Wallet', value: 'wallet', description: 'Check balance & transfer' },
          { label: 'Economy', value: 'economy', description: 'Daily, weekly rewards' },
          { label: 'Activity', value: 'activity', description: 'Message stats & streak' },
          { label: 'Reputation', value: 'reputation', description: 'Trust score & restrictions' },
          { label: 'Achievements', value: 'achievements', description: 'Unlocked achievements' },
          { label: 'Transactions', value: 'transactions', description: 'Recent transactions' },
          { label: 'Invites', value: 'invites', description: 'Invite statistics' },
        ])
    );

    await interaction.editReply({ embeds: [embed], components: [select] });
  },
};

async function showEconomyPanel(interaction) {
  const { user, guild } = interaction;
  const guildId = guild.id;

  await interaction.deferReply();

  const userData = getUser(user.id, guildId);
  const repInfo = getRepInfo(user.id, guildId);

  const embed = new EmbedBuilder()
    .setTitle('Economy Panel')
    .setColor(config.colors.economy)
    .setDescription(`**Balance:** ${formatCredits(userData.credits)}\n**Reputation:** ${repInfo.score} \u00b7 ${repInfo.level.label}`)
    .addFields(
      { name: 'Daily Reward', value: formatCredits(config.economy.dailyReward), inline: true },
      { name: 'Weekly Reward', value: formatCredits(config.economy.weeklyReward), inline: true },
      { name: 'Transfer Fee', value: `${config.economy.transferFeePercent}%`, inline: true },
    )
    .setTimestamp();

  const select = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('economy_select')
      .setPlaceholder('Choose an action...')
      .addOptions([
        { label: 'Claim Daily', value: 'daily', description: 'Claim daily reward' },
        { label: 'Claim Weekly', value: 'weekly', description: 'Claim weekly reward' },
        { label: 'Transfer', value: 'transfer', description: 'Send credits to a user' },
        { label: 'Transactions', value: 'transactions', description: 'View recent transactions' },
        { label: 'Leaderboard', value: 'leaderboard', description: 'Top earners' },
      ])
  );

  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('nav_account_back')
      .setLabel('\u2190 Back')
      .setStyle(ButtonStyle.Secondary)
  );

  await interaction.editReply({ embeds: [embed], components: [select, backRow] });
}
