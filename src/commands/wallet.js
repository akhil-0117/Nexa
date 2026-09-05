const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getUser, getBalance } = require('../systems/economy');
const { getRepInfo } = require('../systems/reputation');
const config = require('../config');
const { formatCredits, getEffectiveMaxTransfer, getMemberRoleName } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wallet')
    .setDescription('Open your NEXAVERSE wallet'),

  async execute(interaction) {
    await interaction.deferReply();

    const { user, guild, member } = interaction;
    const guildId = guild.id;
    const userData = getUser(user.id, guildId);
    const repInfo = getRepInfo(user.id, guildId);
    const maxTransfer = getEffectiveMaxTransfer(userData.reputation);

    const divider = '\u2501'.repeat(32);

    const embed = new EmbedBuilder()
      .setAuthor({ name: `${user.username} \u2014 Wallet`, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setTitle('NEXAVERSE Wallet')
      .setColor(config.colors.economy)
      .setDescription(
        `${divider}\n` +
        `**Balance:** ${formatCredits(userData.credits)}\n` +
        `**Reputation:** ${repInfo.score}/100 \u00b7 ${repInfo.level.label}\n` +
        `**Max Transfer:** ${formatCredits(maxTransfer)}\n` +
        `${divider}\n` +
        `**Sent:** ${userData.transfers_sent}x\n` +
        `**Received:** ${userData.transfers_received}x\n` +
        `**Daily Reward:** ${formatCredits(config.economy.dailyReward)}\n` +
        `**Weekly Reward:** ${formatCredits(config.economy.weeklyReward)}\n` +
        `${divider}\n` +
        `Transfers above 1,000 require DM OTP verification.`
      )
      .setFooter({ text: 'NEXAVERSE Wallet' })
      .setTimestamp();

    const select = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('wallet_action_select')
        .setPlaceholder('Choose an action...')
        .addOptions([
          { label: 'Claim Daily', value: 'daily', description: 'Claim daily reward' },
          { label: 'Claim Weekly', value: 'weekly', description: 'Claim weekly reward' },
          { label: 'Transfer', value: 'transfer', description: 'Send credits to a user' },
          { label: 'Transactions', value: 'transactions', description: 'Recent activity' },
          { label: 'Leaderboard', value: 'leaderboard', description: 'Top earners' },
        ])
    );

    await interaction.editReply({ embeds: [embed], components: [select] });
  },
};
