const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('games')
    .setDescription('Open the NEXAVERSE Games Panel'),

  async execute(interaction) {
    const select = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('game_select')
        .setPlaceholder('Choose a game...')
        .addOptions([
          { label: 'Roulette', value: 'roulette', description: 'Bet on red, black, green, or a number' },
          { label: 'Coinflip', value: 'coinflip', description: 'Heads or tails, 2x payout' },
          { label: 'Blackjack', value: 'blackjack', description: 'Beat the dealer to 21' },
          { label: 'Slots', value: 'slots', description: 'Spin to win big' },
          { label: 'Dice', value: 'dice', description: 'Predict a number 1-6' },
          { label: 'Higher/Lower', value: 'higherlower', description: 'Guess if the next number is higher or lower' },
          { label: 'RPS', value: 'rps', description: 'Rock Paper Scissors against the bot' },
        ])
    );

    const embed = new EmbedBuilder()
      .setTitle('NEXAVERSE Games')
      .setColor(config.colors.game)
      .setDescription('Select a game from the menu below to start playing.\n\nEach game has its own rules and payout structure.')
      .setFooter({ text: 'NEXAVERSE Games' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], components: [select] });
  },
};
