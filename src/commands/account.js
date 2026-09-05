const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getUser } = require('../systems/economy');
const { getXpInfo } = require('../systems/xp');
const { getRepInfo } = require('../systems/reputation');
const { getAchievements, getAllAchievements } = require('../systems/achievements');
const { getRankForXp, formatCredits } = require('../utils/helpers');
const { getMemberRoleName, getStaffRole } = require('../utils/permissions');
const config = require('../config');

const PRESIDENT_GIFS = [
  'https://c.tenor.com/YW9ehEp6X0kAAAAd/tenor.gif',
  'https://c.tenor.com/Z31b_uCKPVEAAAAd/tenor.gif',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('account')
    .setDescription('Open your NEXAVERSE account panel'),

  async execute(interaction) {
    const { user, guild, member } = interaction;
    const guildId = guild.id;

    await interaction.deferReply();

    try {
      const userData = getUser(user.id, guildId);
      const xpInfo = getXpInfo(user.id, guildId);
      const rank = getRankForXp(userData.total_xp);
      const repInfo = getRepInfo(user.id, guildId);
      const roleName = getMemberRoleName(member);
      const staffRole = getStaffRole(member);

      const divider = '\u2501'.repeat(32);

      const embed = new EmbedBuilder()
        .setAuthor({ name: `${user.username} \u2014 Account`, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .setColor(config.colors.primary)
        .setDescription(
          `${divider}\n` +
          `**Level:** ${xpInfo.level} \u00b7 ${rank.name}\n` +
          `**XP:** ${xpInfo.xp}/${xpInfo.xpNeeded}\n` +
          `**Credits:** ${formatCredits(userData.credits)}\n` +
          `**Reputation:** ${repInfo.score}/100 \u00b7 ${repInfo.level.label}\n` +
          `**Role:** ${roleName}\n` +
          `**Messages:** ${userData.messages}\n` +
          `**Games:** ${userData.games_won}W / ${userData.games_played}P\n` +
          `**Achievements:** ${getAchievements(user.id, guildId).length}/${getAllAchievements().length}\n` +
          `${divider}`
        )
        .setFooter({ text: 'Select an option below' })
        .setTimestamp();

      // GIF for President/Co-President
      if (staffRole && (staffRole.name === 'PRESIDENT' || staffRole.name === 'CO_PRESIDENT')) {
        embed.setImage(PRESIDENT_GIFS[Math.floor(Math.random() * PRESIDENT_GIFS.length)]);
      } else {
        embed.setThumbnail(user.displayAvatarURL({ dynamic: true }));
      }

      const select = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('account_select')
          .setPlaceholder('Choose an option...')
          .addOptions([
            { label: 'Profile', value: 'profile', description: 'View your profile card' },
            { label: 'Economy', value: 'economy', description: 'Daily, weekly, transfers' },
            { label: 'Activity', value: 'activity', description: 'Message stats and streaks' },
            { label: 'Reputation', value: 'reputation', description: 'Trust score and restrictions' },
            { label: 'Achievements', value: 'achievements', description: 'Unlocked achievements' },
            { label: 'Transactions', value: 'transactions', description: 'Recent transactions' },
            { label: 'Invites', value: 'invites', description: 'Invite statistics' },
          ])
      );

      await interaction.editReply({ embeds: [embed], components: [select] });
    } catch (error) {
      console.error('[ACCOUNT] Error:', error.message);
      await interaction.editReply({
        embeds: [new EmbedBuilder().setTitle('Error').setDescription('Failed to load account. Try again.').setColor(config.colors.error)]
      });
    }
  },
};
