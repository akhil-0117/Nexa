const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getUser, getTransactions } = require('../systems/economy');
const { getRepInfo } = require('../systems/reputation');
const config = require('../config');
const { formatCredits, getEffectiveMaxTransfer } = require('../utils/helpers');
const { getMemberRoleName } = require('../utils/permissions');
const { generateWalletCard } = require('../utils/images');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wallet')
    .setDescription('Open your NEXAVERSE wallet'),

  async execute(interaction) {
    await interaction.deferReply();

    const { user, member } = interaction;
    const guildId = interaction.guild.id;
    const userData = getUser(user.id, guildId);
    const transactions = getTransactions(user.id, guildId, 10);
    const roleName = getMemberRoleName(member);

    const attachment = await generateWalletCard(user, userData, transactions, roleName);

    const select = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('wallet_action_select')
        .setPlaceholder('Choose an action...')
        .addOptions([
          { label: 'Claim Daily', value: 'daily', description: `Claim ${formatCredits(config.economy.dailyReward)} credits` },
          { label: 'Claim Weekly', value: 'weekly', description: `Claim ${formatCredits(config.economy.weeklyReward)} credits` },
          { label: 'Transfer', value: 'transfer', description: 'Send credits to a user' },
          { label: 'Transactions', value: 'transactions', description: 'Recent activity' },
          { label: 'Leaderboard', value: 'leaderboard', description: 'Top earners' },
        ])
    );

    await interaction.editReply({ content: null, embeds: [], files: [attachment], attachments: [], components: [select] });
  },
};
