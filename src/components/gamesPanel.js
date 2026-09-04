const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { formatCredits, getEffectiveMaxBet } = require('../utils/helpers');
const { getUser } = require('../systems/economy');
const { getRepInfo } = require('../systems/reputation');
const config = require('../config');

// Map gameType to actual function name in games.js
const GAME_FUNCTION_MAP = {
  roulette: 'playRoulette',
  coinflip: 'playCoinflip',
  blackjack: 'playBlackjack',
  slots: 'playSlots',
  dice: 'playDice',
  higherlower: 'playHigherLower',
  rps: 'playRps',
};

// Map gameType to bet field requirements
const GAME_BET_FIELDS = {
  roulette: [
    { id: 'bet_type', label: 'Bet Type', placeholder: 'red, black, green, or number 0-36', required: true },
  ],
  coinflip: [
    { id: 'choice', label: 'Heads or Tails?', placeholder: 'heads or tails', required: true },
  ],
  blackjack: [],
  slots: [],
  dice: [
    { id: 'prediction', label: 'Your prediction (1-6)', placeholder: 'Enter a number 1-6', required: true },
  ],
  higherlower: [
    { id: 'choice', label: 'Higher, Lower, or Equal?', placeholder: 'higher, lower, or equal', required: true },
  ],
  rps: [
    { id: 'choice', label: 'Your choice (rock/paper/scissors)', placeholder: 'rock, paper, or scissors', required: true },
  ],
};

module.exports = {
  selectMenus: {
    game_select: handleGameSelect,
  },
  buttons: {},
  modals: {
    'bet_modal_roulette': (i) => handleBetModal(i, 'roulette'),
    'bet_modal_coinflip': (i) => handleBetModal(i, 'coinflip'),
    'bet_modal_blackjack': (i) => handleBetModal(i, 'blackjack'),
    'bet_modal_slots': (i) => handleBetModal(i, 'slots'),
    'bet_modal_dice': (i) => handleBetModal(i, 'dice'),
    'bet_modal_higherlower': (i) => handleBetModal(i, 'higherlower'),
    'bet_modal_rps': (i) => handleBetModal(i, 'rps'),
  },
};

function divider() {
  return '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
}

function getGameInfo(gameType) {
  const games = {
    roulette: { name: 'Roulette', description: 'Bet on red, black, green, or a specific number (0-36).\nRed/Black: 2x | Green: 14x | Number: 35x', color: '#e74c3c' },
    coinflip: { name: 'Coinflip', description: 'Pick heads or tails. 2x payout on win.', color: '#f1c40f' },
    blackjack: { name: 'Blackjack', description: 'Get as close to 21 as possible without going over.\nBeat the dealer to win.', color: '#2ecc71' },
    slots: { name: 'Slots', description: 'Spin the reels! Match symbols to win.\n3 of a kind: 5-100x | 2 of a kind: 2x', color: '#9b59b6' },
    dice: { name: 'Dice', description: 'Predict what number the dice will land on (1-6).\n6x payout on correct guess.', color: '#3498db' },
    higherlower: { name: 'Higher/Lower', description: 'A number is revealed. Guess if the next is higher or lower.\n3x payout on correct guess.', color: '#e67e22' },
    rps: { name: 'Rock Paper Scissors', description: 'Classic RPS against the bot. 2x payout on win.', color: '#1abc9c' },
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
    .setDescription(
      `${divider()}\n${game.description}\n\n**Balance:** ${formatCredits(userData.credits)}\n**Max Bet:** ${formatCredits(maxBet)}\n${divider()}`
    )
    .setColor(game.color)
    .setFooter({ text: 'Enter your bet to start playing' })
    .setTimestamp();

  const extraFields = GAME_BET_FIELDS[gameType] || [];
  const modal = new ModalBuilder()
    .setCustomId(`bet_modal_${gameType}`)
    .setTitle(`${game.name} — Place Bet`);

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('bet').setLabel('Bet Amount').setPlaceholder(`Max: ${maxBet} Credits`).setStyle(TextInputStyle.Short).setRequired(true)
    ),
  );

  for (const field of extraFields) {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId(field.id).setLabel(field.label).setPlaceholder(field.placeholder).setStyle(TextInputStyle.Short).setRequired(field.required)
      ),
    );
  }

  await interaction.showModal(modal);
}

async function handleBetModal(interaction, gameType) {
  const betAmount = parseInt(interaction.fields.getTextInputValue('bet'));

  if (isNaN(betAmount) || betAmount <= 0) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setTitle('Invalid Bet').setDescription('Enter a positive number.').setColor('#e74c3c')],
      flags: 64,
    });
  }

  const userData = getUser(interaction.user.id, interaction.guild.id);
  const maxBet = getEffectiveMaxBet(userData.reputation);

  if (betAmount > maxBet) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setTitle('Bet Too High').setDescription(`Maximum bet is **${formatCredits(maxBet)}** based on your reputation.`).setColor('#e74c3c')],
      flags: 64,
    });
  }

  if (betAmount > userData.credits) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setTitle('Insufficient Funds').setDescription(`You have **${formatCredits(userData.credits)}** but need **${formatCredits(betAmount)}**.`).setColor('#e74c3c')],
      flags: 64,
    });
  }

  try {
    const games = require('../systems/games');
    const funcName = GAME_FUNCTION_MAP[gameType];
    if (!funcName || !games[funcName]) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setTitle('Game Unavailable').setDescription('This game is not available yet.').setColor('#e74c3c')],
        flags: 64,
      });
    }

    let result;
    const channelId = interaction.channel.id;

    switch (gameType) {
      case 'roulette': {
        const betType = interaction.fields.getTextInputValue('bet_type').toLowerCase().trim();
        let betValue = '';
        if (['red', 'black', 'green'].includes(betType)) {
          betValue = betType;
        } else if (!isNaN(parseInt(betType)) && parseInt(betType) >= 0 && parseInt(betType) <= 36) {
          betValue = betType;
        } else {
          return interaction.reply({
            embeds: [new EmbedBuilder().setTitle('Invalid Bet Type').setDescription('Use: red, black, green, or a number 0-36.').setColor('#e74c3c')],
            flags: 64,
          });
        }
        result = games.playRoulette(interaction.user.id, interaction.guild.id, channelId, betType, betValue, betAmount);
        break;
      }
      case 'coinflip': {
        const choice = interaction.fields.getTextInputValue('choice').toLowerCase().trim();
        if (!['heads', 'tails'].includes(choice)) {
          return interaction.reply({
            embeds: [new EmbedBuilder().setTitle('Invalid Choice').setDescription('Enter: heads or tails.').setColor('#e74c3c')],
            flags: 64,
          });
        }
        result = games.playCoinflip(interaction.user.id, interaction.guild.id, channelId, choice, betAmount);
        break;
      }
      case 'blackjack': {
        result = games.playBlackjack(interaction.user.id, interaction.guild.id, channelId, betAmount);
        break;
      }
      case 'slots': {
        result = games.playSlots(interaction.user.id, interaction.guild.id, channelId, betAmount);
        break;
      }
      case 'dice': {
        const prediction = parseInt(interaction.fields.getTextInputValue('prediction'));
        if (isNaN(prediction) || prediction < 1 || prediction > 6) {
          return interaction.reply({
            embeds: [new EmbedBuilder().setTitle('Invalid Prediction').setDescription('Enter a number between 1 and 6.').setColor('#e74c3c')],
            flags: 64,
          });
        }
        result = games.playDice(interaction.user.id, interaction.guild.id, channelId, prediction, betAmount);
        break;
      }
      case 'higherlower': {
        const choice = interaction.fields.getTextInputValue('choice').toLowerCase().trim();
        if (!['higher', 'lower', 'equal'].includes(choice)) {
          return interaction.reply({
            embeds: [new EmbedBuilder().setTitle('Invalid Choice').setDescription('Enter: higher, lower, or equal.').setColor('#e74c3c')],
            flags: 64,
          });
        }
        result = games.playHigherLower(interaction.user.id, interaction.guild.id, channelId, choice, betAmount);
        break;
      }
      case 'rps': {
        const choice = interaction.fields.getTextInputValue('choice').toLowerCase().trim();
        if (!['rock', 'paper', 'scissors'].includes(choice)) {
          return interaction.reply({
            embeds: [new EmbedBuilder().setTitle('Invalid Choice').setDescription('Enter: rock, paper, or scissors.').setColor('#e74c3c')],
            flags: 64,
          });
        }
        result = games.playRps(interaction.user.id, interaction.guild.id, channelId, choice, betAmount);
        break;
      }
      default:
        return interaction.reply({
          embeds: [new EmbedBuilder().setTitle('Game Unavailable').setDescription('This game is not available yet.').setColor('#e74c3c')],
          flags: 64,
        });
    }

    if (!result || !result.success) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setTitle('Game Error').setDescription(result?.reason || 'Something went wrong.').setColor('#e74c3c')],
        flags: 64,
      });
    }

    // Build result embed
    const gameInfo = getGameInfo(gameType);
    const resultEmbed = buildGameResult(gameType, result, betAmount, gameInfo);

    // Log game result
    try {
      const { log } = require('../systems/logging');
      const gameName = gameInfo.name;
      const logMsg = `${gameName} | Bet: ${betAmount} | ${result.won ? 'WIN +' + result.payout : 'LOSS -' + betAmount} | Bal: ${result.balance}`;
      await log(interaction.guild, 'games', logMsg, {
        actor: interaction.user.id,
        amount: betAmount,
        type: `${gameType} (${result.won ? 'win' : 'loss'})`,
      });
    } catch (e) { /* logging failed, don't break game */ }

    await interaction.reply({ embeds: [resultEmbed] });

  } catch (error) {
    console.error(`[GAME] Error playing ${gameType}:`, error.message);
    return interaction.reply({
      embeds: [new EmbedBuilder().setTitle('Error').setDescription('Something went wrong. Please try again.').setColor('#e74c3c')],
      flags: 64,
    });
  }
}

function buildGameResult(gameType, result, betAmount, gameInfo) {
  const winColor = result.won ? '#2ecc71' : '#e74c3c';
  const resultText = result.won ? '**WIN**' : '**LOSS**';
  const payoutText = result.won ? `+${formatCredits(result.payout)}` : `-${formatCredits(betAmount)}`;

  const embed = new EmbedBuilder()
    .setTitle(`${gameInfo.name} — ${resultText}`)
    .setColor(winColor)
    .addFields(
      { name: 'Bet', value: formatCredits(betAmount), inline: true },
      { name: 'Result', value: payoutText, inline: true },
      { name: 'Balance', value: formatCredits(result.balance), inline: true },
    )
    .setTimestamp();

  switch (gameType) {
    case 'roulette':
      embed.setDescription(`Landed on **${result.color}** (${result.result})`);
      break;
    case 'coinflip':
      embed.setDescription(`Coin landed on **${result.result}**`);
      break;
    case 'blackjack': {
      const playerCards = result.playerHand.map(c => `${c.value}${c.suit}`).join(' ');
      const dealerCards = result.dealerHand.map(c => `${c.value}${c.suit}`).join(' ');
      embed.setDescription(`**You:** ${playerCards} (${result.playerVal})\n**Dealer:** ${dealerCards} (${result.dealerVal})\n\n${result.result.replace(/_/g, ' ').toUpperCase()}`);
      break;
    }
    case 'slots':
      embed.setDescription(`Reels: **${result.reels.join(' | ')}**`);
      break;
    case 'dice':
      embed.setDescription(`Rolled a **${result.roll}**`);
      break;
    case 'higherlower':
      embed.setDescription(`**${result.first}** → **${result.second}**`);
      break;
    case 'rps':
      embed.setDescription(`You: **${result.userChoice || 'rock'}** vs Bot: **${result.botChoice}**\n${result.result.toUpperCase()}`);
      break;
    default:
      embed.setDescription('Game completed.');
      break;
  }

  if (result.transactionId) {
    embed.setFooter({ text: `TxID: ${result.transactionId}` });
  }

  return embed;
}
