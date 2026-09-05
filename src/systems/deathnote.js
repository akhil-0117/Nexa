const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const { formatCredits } = require('../utils/helpers');
const { updateBalance } = require('./economy');

// Active Death Note games
const activeGames = new Map();

function generateGameId() {
  return 'DN-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Create a new Death Note game
function createGame(creatorId, guildId, prize) {
  const gameId = generateGameId();
  const game = {
    id: gameId,
    creatorId,
    guildId,
    prize: prize || 500,
    status: 'waiting', // waiting, active, finished
    players: [],       // { userId, role: 'kira'|'l'|'citizen' }
    maxPlayers: 20,
    createdAt: Date.now(),
    killed: [],        // userIds killed by Kira
    discovered: [],    // citizens who discovered clues
    messages: [],      // game log
  };
  activeGames.set(gameId, game);
  return game;
}

// Join the game
function joinGame(gameId, userId) {
  const game = activeGames.get(gameId);
  if (!game) return { success: false, error: 'Game not found' };
  if (game.status !== 'waiting') return { success: false, error: 'Game already started' };
  if (game.players.length >= game.maxPlayers) return { success: false, error: 'Game is full' };
  if (game.players.find(p => p.userId === userId)) return { success: false, error: 'Already joined' };

  game.players.push({ userId, role: null });
  return { success: true, playerCount: game.players.length };
}

// Start the game - assign roles randomly
function startGame(gameId) {
  const game = activeGames.get(gameId);
  if (!game) return { success: false, error: 'Game not found' };
  if (game.status !== 'waiting') return { success: false, error: 'Game already started' };
  if (game.players.length < 3) return { success: false, error: 'Need at least 3 players' };

  game.status = 'active';
  game.startedAt = Date.now();

  // Shuffle players
  const shuffled = [...game.players].sort(() => Math.random() - 0.5);

  // Assign roles
  shuffled[0].role = 'kira';    // First player is Kira
  shuffled[1].role = 'l';       // Second player is L
  // Rest are citizens
  for (let i = 2; i < shuffled.length; i++) {
    shuffled[i].role = 'citizen';
  }

  game.players = shuffled;
  game.round = 1;
  game.maxRounds = Math.ceil(game.players.length / 2);
  game.currentTurn = 'kira'; // kira kills, then L investigates

  return { success: true, game };
}

// Kira kills a citizen
function kiraKill(gameId, kiraId, targetId) {
  const game = activeGames.get(gameId);
  if (!game || game.status !== 'active') return { success: false, error: 'Game not active' };

  const kira = game.players.find(p => p.userId === kiraId && p.role === 'kira');
  if (!kira) return { success: false, error: 'You are not Kira' };
  if (game.currentTurn !== 'kira') return { success: false, error: 'Not your turn' };

  const target = game.players.find(p => p.userId === targetId);
  if (!target) return { success: false, error: 'Invalid target' };
  if (target.role === 'kira') return { success: false, error: 'Cannot kill yourself' };
  if (game.killed.includes(targetId)) return { success: false, error: 'Already dead' };

  game.killed.push(targetId);
  game.messages.push({ type: 'kill', round: game.round, target: targetId });
  game.currentTurn = 'l';

  // Check win conditions
  const alive = game.players.filter(p => !game.killed.includes(p.userId));
  const aliveCitizens = alive.filter(p => p.role === 'citizen');
  const lAlive = alive.find(p => p.role === 'l');

  // Kira wins if all citizens are dead or only Kira and L remain
  if (aliveCitizens.length === 0) {
    return { success: true, winner: 'kira', message: `Kira has eliminated all citizens! Kira wins!` };
  }

  // L wins if Kira is found
  // (L accuses separately)

  return { success: true, killed: target, nextTurn: 'l' };
}

// L accuses a player
function lAccuse(gameId, lId, suspectId) {
  const game = activeGames.get(gameId);
  if (!game || game.status !== 'active') return { success: false, error: 'Game not active' };

  const lPlayer = game.players.find(p => p.userId === lId && p.role === 'l');
  if (!lPlayer) return { success: false, error: 'You are not L' };
  if (game.currentTurn !== 'l') return { success: false, error: 'Not your turn' };

  const suspect = game.players.find(p => p.userId === suspectId);
  if (!suspect) return { success: false, error: 'Invalid suspect' };
  if (game.killed.includes(suspectId)) return { success: false, error: 'That player is dead' };

  if (suspect.role === 'kira') {
    // L found Kira!
    game.status = 'finished';
    game.winner = 'l';
    game.messages.push({ type: 'correct_accusation', round: game.round, target: suspectId });
    return { success: true, winner: 'l', message: `L has correctly identified Kira! Justice prevails!` };
  } else {
    // Wrong accusation - citizen dies
    game.killed.push(suspectId);
    game.messages.push({ type: 'wrong_accusation', round: game.round, target: suspectId });
    game.round++;
    game.currentTurn = 'kira';

    // Check if game should end
    const alive = game.players.filter(p => !game.killed.includes(p.userId));
    if (alive.length <= 2) {
      game.status = 'finished';
      game.winner = 'kira';
      return { success: true, winner: 'kira', message: `Too few players remain. Kira wins!` };
    }

    return { success: true, wrong: true, killed: suspect, nextRound: game.round };
  }
}

// Get game state for display
function getGameEmbed(game, guild) {
  const alive = game.players.filter(p => !game.killed.includes(p.userId));
  const dead = game.players.filter(p => game.killed.includes(p.userId));

  let description = '';
  if (game.status === 'waiting') {
    description = `**Prize:** ${formatCredits(game.prize)} per winner\n**Players:** ${game.players.length}/${game.maxPlayers}\n**Status:** Waiting for players`;
  } else if (game.status === 'active') {
    description = `**Round:** ${game.round}/${game.maxRounds}\n**Turn:** ${game.currentTurn === 'kira' ? 'Kira (selecting target)' : 'L (accusing suspect)'}\n**Alive:** ${alive.length} | **Dead:** ${dead.length}`;
  } else {
    description = `**Winner:** ${game.winner === 'kira' ? 'Kira' : 'L'}\n**Prize:** ${formatCredits(game.prize)}`;
  }

  return new EmbedBuilder()
    .setTitle(`Death Note \u2014 ${game.id}`)
    .setColor(game.status === 'finished' ? (game.winner === 'kira' ? config.colors.error : config.colors.success) : config.colors.primary)
    .setDescription(description)
    .setFooter({ text: `Death Note Event` })
    .setTimestamp();
}

module.exports = {
  createGame,
  joinGame,
  startGame,
  kiraKill,
  lAccuse,
  getGameEmbed,
  activeGames,
};
