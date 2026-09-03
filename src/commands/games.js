const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getUser } = require('../systems/economy');
const { getRepInfo } = require('../systems/reputation');
const config = require('../config');
const { formatCredits, getEffectiveMaxBet } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('games')
    .setDescription('Open the Games Panel'),

  async execute(interaction) {
    const { user, guild } = interaction;
    const guildId = guild.id;
    const userData = getUser(user.id, guildId);
    const repInfo = getRepInfo(user.id, guildId);
    const maxBet = getEffectiveMaxBet(userData.reputation);

    const embed = new EmbedBuilder()
      .setTitle('🎮 NEXAVERSE Games')
      .setColor(config.colors.game)
      .setDescription(`**Balance:** ${formatCredits(userData.credits)}\n**Max Bet:** ${formatCredits(maxBet)}\n**Reputation:** ${repInfo.score} · ${repInfo.level.label}`)
      .addFields(
        { name: '🎰 Roulette', value: 'Red, black, green, or number (up to 35x)', inline: true },
        { name: '🪙 Coinflip', value: 'Heads or tails, 2x payout', inline: true },
        { name: '🃏 Blackjack', value: 'Beat the dealer to 21', inline: true },
        { name: '🎰 Slots', value: 'Spin to win big', inline: true },
        { name: '🎲 Dice', value: 'Predict 1-6', inline: true },
        { name: '📊 Higher/Lower', value: 'Guess the next number', inline: true },
        { name: '✊ RPS', value: 'Classic Rock Paper Scissors', inline: true },
      )
      .setFooter({ text: 'Select a game below' })
      .setTimestamp();

    const select = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('game_select')
        .setPlaceholder('Choose a game...')
        .addOptions([
          { label: 'Roulette', value: 'roulette', emoji: '🎰' },
          { label: 'Coinflip', value: 'coinflip', emoji: '🪙' },
          { label: 'Blackjack', value: 'blackjack', emoji: '🃏' },
          { label: 'Slots', value: 'slots', emoji: '🎰' },
          { label: 'Dice', value: 'dice', emoji: '🎲' },
          { label: 'Higher/Lower', value: 'higherlower', emoji: '📊' },
          { label: 'RPS', value: 'rps', emoji: '✊' },
        ])
    );

    await interaction.reply({ embeds: [embed], components: [select] });
  },
};
