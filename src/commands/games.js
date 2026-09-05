const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../config');
const { getUser } = require('../systems/economy');
const { formatCredits, getEffectiveMaxBet } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('games')
    .setDescription('Open the NEXAVERSE Games Arcade'),

  async execute(interaction) {
    await interaction.deferReply();

    const userData = getUser(interaction.user.id, interaction.guild.id);
    const maxBet = getEffectiveMaxBet(userData.reputation);
    const divider = '\u2501'.repeat(32);

    const embed = new EmbedBuilder()
      .setAuthor({ name: `${interaction.user.username} \u2014 Games`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
      .setTitle('NEXAVERSE \u00b7 Games Arcade')
      .setColor(config.colors.game)
      .setDescription(
        `Select a game from the dropdown below.\n\n` +
        `**Available Games**\n` +
        `Roulette \u2014 Red, black, green, or a number 0-36\n` +
        `Coinflip \u2014 Heads or tails \u00b7 2x\n` +
        `Blackjack \u2014 Beat the dealer \u00b7 up to 2.5x\n` +
        `Slots \u2014 Match the reels \u00b7 up to 100x\n` +
        `Dice \u2014 Predict the roll \u00b7 6x\n` +
        `Higher / Lower \u2014 Call the next number \u00b7 3x\n` +
        `Rock Paper Scissors \u2014 Beat the bot \u00b7 2x\n\n` +
        `${divider}\n` +
        `**Balance** ${formatCredits(userData.credits)}  \u00b7  **Max Bet** ${formatCredits(maxBet)}\n` +
        `**Record** ${userData.games_won}W / ${userData.games_played}P\n` +
        `${divider}\n` +
        `One game at a time. All results are logged.`
      )
      .setFooter({ text: 'NEXAVERSE Games Arcade' })
      .setTimestamp();

    const select = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('game_select')
        .setPlaceholder('Select a game...')
        .addOptions([
          { label: 'Roulette', value: 'roulette', description: 'Red, black, green, or a number 0-36' },
          { label: 'Coinflip', value: 'coinflip', description: 'Heads or tails \u00b7 2x payout' },
          { label: 'Blackjack', value: 'blackjack', description: 'Beat the dealer to 21 \u00b7 2.5x' },
          { label: 'Slots', value: 'slots', description: 'Match symbols \u00b7 up to 100x' },
          { label: 'Dice', value: 'dice', description: 'Predict the roll \u00b7 6x payout' },
          { label: 'Higher / Lower', value: 'higherlower', description: 'Guess the next number \u00b7 3x' },
          { label: 'Rock Paper Scissors', value: 'rps', description: 'Beat the bot \u00b7 2x payout' },
        ])
    );

    await interaction.editReply({ embeds: [embed], components: [select] });
  },
};
