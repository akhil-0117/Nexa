const { getDb } = require('../database/init');
const config = require('../config');
const { generateGameId } = require('../utils/helpers');
const { getUser, getBalance, updateBalance, createTransaction } = require('./economy');
const { getReputationLevel } = require('../utils/helpers');
const { addXp } = require('./xp');

const activeGames = new Map();
const lastGameTimes = new Map(); // per-user cooldown tracking

function canPlay(userId, guildId) {
  const user = getUser(userId, guildId);
  if (!user) return { allowed: false, reason: 'Account not found' };
  const repLevel = getReputationLevel(user.reputation);
  if (repLevel.key === 'veryLow') return { allowed: false, reason: 'Reputation too low for games' };
  if (activeGames.has(`${userId}_${guildId}`)) return { allowed: false, reason: 'You already have an active game' };
  // Per-game cooldown (5s)
  const last = lastGameTimes.get(`${userId}_${guildId}`) || 0;
  if (Date.now() - last < config.games.cooldownMs) {
    const remaining = Math.ceil((config.games.cooldownMs - (Date.now() - last)) / 1000);
    return { allowed: false, reason: `Cooldown active \u2014 wait ${remaining}s` };
  }
  return { allowed: true };
}

function placeBet(userId, amount, guildId) {
  const balance = getBalance(userId, guildId);
  if (balance < amount) return { success: false, reason: 'Insufficient balance' };
  updateBalance(userId, -amount, guildId);
  return { success: true };
}

function createGameSession(userId, guildId, channelId, gameType, bet) {
  const id = generateGameId();
  const db = getDb();
  db.prepare(`INSERT INTO game_sessions (id, guild_id, channel_id, user_id, game_type, bet, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, guildId, channelId, userId, gameType, bet, 'active', Date.now());
  activeGames.set(`${userId}_${guildId}`, { id, gameType, bet, startTime: Date.now() });
  return id;
}

function finishGame(gameId, userId, guildId, result, winner, payout) {
  const db = getDb();
  const game = db.prepare('SELECT * FROM game_sessions WHERE id = ?').get(gameId);
  if (!game) return null;

  let txId = null;
  if (payout > 0) {
    updateBalance(userId, payout, guildId);
    txId = createTransaction(userId, payout, 'game_payout', { gameId, description: `${game.game_type} win` });
    addXp(userId, config.xp.gameWinXp, 'game_win', guildId);
  } else {
    addXp(userId, config.xp.gameParticipationXp, 'game_play', guildId);
  }

  db.prepare('UPDATE game_sessions SET result = ?, winner = ?, payout = ?, transaction_id = ?, status = ?, created_at = created_at WHERE id = ?')
    .run(result, winner || '', payout, txId || '', 'completed', gameId);

  db.prepare('UPDATE users SET games_played = games_played + 1, updated_at = ? WHERE user_id = ? AND guild_id = ?').run(Date.now(), userId, guildId);
  if (winner === userId) {
    db.prepare('UPDATE users SET games_won = games_won + 1, updated_at = ? WHERE user_id = ? AND guild_id = ?').run(Date.now(), userId, guildId);
  }

  activeGames.delete(`${userId}_${guildId}`);
  lastGameTimes.set(`${userId}_${guildId}`, Date.now());
  return { gameId, txId, payout };
}

function playRoulette(userId, guildId, channelId, betType, betValue, amount) {
  const can = canPlay(userId, guildId);
  if (!can.allowed) return { success: false, reason: can.reason };

  const bet = placeBet(userId, amount, guildId);
  if (!bet.success) return { success: false, reason: bet.reason };

  const gameId = createGameSession(userId, guildId, channelId, 'roulette', amount);
  const result = Math.floor(Math.random() * 37);
  const isRed = config.games.roulette.redNumbers.includes(result);
  const isGreen = result === 0;

  let won = false;
  let multiplier = 0;

  if (betType === 'number' && parseInt(betValue) === result) {
    won = true;
    multiplier = config.games.roulette.numberMultiplier;
  } else if (betType === 'red' && isRed) {
    won = true;
    multiplier = config.games.roulette.colorMultiplier;
  } else if (betType === 'black' && !isRed && !isGreen) {
    won = true;
    multiplier = config.games.roulette.colorMultiplier;
  } else if (betType === 'green' && isGreen) {
    won = true;
    multiplier = 14;
  }

  const payout = won ? Math.floor(amount * multiplier) : 0;
  const finish = finishGame(gameId, userId, guildId, `${result} (${isGreen ? 'Green' : isRed ? 'Red' : 'Black'})`, won ? userId : '', payout);

  return {
    success: true, gameId, result, color: isGreen ? 'Green' : isRed ? 'Red' : 'Black',
    won, payout, balance: getBalance(userId, guildId), transactionId: finish?.txId,
  };
}

function playCoinflip(userId, guildId, channelId, choice, amount) {
  const can = canPlay(userId, guildId);
  if (!can.allowed) return { success: false, reason: can.reason };

  const bet = placeBet(userId, amount, guildId);
  if (!bet.success) return { success: false, reason: bet.reason };

  const gameId = createGameSession(userId, guildId, channelId, 'coinflip', amount);
  const result = Math.random() < 0.5 ? 'heads' : 'tails';
  const won = choice === result;
  const payout = won ? amount * 2 : 0;
  const finish = finishGame(gameId, userId, guildId, result, won ? userId : '', payout);

  return { success: true, gameId, result, won, payout, balance: getBalance(userId, guildId), transactionId: finish?.txId };
}

function playSlots(userId, guildId, channelId, amount) {
  const can = canPlay(userId, guildId);
  if (!can.allowed) return { success: false, reason: can.reason };

  const bet = placeBet(userId, amount, guildId);
  if (!bet.success) return { success: false, reason: bet.reason };

  const gameId = createGameSession(userId, guildId, channelId, 'slots', amount);
  const symbols = config.games.slots.symbols;
  const reels = [
    symbols[Math.floor(Math.random() * symbols.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];

  let payout = 0;
  if (reels[0] === reels[1] && reels[1] === reels[2]) {
    payout = amount * (config.games.slots.threeMatchMultipliers[reels[0]] || 5);
  } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
    payout = amount * config.games.slots.twoMatchMultiplier;
  }

  const won = payout > 0;
  const finish = finishGame(gameId, userId, guildId, reels.join(' | '), won ? userId : '', payout);

  return { success: true, gameId, reels, won, payout, balance: getBalance(userId, guildId), transactionId: finish?.txId };
}

function playDice(userId, guildId, channelId, prediction, amount) {
  const can = canPlay(userId, guildId);
  if (!can.allowed) return { success: false, reason: can.reason };

  const bet = placeBet(userId, amount, guildId);
  if (!bet.success) return { success: false, reason: bet.reason };

  const gameId = createGameSession(userId, guildId, channelId, 'dice', amount);
  const roll = Math.floor(Math.random() * 6) + 1;
  const won = prediction === roll;
  const payout = won ? amount * 5 : 0;
  const finish = finishGame(gameId, userId, guildId, roll.toString(), won ? userId : '', payout);

  return { success: true, gameId, prediction, roll, won, payout, balance: getBalance(userId, guildId), transactionId: finish?.txId };
}

function playHigherLower(userId, guildId, channelId, choice, amount) {
  const can = canPlay(userId, guildId);
  if (!can.allowed) return { success: false, reason: can.reason };

  const bet = placeBet(userId, amount, guildId);
  if (!bet.success) return { success: false, reason: bet.reason };

  const gameId = createGameSession(userId, guildId, channelId, 'higher_lower', amount);
  const first = Math.floor(Math.random() * 100) + 1;
  const second = Math.floor(Math.random() * 100) + 1;

  let won = false;
  if (choice === 'higher' && second > first) won = true;
  else if (choice === 'lower' && second < first) won = true;
  else if (choice === 'equal' && second === first) won = true;

  const payout = won ? amount * 3 : 0;
  const finish = finishGame(gameId, userId, guildId, `${first} → ${second}`, won ? userId : '', payout);

  return { success: true, gameId, first, second, choice, won, payout, balance: getBalance(userId, guildId), transactionId: finish?.txId };
}

function playRps(userId, guildId, channelId, choice, amount) {
  const can = canPlay(userId, guildId);
  if (!can.allowed) return { success: false, reason: can.reason };

  const bet = placeBet(userId, amount, guildId);
  if (!bet.success) return { success: false, reason: bet.reason };

  const gameId = createGameSession(userId, guildId, channelId, 'rps', amount);
  const options = ['rock', 'paper', 'scissors'];
  const botChoice = options[Math.floor(Math.random() * 3)];

  let result = 'draw';
  if (choice === botChoice) { result = 'draw'; }
  else if ((choice === 'rock' && botChoice === 'scissors') || (choice === 'paper' && botChoice === 'rock') || (choice === 'scissors' && botChoice === 'paper')) { result = 'win'; }
  else { result = 'lose'; }

  const won = result === 'win';
  const payout = won ? amount * 2 : result === 'draw' ? amount : 0;
  const finish = finishGame(gameId, userId, guildId, `${choice} vs ${botChoice}`, won ? userId : '', payout);

  return { success: true, gameId, userChoice: choice, botChoice, result, won, payout, balance: getBalance(userId, guildId), transactionId: finish?.txId };
}

function playBlackjack(userId, guildId, channelId, amount) {
  const can = canPlay(userId, guildId);
  if (!can.allowed) return { success: false, reason: can.reason };

  const bet = placeBet(userId, amount, guildId);
  if (!bet.success) return { success: false, reason: bet.reason };

  const gameId = createGameSession(userId, guildId, channelId, 'blackjack', amount);

  const deck = [];
  const suits = ['♠', '♥', '♦', '♣'];
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  for (const suit of suits) for (const value of values) deck.push({ suit, value });
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }

  function cardValue(card) {
    if (['J', 'Q', 'K'].includes(card.value)) return 10;
    if (card.value === 'A') return 11;
    return parseInt(card.value);
  }

  function handValue(hand) {
    let val = hand.reduce((sum, c) => sum + cardValue(c), 0);
    let aces = hand.filter(c => c.value === 'A').length;
    while (val > 21 && aces > 0) { val -= 10; aces--; }
    return val;
  }

  const playerHand = [deck.pop(), deck.pop()];
  const dealerHand = [deck.pop(), deck.pop()];

  const playerVal = handValue(playerHand);
  const dealerVal = handValue(dealerHand);

  let result, payout;
  if (playerVal === 21 && dealerVal !== 21) {
    result = 'blackjack';
    payout = Math.floor(amount * config.games.blackjack.blackjackMultiplier);
  } else if (dealerVal === 21 && playerVal !== 21) {
    result = 'dealer_blackjack';
    payout = 0;
  } else if (playerVal > 21) {
    result = 'bust';
    payout = 0;
  } else if (dealerVal > 21) {
    result = 'dealer_bust';
    payout = amount * config.games.blackjack.winMultiplier;
  } else if (playerVal > dealerVal) {
    result = 'win';
    payout = amount * config.games.blackjack.winMultiplier;
  } else if (dealerVal > playerVal) {
    result = 'lose';
    payout = 0;
  } else {
    result = 'push';
    payout = amount;
  }

  const won = result === 'win' || result === 'blackjack' || result === 'dealer_bust';
  const finish = finishGame(gameId, userId, guildId, result, won ? userId : '', payout);

  return {
    success: true, gameId, playerHand, dealerHand, playerVal, dealerVal,
    result, won, payout, balance: getBalance(userId, guildId), transactionId: finish?.txId,
  };
}

function getActiveGame(userId, guildId) {
  return activeGames.get(`${userId}_${guildId}`) || null;
}

function cleanupGame(userId, guildId) {
  activeGames.delete(`${userId}_${guildId}`);
}

module.exports = {
  canPlay, placeBet, createGameSession, finishGame,
  playRoulette, playCoinflip, playSlots, playDice, playHigherLower, playRps, playBlackjack,
  getActiveGame, cleanupGame, activeGames,
};
