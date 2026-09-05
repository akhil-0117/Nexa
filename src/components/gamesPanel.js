const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { formatCredits, getEffectiveMaxBet } = require('../utils/helpers');
const { getUser } = require('../systems/economy');
const { log } = require('../systems/logging');
const config = require('../config');

// ===== SINGLE-GAME LOCK =====
// Only ONE game per user at a time. Lock is cleared when the game resolves or after a safety timeout.
const activeLocks = new Map(); // userId -> { gameType, channelId, messageId, timestamp }
const LOCK_TTL = 60000; // safety: auto-expire lock after 60s (max animation time)

function acquireLock(userId, gameType) {
  const existing = activeLocks.get(userId);
  if (existing && Date.now() - existing.timestamp < LOCK_TTL) {
    return { ok: false, gameType: existing.gameType };
  }
  activeLocks.set(userId, { gameType, timestamp: Date.now() });
  return { ok: true };
}

function releaseLock(userId) {
  activeLocks.set(userId, { gameType: activeLocks.get(userId)?.gameType, timestamp: 0 });
  activeLocks.delete(userId);
}

// ===== GAME METADATA =====
const GAME_META = {
  roulette: { name: 'Roulette', emoji: '', animation: 'wheel', animDuration: 4200, animLines: [
    '**Spinning the wheel...**',
    'o  ●  ●  ●  ●  o',
  ]},
  coinflip: { name: 'Coinflip', emoji: '', animation: 'coin', animDuration: 3600, animLines: [
    '**Flipping the coin...**',
    'The coin rises into the air...',
  ]},
  blackjack: { name: 'Blackjack', emoji: '', animation: 'cards', animDuration: 3000, animLines: [
    '**Dealing the cards...**',
  ]},
  slots: { name: 'Slots', emoji: '', animation: 'slots', animDuration: 4400, animLines: [
    '**Spinning the reels...**',
  ]},
  dice: { name: 'Dice', emoji: '', animation: 'dice', animDuration: 2800, animLines: [
    '**Rolling the dice...**',
  ]},
  higherlower: { name: 'Higher / Lower', emoji: '', animation: 'shuffle', animDuration: 3000, animLines: [
    '**Shuffling the deck...**',
  ]},
  rps: { name: 'Rock Paper Scissors', emoji: '', animation: 'shake', animDuration: 2600, animLines: [
    '**Rock... Paper... Scissors...**',
  ]},
};

const BET_FIELD_PROMPTS = {
  roulette: { id: 'bet_type', label: 'Bet Type', placeholder: 'red, black, green, or number 0-36' },
  coinflip: { id: 'choice', label: 'Heads or Tails', placeholder: 'heads or tails' },
  dice: { id: 'prediction', label: 'Prediction (1-6)', placeholder: 'Enter a number 1-6' },
  higherlower: { id: 'choice', label: 'Higher / Lower / Equal', placeholder: 'higher, lower, or equal' },
  rps: { id: 'choice', label: 'Your Choice', placeholder: 'rock, paper, or scissors' },
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
    'bet_modal_play_blackjack': (i) => handleBetModal(i, 'blackjack'),
    'bet_modal_slots': (i) => handleBetModal(i, 'slots'),
    'bet_modal_dice': (i) => handleBetModal(i, 'dice'),
    'bet_modal_higherlower': (i) => handleBetModal(i, 'higherlower'),
    'bet_modal_rps': (i) => handleBetModal(i, 'rps'),
  },
};

function divider() {
  return '\u2501'.repeat(32);
}

function gameDescription(type) {
  const d = {
    roulette: 'Bet on red, black, green or a number (0-36).\nRed/Black 2x  \u00b7  Green 14x  \u00b7  Number 35x',
    coinflip: 'Call heads or tails. Win pays 2x your bet.',
    blackjack: 'Beat the dealer without going over 21.\nBlackjack pays 2.5x.',
    slots: 'Spin the reels and match symbols.\nTwo match 2x  \u00b7  Three match up to 100x',
    dice: 'Predict the dice roll (1-6). Correct guess pays 6x.',
    higherlower: 'Guess if the next number is higher or lower. Correct guess pays 3x.',
    rps: 'Classic Rock Paper Scissors. Win pays 2x, draw refunds your bet.',
  };
  return d[type] || 'A game of chance.';
}

function buildGamesHome(user, userData, maxBet) {
  const embed = new EmbedBuilder()
    .setAuthor({ name: `${user.username} \u2014 Games`, iconURL: user.displayAvatarURL({ dynamic: true }) })
    .setTitle('NEXAVERSE \u00b7 Games Arcade')
    .setColor(config.colors.game)
    .setDescription(
      `Select a game from the dropdown below.\n\n` +
      `**Balance** ${formatCredits(userData.credits)}  \u00b7  **Max Bet** ${formatCredits(maxBet)}\n` +
      `**Games** ${userData.games_won}W / ${userData.games_played}P\n\n` +
      `${divider()}\n` +
      `You can play **one game at a time**. Results are logged.`
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

  return { embeds: [embed], components: [select] };
}

async function handleGameSelect(interaction) {
  const gameType = interaction.values[0];

  // Lock check FIRST — can't open a bet modal while another game runs
  const lock = activeLocks.get(interaction.user.id);
  if (lock && Date.now() - lock.timestamp < LOCK_TTL) {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle('Game In Progress')
        .setDescription(`You already have a **${GAME_META[lock.gameType]?.name || lock.gameType}** game running.\nFinish it before starting another.`)
        .setColor(config.colors.warning)],
      flags: 64,
    });
  }

  const meta = GAME_META[gameType];
  const userData = getUser(interaction.user.id, interaction.guild.id);
  const maxBet = getEffectiveMaxBet(userData.reputation);

  const modal = new ModalBuilder()
    .setCustomId(`bet_modal_${gameType}`)
    .setTitle(`${meta.name} \u2014 Place Bet`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('bet').setLabel('Bet Amount').setPlaceholder(`Max ${maxBet} credits`).setStyle(TextInputStyle.Short).setRequired(true)
      )
    );

  const extra = BET_FIELD_PROMPTS[gameType];
  if (extra) {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId(extra.id).setLabel(extra.label).setPlaceholder(extra.placeholder).setStyle(TextInputStyle.Short).setRequired(true)
      )
    );
  }

  await interaction.showModal(modal);
}

async function handleBetModal(interaction, gameType) {
  const rawBet = interaction.fields.getTextInputValue('bet');
  const betAmount = parseInt(rawBet);

  if (isNaN(betAmount) || betAmount <= 0) {
    return interaction.reply({ embeds: [errEmbed('Invalid Bet', 'Enter a positive whole number.')], flags: 64 });
  }

  const meta = GAME_META[gameType];
  const userData = getUser(interaction.user.id, interaction.guild.id);
  const maxBet = getEffectiveMaxBet(userData.reputation);

  if (betAmount > maxBet) {
    return interaction.reply({ embeds: [errEmbed('Bet Too High', `Your maximum bet is **${formatCredits(maxBet)}**.`)], flags: 64 });
  }
  if (betAmount > userData.credits) {
    return interaction.reply({ embeds: [errEmbed('Insufficient Funds', `Balance: **${formatCredits(userData.credits)}** \u00b7 Needed: **${formatCredits(betAmount)}**`)], flags: 64 });
  }

  // Acquire single-game lock — blocks concurrent play
  const lock = acquireLock(interaction.user.id, gameType);
  if (!lock.ok) {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle('Game In Progress')
        .setDescription(`You already have a **${GAME_META[lock.gameType]?.name || lock.gameType}** game running.\nFinish it before starting another.`)
        .setColor(config.colors.warning)],
      flags: 64,
    });
  }

  // Parse game-specific input BEFORE animations
  let gameInput = null;
  if (gameType === 'roulette') {
    const raw = interaction.fields.getTextInputValue('bet_type').toLowerCase().trim();
    if (['red', 'black', 'green'].includes(raw) || (!isNaN(parseInt(raw)) && parseInt(raw) >= 0 && parseInt(raw) <= 36)) {
      gameInput = raw;
    } else {
      releaseLock(interaction.user.id);
      return interaction.reply({ embeds: [errEmbed('Invalid Bet Type', 'Use: red, black, green, or a number 0-36.')], flags: 64 });
    }
  } else if (gameType === 'coinflip') {
    const raw = interaction.fields.getTextInputValue('choice').toLowerCase().trim();
    if (['heads', 'tails'].includes(raw)) gameInput = raw;
    else {
      releaseLock(interaction.user.id);
      return interaction.reply({ embeds: [errEmbed('Invalid Choice', 'Enter: heads or tails.')], flags: 64 });
    }
  } else if (gameType === 'dice') {
    const p = parseInt(interaction.fields.getTextInputValue('prediction'));
    if (!isNaN(p) && p >= 1 && p <= 6) gameInput = p;
    else {
      releaseLock(interaction.user.id);
      return interaction.reply({ embeds: [errEmbed('Invalid Prediction', 'Enter a number between 1 and 6.')], flags: 64 });
    }
  } else if (gameType === 'higherlower') {
    const raw = interaction.fields.getTextInputValue('choice').toLowerCase().trim();
    if (['higher', 'lower', 'equal'].includes(raw)) gameInput = raw;
    else {
      releaseLock(interaction.user.id);
      return interaction.reply({ embeds: [errEmbed('Invalid Choice', 'Enter: higher, lower, or equal.')], flags: 64 });
    }
  } else if (gameType === 'rps') {
    const raw = interaction.fields.getTextInputValue('choice').toLowerCase().trim();
    if (['rock', 'paper', 'scissors'].includes(raw)) gameInput = raw;
    else {
      releaseLock(interaction.user.id);
      return interaction.reply({ embeds: [errEmbed('Invalid Choice', 'Enter: rock, paper, or scissors.')], flags: 64 });
    }
  }

  try {
    // Defer — shows "thinking" state, prevents timeout during animation
    await interaction.deferReply();

    // ===== SUSPENSE ANIMATION =====
    await playAnimation(interaction, gameType, meta, betAmount);

    // ===== EXECUTE GAME =====
    const games = require('../systems/games');
    const channelId = interaction.channel.id;
    let result;

    switch (gameType) {
      case 'roulette': {
        const raw = gameInput;
        const isNumber = !isNaN(parseInt(raw));
        result = games.playRoulette(interaction.user.id, interaction.guild.id, channelId, isNumber ? 'number' : raw, raw, betAmount);
        break;
      }
      case 'coinflip': result = games.playCoinflip(interaction.user.id, interaction.guild.id, channelId, gameInput, betAmount); break;
      case 'blackjack': result = games.playBlackjack(interaction.user.id, interaction.guild.id, channelId, betAmount); break;
      case 'slots': result = games.playSlots(interaction.user.id, interaction.guild.id, channelId, betAmount); break;
      case 'dice': result = games.playDice(interaction.user.id, interaction.guild.id, channelId, gameInput, betAmount); break;
      case 'higherlower': result = games.playHigherLower(interaction.user.id, interaction.guild.id, channelId, gameInput, betAmount); break;
      case 'rps': result = games.playRps(interaction.user.id, interaction.guild.id, channelId, gameInput, betAmount); break;
    }

    releaseLock(interaction.user.id);

    if (!result || !result.success) {
      const failEmbed = new EmbedBuilder()
        .setTitle('Game Unavailable')
        .setDescription(result?.reason || result?.error || 'Could not start the game. Try again.')
        .setColor(config.colors.error);
      return interaction.editReply({ embeds: [failEmbed] });
    }

    // ===== RESULT EMBED =====
    const isWin = result.payout > 0;
    const isDraw = gameType === 'rps' && result.result === 'draw';
    const outcomeColor = isDraw ? config.colors.warning : isWin ? config.colors.success : config.colors.error;
    const outcomeLabel = isDraw ? 'Draw' : isWin ? 'Victory' : 'Defeat';

    const detailLines = buildResultDetails(gameType, result);

    const resultEmbed = new EmbedBuilder()
      .setAuthor({ name: `${interaction.user.username} \u2014 ${meta.name}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
      .setTitle(`${outcomeLabel}`)
      .setColor(outcomeColor)
      .setDescription(
        `${divider()}\n` +
        `${detailLines}\n` +
        `${divider()}\n` +
        `**Bet** ${formatCredits(betAmount)}\n` +
        (isWin ? `**Payout** ${formatCredits(result.payout)}\n` : '') +
        `**Balance** ${formatCredits(result.balance ?? getUser(interaction.user.id, interaction.guild.id).credits)}\n` +
        `${divider()}`
      )
      .setFooter({ text: `Game ID ${result.gameId || 'N/A'}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [resultEmbed] });

    // ===== LOGGING (always) =====
    try {
      await log(interaction.guild, 'games', `${meta.name} \u2014 ${outcomeLabel}`, {
        actor: interaction.user.id,
        amount: betAmount,
        type: gameType,
        reason: `${result.description || result.result || 'Played'} \u00b7 ${isDraw ? 'Draw (refunded)' : isWin ? `Won ${formatCredits(result.payout)}` : 'Lost bet'}`,
        footer: `Game ID ${result.gameId || 'N/A'} \u00b7 Balance ${formatCredits(result.balance ?? 0)}`,
      });
    } catch (logErr) {
      console.error('[GAME LOG] Failed:', logErr.message);
    }

  } catch (error) {
    releaseLock(interaction.user.id);
    console.error(`[GAME] Error playing ${gameType}:`, error);
    await interaction.editReply({ embeds: [errEmbed('Game Error', 'Something went wrong. Please try again.')].map(e => e) }).catch(() => {
      interaction.reply({ embeds: [errEmbed('Game Error', 'Something went wrong. Please try again.')], flags: 64 }).catch(() => {});
    });
  }
}

// ===== ANIMATION ENGINE =====
async function playAnimation(interaction, gameType, meta, betAmount) {
  const stages = getAnimationStages(gameType);

  const loadingEmbed = () => new EmbedBuilder()
    .setAuthor({ name: `${interaction.user.username} \u2014 ${meta.name}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
    .setTitle('Game In Progress')
    .setDescription(`${divider()}\n${stages.current}\n${divider()}\n**Bet** ${formatCredits(betAmount)}`)
    .setColor(config.colors.game)
    .setFooter({ text: 'Good luck' })
    .setTimestamp();

  // First frame
  await interaction.editReply({ embeds: [loadingEmbed()] });

  // Animate through stages
  for (const stage of stages.frames) {
    await sleep(stage.delay);
    stages.current = stage.text;
    await interaction.editReply({ embeds: [loadingEmbed()] }).catch(() => {});
  }

  // Brief final pause for suspense
  await sleep(400);
}

function getAnimationStages(gameType) {
  const state = { current: '' };

  const frameSets = {
    roulette: [
      { text: '**The wheel is spinning...**\n\u25cb \u25cf \u25cb \u25cf \u25cb \u25cf \u25cb \u25cf \u25cb \u25cf', delay: 1000 },
      { text: '**The wheel slows down...**\n\u25cb \u25cb \u25cb \u25cf \u25cb \u25cb \u25cb \u25cf \u25cb \u25cb', delay: 1000 },
      { text: '**The ball is bouncing...**\n\u00b7 \u00b7 \u00b7 \u25cb \u00b7 \u00b7 \u00b7 \u25cb \u00b7 \u00b7', delay: 1000 },
      { text: '**Settling...**', delay: 1000 },
    ],
    coinflip: [
      { text: '**The coin flips into the air...**', delay: 900 },
      { text: '**Heads... or tails?**', delay: 900 },
      { text: '**It lands and spins...**', delay: 900 },
      { text: '**Settling...**', delay: 700 },
    ],
    blackjack: [
      { text: '**Dealing cards...**', delay: 800 },
      { text: '**Dealer reveals...**', delay: 900 },
      { text: '**Comparing hands...**', delay: 900 },
    ],
    slots: [
      { text: '**Reels are spinning...**\n\ud83c\udf52 \ud83c\udf4b \ud83c\udf4a', delay: 900 },
      { text: '**Reels are spinning...**\n\ud83d\udc8e \ud83c\udf52 \ud83c\udf4b', delay: 900 },
      { text: '**Reels are slowing...**\n\ud83d\udc8e \ud83d\udd1f \ud83c\udf52', delay: 900 },
      { text: '**Reels locking in...**\n\ud83d\udc8e \ud83d\udd1f \u2b50', delay: 900 },
    ],
    dice: [
      { text: '**Shaking the cup...**', delay: 700 },
      { text: '**The dice tumble...**', delay: 800 },
      { text: '**Revealing...**', delay: 900 },
    ],
    higherlower: [
      { text: '**Drawing the first number...**', delay: 800 },
      { text: '**Drawing the second number...**', delay: 900 },
      { text: '**Revealing...**', delay: 900 },
    ],
    rps: [
      { text: '**Rock...**', delay: 800 },
      { text: '**Paper...**', delay: 800 },
      { text: '**Scissors...**', delay: 800 },
    ],
  };

  state.frames = frameSets[gameType] || [
    { text: '**Playing...**', delay: 800 },
    { text: '**Almost there...**', delay: 800 },
  ];
  state.current = state.frames[0]?.text || 'Playing...';
  return state;
}

// ===== RESULT DETAIL LINES =====
function buildResultDetails(gameType, result) {
  switch (gameType) {
    case 'roulette':
      return `**Number** ${result.result}\n**Color** ${result.color}`;
    case 'coinflip':
      return `**Landed on** ${result.result.charAt(0).toUpperCase() + result.result.slice(1)}`;
    case 'blackjack': {
      const fmt = (hand) => hand.map(c => `${c.value}${c.suit}`).join(' ');
      return `**Your Hand** ${fmt(result.playerHand)} (${result.playerVal})\n**Dealer** ${fmt(result.dealerHand)} (${result.dealerVal})\n**Outcome** ${formatBlackjackResult(result.result)}`;
    }
    case 'slots':
      return `**Reels** ${result.reels.join('  ')}\n**Symbols matched** ${countMatches(result.reels)}`;
    case 'dice':
      return `**Your pick** ${result.prediction ?? '?'}\n**Rolled** ${result.roll}`;
    case 'higherlower':
      return `**Numbers** ${result.first} \u2192 ${result.second}\n**Your call** ${result.choice ?? 'N/A'}`;
    case 'rps':
      return `**You** ${result.userChoice}\n**Bot** ${result.botChoice}`;
    default:
      return `**Result** ${result.result || 'Completed'}`;
  }
}

function formatBlackjackResult(r) {
  const map = {
    blackjack: 'Blackjack',
    dealer_blackjack: 'Dealer blackjack',
    bust: 'Bust',
    dealer_bust: 'Dealer bust',
    win: 'You win',
    lose: 'Dealer wins',
    push: 'Push (refunded)',
  };
  return map[r] || r;
}

function countMatches(reels) {
  if (reels[0] === reels[1] && reels[1] === reels[2]) return 3;
  if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) return 2;
  return 0;
}

function errEmbed(title, description) {
  return new EmbedBuilder().setTitle(title).setDescription(description).setColor(config.colors.error);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
