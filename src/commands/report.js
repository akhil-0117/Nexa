const { SlashCommandBuilder, EmbedBuilder, UserSelectMenuBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const config = require('../config');

// Predefined issue categories
const STAFF_ISSUES = [
  { label: 'Abuse of Power', value: 'abuse_of_power', description: 'Using staff tools unfairly or excessively' },
  { label: 'Unfair Moderation', value: 'unfair_mod', description: 'Unjustified warns, mutes, kicks, or bans' },
  { label: 'Discrimination', value: 'discrimination', description: 'Bias based on race, gender, status, etc.' },
  { label: 'Favoritism', value: 'favoritism', description: 'Giving friends preferential treatment' },
  { label: 'Breaking Server Rules', value: 'breaking_rules', description: 'Staff violating rules they enforce' },
  { label: 'Harassment', value: 'harassment', description: 'Using position to harass or threaten members' },
  { label: 'Leaking Info', value: 'leaking', description: 'Sharing private staff information' },
  { label: 'Other (Write Your Own)', value: 'other_staff', description: 'Describe the issue manually' },
];

const MEMBER_ISSUES = [
  { label: 'Swearing / Profanity', value: 'swearing', description: 'Excessive or targeted profanity' },
  { label: 'Threats / Violence', value: 'threats', description: 'Threatening other members' },
  { label: 'Inappropriate Content', value: 'inappropriate', description: 'NSFW, gore, or disturbing content' },
  { label: 'Harassment / Bullying', value: 'harassment_member', description: 'Targeting or bullying specific members' },
  { label: 'Spam / Raid Behavior', value: 'spam', description: 'Mass messaging or raiding' },
  { label: 'Scamming / Phishing', value: 'scam', description: 'Attempting to steal accounts or credits' },
  { label: 'Impersonation', value: 'impersonation', description: 'Pretending to be staff or another member' },
  { label: 'Other (Write Your Own)', value: 'other_member', description: 'Describe the issue manually' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('report')
    .setDescription('Report a user for rule violations or abuse'),

  async execute(interaction) {
    const divider = '\u2501'.repeat(32);

    const embed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setDescription(
        `${divider}\n` +
        `**NEXAVERSE Report System**\n\n` +
        `Use this to report a member for rule violations, abuse, or any concerning behavior.\n\n` +
        `**How it works:**\n` +
        `1. Select the user you want to report\n` +
        `2. Choose if it is a **Staff** or **Member** issue\n` +
        `3. Select the type of violation or write your own\n` +
        `4. Your report is logged and higher officials will review it\n\n` +
        `${divider}\n` +
        `*Only submit genuine reports. False reports may result in a warning.*`
      )
      .setFooter({ text: 'NEXAVERSE Report System' })
      .setTimestamp();

    const userSelect = new ActionRowBuilder().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId('report_user_select')
        .setPlaceholder('Select the user to report...')
        .setMinValues(1)
        .setMaxValues(1)
    );

    await interaction.reply({ embeds: [embed], components: [userSelect], flags: 64 });
  },
};

module.exports.STAFF_ISSUES = STAFF_ISSUES;
module.exports.MEMBER_ISSUES = MEMBER_ISSUES;
