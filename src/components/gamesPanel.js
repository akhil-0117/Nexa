const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { formatCredits, getEffectiveMaxBet } = require('../utils/helpers');
const { getUser } = require('../systems/economy');
const { getRepInfo } = require('../systems/reputation');
const config = require('../config');

module.exports = {
  selectMenus: {
    game_select: handleGameSelect,
  },
  buttons: {},
  modals: {
    'bet_modal_roulette': (interaction) => handleBetModal(interaction, 'roulette'),
    'bet_modal_coinflip': (interaction) => handleBetModal(interaction, 'coinflip'),
    'bet_modal_blackjack': (interaction) => handleBetModal(interaction, 'blackjack'),
    'bet_modal_slots': (interaction) => handleBetModal(interaction, 'slots'),
    'bet_modal_dice': (interaction) => handleBetModal(interaction, 'dice'),
    'bet_modal_higherlower': (interaction) => handleBetModal(interaction, 'higherlower'),
    'bet_modal_rps': (interaction) => handleBetModal(interaction, 'rps'),
  },
};

function divider() {
  return '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
}

function getGameInfo(gameType) {
  const games = {
    roulette: {
      name: '🎰 Roulette',
      description: 'Bet on red, black, green, or a specific number (0-36).\n**Payouts:** Red/Black: 2x | Green: 14x | Number: 35x',
      color: '#e74c3c',
    },
    coinflip: {
      name: '🪙 Coinflip',
      description: 'Pick heads or tails. **2x payout** on win.',
      color: '#f1c40f',
    },
    blackjack: {
      name: '🃏 Blackjack',
      description: 'Get as close to 21 as possible without going over.\nBeat the dealer to win!',
      color: '#2ecc71',
    },
    slots: {
      name: '🎰 Slots',
      description: 'Spin the reels! Match symbols to win big.\n**3 of a kind = 10x** | **2 of a kind = 2x**',
      color: '#9b59b6',
    },
    dice: {
      name: '🎲 Dice',
      description: 'Predict what number the dice will land on (1-6).\n**6x payout** on correct guess.',
      color: '#3498db',
    },
    higherlower: {
      name: '📊 Higher/Lower',
      description: 'A number is revealed. Guess if the next is higher or lower.\n**2x payout** on correct guess.',
      color: '#e67e22',
    },
    rps: {
      name: '✊ Rock Paper Scissors',
      description: 'Classic Rock Paper Scissors against the bot.\n**2x payout** on win.',
      color: '#1abc9c',
    },
  };
  return games[gameType] || { name: gameType, description: 'A fun game!', color: '#95a5a6' };
}

async function handleGameSelect(interaction) {
  const gameType = interaction.values[0];
  const game = getGameInfo(gameType);
  const userData = getUser(interaction.user.id, interaction.guild.id);
  const maxBet = getEffectiveMaxBet(userData.reputation);

  const embed = new EmbedBuilder()
    .setTitle(game.name)
    .setDescription(`${divider()}\n${game.description}\n\n**Your Balance:** ${formatCredits(userData.credits)}\n**Max Bet:** ${formatCredits(maxBet)}\n${divider()}`)
    .setColor(game.color)
    .setFooter({ text: 'Enter your bet to start playing' })
    .setTimestamp();

  // Special handling for RPS - show choices
  if (gameType === 'rps') {
    const modal = new ModalBuilder()
      .setCustomId(`bet_modal_rps`)
      .setTitle('✊ Rock Paper Scissors')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('bet').setLabel('Bet Amount').setPlaceholder('Enter your bet').setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('choice').setLabel('Your Choice (rock/paper/scissors)').setPlaceholder('rock, paper, or scissors').setStyle(TextInputStyle.Short).setRequired(true)
        ),
      );
    return interaction.showModal(modal);
  }

  const modal = new ModalBuilder()
    .setCustomId(`bet_modal_${gameType}`)
    .setTitle(`${game.name} — Place Bet`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('bet').setLabel('Bet Amount').setPlaceholder(`Max: ${maxBet} Credits`).setStyle(TextInputStyle.Short).setRequired(true)
      ),
    );

  await interaction.showModal(modal);
}

async function handleBetModal(interaction, gameType) {
  const betAmount = parseInt(interaction.fields.getTextInputValue('bet'));

  if (isNaN(betAmount) || betAmount <= 0) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setTitle('❌ Invalid Bet').setDescription('Enter a positive number.').setColor(config.colors.error)],
      ephemeral: true,
    });
  }

  const userData = getUser(interaction.user.id, interaction.guild.id);
  const maxBet = getEffectiveMaxBet(userData.reputation);

  if (betAmount > maxBet) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setTitle('❌ Bet Too High').setDescription(`Maximum bet is **${formatCredits(maxBet)}** based on your reputation.`).setColor(config.colors.error)],
      ephemeral: true,
    });
  }

  if (betAmount > userData.credits) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setTitle('❌ Insufficient Funds').setDescription(`You have **${formatCredits(userData.credits)}** but need **${formatCredits(betAmount)}**.`).setColor(config.colors.error)],
      ephemeral: true,
    });
  }

  // Execute game
  try {
    const games = require('../systems/games');
    const result = games[`play_${gameType}`](interaction.user.id, interaction.guild.id, betAmount, interaction);

    if (!result || !result.success) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setTitle('❌ Game Error').setDescription(result?.error || 'Something went wrong.').setColor(config.colors.error)],
        ephemeral: true,
      });
    }
  } catch (error) {
    console.error(`[GAME] Error playing ${gameType}:`, error.message);
    return interaction.reply({
      embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription('Something went wrong. Please try again.').setColor(config.colors.error)],
      ephemeral: true,
    });
  }
}
