const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getUser } = require('../systems/economy');
const { getRepInfo } = require('../systems/reputation');
const config = require('../config');
const { formatCredits, getEffectiveMaxTransfer } = require('../utils/helpers');
const { generateBrandBanner } = require('../utils/images');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wallet')
    .setDescription('Open your NEXAVERSE wallet'),

  async execute(interaction) {
    await interaction.deferReply();

    const { user } = interaction;
    const guildId = interaction.guild.id;
    const userData = getUser(user.id, guildId);
    const repInfo = getRepInfo(user.id, guildId);
    const maxTransfer = getEffectiveMaxTransfer(userData.reputation);

    const divider = '\u2501'.repeat(32);

    const embed = new EmbedBuilder()
      .setAuthor({ name: `${user.username} \u2014 Wallet`, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setColor(config.colors.economy)
      .setDescription(
        `Select an action from the dropdown below.\n\n` +
        `**Actions**\n` +
        `Claim Daily \u2014 ${formatCredits(config.economy.dailyReward)} every 24h\n` +
        `Claim Weekly \u2014 ${formatCredits(config.economy.weeklyReward)} every 7 days\n` +
        `Transfer \u2014 Send credits to another member\n` +
        `Transactions \u2014 Recent credit history\n` +
        `Leaderboard \u2014 Top holders\n\n` +
        `${divider}\n` +
        `**Balance** ${formatCredits(userData.credits)}\n` +
        `**Reputation** ${repInfo.score}/100 \u00b7 ${repInfo.level.label}\n` +
        `**Max Transfer** ${formatCredits(maxTransfer)}\n` +
        `**Transfer Fee** ${config.economy.transferFeePercent}%\n` +
        `**Sent** ${userData.transfers_sent}  \u00b7  **Received** ${userData.transfers_received}\n` +
        `${divider}\n` +
        `Transfers above 1,000 require DM OTP verification.`
      )
      .setFooter({ text: 'NEXAVERSE Wallet System' })
      .setTimestamp();

    const files = [];
    try {
      const banner = await generateBrandBanner('NEXAVERSE', 'WALLET SYSTEM');
      files.push(banner);
      embed.setImage('attachment://banner.png');
    } catch (e) {
      embed.setThumbnail(user.displayAvatarURL({ dynamic: true }));
    }

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

    await interaction.editReply({ embeds: [embed], files, components: [select] });
  },
};
