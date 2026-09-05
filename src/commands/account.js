const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getUser } = require('../systems/economy');
const { getXpInfo } = require('../systems/xp');
const { getRepInfo } = require('../systems/reputation');
const { getRankForXp, formatCredits } = require('../utils/helpers');
const { getMemberRoleName, getStaffRole } = require('../utils/permissions');
const { generateBrandBanner } = require('../utils/images');
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
          `Select a section from the dropdown below to explore your account.\n\n` +
          `**Sections**\n` +
          `Profile \u2014 Visual profile card\n` +
          `Activity \u2014 Messages and XP\n` +
          `Reputation \u2014 Trust score\n` +
          `Achievements \u2014 Unlocked badges\n` +
          `Transactions \u2014 Recent credits history\n` +
          `Invites \u2014 Invite statistics\n\n` +
          `${divider}\n` +
          `**Level** ${xpInfo.level} \u00b7 ${rank.name}  \u00b7  **XP** ${xpInfo.xp}/${xpInfo.xpNeeded}\n` +
          `**Credits** ${formatCredits(userData.credits)}  \u00b7  **Reputation** ${repInfo.score}/100\n` +
          `**Role** ${roleName}\n` +
          `${divider}`
        )
        .setFooter({ text: 'NEXAVERSE Account System' })
        .setTimestamp();

      const files = [];
      const isExecutive = staffRole && (staffRole.name === 'PRESIDENT' || staffRole.name === 'CO_PRESIDENT');
      if (isExecutive) {
        // President/Co-President get a random GIF as the panel image
        embed.setImage(PRESIDENT_GIFS[Math.floor(Math.random() * PRESIDENT_GIFS.length)]);
      } else {
        // Everyone else gets the NEXAVERSE brand banner
        try {
          const banner = await generateBrandBanner('NEXAVERSE', 'ACCOUNT SYSTEM');
          files.push(banner);
          embed.setImage('attachment://banner.png');
        } catch (e) {
          embed.setThumbnail(user.displayAvatarURL({ dynamic: true }));
        }
      }

      const select = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('account_select')
          .setPlaceholder('Browse your account...')
          .addOptions([
            { label: 'Profile', value: 'profile', description: 'View your visual profile card' },
            { label: 'Activity', value: 'activity', description: 'Messages, XP and level' },
            { label: 'Reputation', value: 'reputation', description: 'Trust score and restrictions' },
            { label: 'Achievements', value: 'achievements', description: 'Unlocked achievements' },
            { label: 'Transactions', value: 'transactions', description: 'Recent credit history' },
            { label: 'Invites', value: 'invites', description: 'Invite statistics' },
          ])
      );

      await interaction.editReply({ embeds: [embed], files, components: [select] });
    } catch (error) {
      console.error('[ACCOUNT] Error:', error.message);
      await interaction.editReply({
        embeds: [new EmbedBuilder().setTitle('Error').setDescription('Failed to load account. Try again.').setColor(config.colors.error)]
      });
    }
  },
};
