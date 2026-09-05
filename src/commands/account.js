const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getUser } = require('../systems/economy');
const { getXpInfo } = require('../systems/xp');
const { getRepInfo } = require('../systems/reputation');
const { getAchievements, getAllAchievements } = require('../systems/achievements');
const { getRankForXp, formatCredits } = require('../utils/helpers');
const { getMemberRoleName } = require('../utils/permissions');
const { generateProfileCard } = require('../utils/images');
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

    // Loading screen
    await interaction.deferReply();

    try {
      const userData = getUser(user.id, guildId);
      const xpInfo = getXpInfo(user.id, guildId);
      const rank = getRankForXp(userData.total_xp);
      const repInfo = getRepInfo(user.id, guildId);
      const roleName = getMemberRoleName(member);

      // Generate profile card image
      const attachment = await generateProfileCard(user, userData, xpInfo, rank, repInfo, roleName);

      const embed = new EmbedBuilder()
        .setAuthor({ name: `${user.username} — Account Dashboard`, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .setColor(config.colors.primary)
        .setImage('attachment://profile.png')
        .setFooter({ text: 'Select an option below' })
        .setTimestamp();

      // GIF for President/Co-President
      const { getStaffRole } = require('../utils/permissions');
      const staffRole = getStaffRole(member);
      if (staffRole && (staffRole.name === 'PRESIDENT' || staffRole.name === 'CO_PRESIDENT')) {
        embed.setThumbnail(PRESIDENT_GIFS[Math.floor(Math.random() * PRESIDENT_GIFS.length)]);
      }

      const select = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('account_select')
          .setPlaceholder('Choose an option...')
          .addOptions([
            { label: 'Economy', value: 'economy', description: 'Daily, weekly, transfers' },
            { label: 'Activity', value: 'activity', description: 'Message stats and streaks' },
            { label: 'Reputation', value: 'reputation', description: 'Trust score and restrictions' },
            { label: 'Achievements', value: 'achievements', description: 'Unlocked achievements' },
            { label: 'Transactions', value: 'transactions', description: 'Recent transactions' },
            { label: 'Invites', value: 'invites', description: 'Invite statistics' },
          ])
      );

      await interaction.editReply({ embeds: [embed], files: [attachment], components: [select] });
    } catch (error) {
      console.error('[ACCOUNT] Error:', error.message);
      await interaction.editReply({
        embeds: [new EmbedBuilder().setTitle('Error').setDescription('Failed to load account. Try again.').setColor(config.colors.error)]
      });
    }
  },
};
