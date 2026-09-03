const { EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle } = require('discord.js');
const games = require('../systems/games');
const config = require('../config');
const { formatCredits } = require('../utils/helpers');
const { log } = require('../systems/logging');

module.exports = {
  selectMenus: {
    game_select: handleGameSelect,
  },
  modals: {
    bet_modal_roulette: handleRouletteBet,
    bet_modal_coinflip: handleCoinflipBet,
    bet_modal_blackjack: handleBlackjackBet,
    bet_modal_slots: handleSlotsBet,
    bet_modal_dice: handleDiceBet,
    bet_modal_higherlower: handleHigherLowerBet,
    bet_modal_rps: handleRpsBet,
  },
};

function backRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('nav_games_back').setLabel('← Back to Games').setStyle(ButtonStyle.Secondary)
  );
}

async function handleGameSelect(interaction) {
  const game = interaction.values[0];
  const modalMap = {
    roulette: { id: 'bet_modal_roulette', title: '🎰 Roulette', fields: [
      { id: 'bet_amount', label: 'Bet Amount', placeholder: 'Enter credits' },
      { id: 'bet_choice', label: 'Bet Type', placeholder: 'red / black / green / number (e.g. 17)' },
    ]},
    coinflip: { id: 'bet_modal_coinflip', title: '🪙 Coinflip', fields: [
      { id: 'bet_amount', label: 'Bet Amount', placeholder: 'Enter credits' },
      { id: 'bet_choice', label: 'Choice', placeholder: 'heads or tails' },
    ]},
    blackjack: { id: 'bet_modal_blackjack', title: '🃏 Blackjack', fields: [
      { id: 'bet_amount', label: 'Bet Amount', placeholder: 'Enter credits' },
    ]},
    slots: { id: 'bet_modal_slots', title: '🎰 Slots', fields: [
      { id: 'bet_amount', label: 'Bet Amount', placeholder: 'Enter credits' },
    ]},
    dice: { id: 'bet_modal_dice', title: '🎲 Dice', fields: [
      { id: 'bet_amount', label: 'Bet Amount', placeholder: 'Enter credits' },
      { id: 'bet_choice', label: 'Predict (1-6)', placeholder: 'Enter number' },
    ]},
    higherlower: { id: 'bet_modal_higherlower', title: '📊 Higher/Lower', fields: [
      { id: 'bet_amount', label: 'Bet Amount', placeholder: 'Enter credits' },
      { id: 'bet_choice', label: 'Choice', placeholder: 'higher / lower / equal' },
    ]},
    rps: { id: 'bet_modal_rps', title: '✊ RPS', fields: [
      { id: 'bet_amount', label: 'Bet Amount', placeholder: 'Enter credits' },
      { id: 'bet_choice', label: 'Choice', placeholder: 'rock / paper / scissors' },
    ]},
  };

  const cfg = modalMap[game];
  if (!cfg) return;

  const modal = new ModalBuilder().setCustomId(cfg.id).setTitle(cfg.title);
  for (const f of cfg.fields) {
    modal.addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId(f.id).setLabel(f.label).setPlaceholder(f.placeholder).setStyle(TextInputStyle.Short).setRequired(true)
    ));
  }
  await interaction.showModal(modal);
}

async function handleRouletteBet(interaction) {
  const amount = parseInt(interaction.fields.getTextInputValue('bet_amount'));
  const choice = interaction.fields.getTextInputValue('bet_choice').toLowerCase();
  if (isNaN(amount) || amount <= 0) return replyError(interaction, 'Enter a positive number.');

  const result = games.playRoulette(interaction.user.id, interaction.guild.id, interaction.channel.id, choice, choice, amount);
  if (!result.success) return replyError(interaction, result.reason);

  await log(interaction.guild, 'games', result.won ? '🎰 Roulette Win' : '🎰 Roulette Loss', { actor: interaction.user.id, amount });
  await interaction.reply({ embeds: [
    new EmbedBuilder()
      .setTitle(`🎰 Roulette — ${result.result}`)
      .setDescription(result.won ? `🎉 Won **${formatCredits(result.payout)}**!` : `Lost **${formatCredits(amount)}**.`)
      .addFields({ name: 'Balance', value: formatCredits(result.balance), inline: true })
      .setColor(result.won ? config.colors.success : config.colors.error).setTimestamp()
  ] });
}

async function handleCoinflipBet(interaction) {
  const amount = parseInt(interaction.fields.getTextInputValue('bet_amount'));
  const choice = interaction.fields.getTextInputValue('bet_choice').toLowerCase();
  if (isNaN(amount) || amount <= 0) return replyError(interaction, 'Enter a positive number.');
  if (!['heads', 'tails'].includes(choice)) return replyError(interaction, 'Choose heads or tails.');

  const result = games.playCoinflip(interaction.user.id, interaction.guild.id, interaction.channel.id, choice, amount);
  if (!result.success) return replyError(interaction, result.reason);

  await log(interaction.guild, 'games', result.won ? '🪙 Coinflip Win' : '🪙 Coinflip Loss', { actor: interaction.user.id, amount });
  await interaction.reply({ embeds: [
    new EmbedBuilder()
      .setTitle(`🪙 ${result.result}`)
      .setDescription(result.won ? `🎉 Won **${formatCredits(result.payout)}**!` : `Lost **${formatCredits(amount)}**.`)
      .addFields({ name: 'Balance', value: formatCredits(result.balance), inline: true })
      .setColor(result.won ? config.colors.success : config.colors.error).setTimestamp()
  ] });
}

async function handleBlackjackBet(interaction) {
  const amount = parseInt(interaction.fields.getTextInputValue('bet_amount'));
  if (isNaN(amount) || amount <= 0) return replyError(interaction, 'Enter a positive number.');

  const result = games.playBlackjack(interaction.user.id, interaction.guild.id, interaction.channel.id, amount);
  if (!result.success) return replyError(interaction, result.reason);

  const handStr = result.playerHand.map(c => `${c.value}${c.suit}`).join(' ');
  const dealerStr = result.dealerHand.map(c => `${c.value}${c.suit}`).join(' ');

  await log(interaction.guild, 'games', `🃏 Blackjack: ${result.result}`, { actor: interaction.user.id, amount });
  await interaction.reply({ embeds: [
    new EmbedBuilder()
      .setTitle(`🃏 Blackjack — ${result.result}`)
      .setDescription(`**You (${result.playerVal}):** ${handStr}\n**Dealer (${result.dealerVal}):** ${dealerStr}`)
      .addFields({ name: 'Balance', value: formatCredits(result.balance), inline: true })
      .setColor(result.won ? config.colors.success : config.colors.error).setTimestamp()
  ] });
}

async function handleSlotsBet(interaction) {
  const amount = parseInt(interaction.fields.getTextInputValue('bet_amount'));
  if (isNaN(amount) || amount <= 0) return replyError(interaction, 'Enter a positive number.');

  const result = games.playSlots(interaction.user.id, interaction.guild.id, interaction.channel.id, amount);
  if (!result.success) return replyError(interaction, result.reason);

  await log(interaction.guild, 'games', result.won ? '🎰 Slots Win' : '🎰 Slots Loss', { actor: interaction.user.id, amount });
  await interaction.reply({ embeds: [
    new EmbedBuilder()
      .setTitle('🎰 Slots')
      .setDescription(`${result.reels[0]} | ${result.reels[1]} | ${result.reels[2]}`)
      .addFields(
        { name: result.won ? '🎉 Won' : '😔 Lost', value: result.won ? formatCredits(result.payout) : formatCredits(amount), inline: true },
        { name: 'Balance', value: formatCredits(result.balance), inline: true },
      )
      .setColor(result.won ? config.colors.success : config.colors.error).setTimestamp()
  ] });
}

async function handleDiceBet(interaction) {
  const amount = parseInt(interaction.fields.getTextInputValue('bet_amount'));
  const choice = parseInt(interaction.fields.getTextInputValue('bet_choice'));
  if (isNaN(amount) || amount <= 0 || isNaN(choice) || choice < 1 || choice > 6) return replyError(interaction, 'Enter valid bet and predict 1-6.');

  const result = games.playDice(interaction.user.id, interaction.guild.id, interaction.channel.id, choice, amount);
  if (!result.success) return replyError(interaction, result.reason);

  await log(interaction.guild, 'games', result.won ? '🎲 Dice Win' : '🎲 Dice Loss', { actor: interaction.user.id, amount });
  await interaction.reply({ embeds: [
    new EmbedBuilder()
      .setTitle(`🎲 Dice — ${result.roll}`)
      .setDescription(result.won ? `🎉 Won **${formatCredits(result.payout)}**!` : `Lost **${formatCredits(amount)}**.`)
      .addFields({ name: 'Balance', value: formatCredits(result.balance), inline: true })
      .setColor(result.won ? config.colors.success : config.colors.error).setTimestamp()
  ] });
}

async function handleHigherLowerBet(interaction) {
  const amount = parseInt(interaction.fields.getTextInputValue('bet_amount'));
  const choice = interaction.fields.getTextInputValue('bet_choice').toLowerCase();
  if (isNaN(amount) || amount <= 0) return replyError(interaction, 'Enter a positive number.');
  if (!['higher', 'lower', 'equal'].includes(choice)) return replyError(interaction, 'Choose higher, lower, or equal.');

  const result = games.playHigherLower(interaction.user.id, interaction.guild.id, interaction.channel.id, choice, amount);
  if (!result.success) return replyError(interaction, result.reason);

  await log(interaction.guild, 'games', result.won ? '📊 H/L Win' : '📊 H/L Loss', { actor: interaction.user.id, amount });
  await interaction.reply({ embeds: [
    new EmbedBuilder()
      .setTitle(`📊 ${result.first} → ${result.second}`)
      .setDescription(result.won ? `🎉 Won **${formatCredits(result.payout)}**!` : `Lost **${formatCredits(amount)}**.`)
      .addFields({ name: 'Balance', value: formatCredits(result.balance), inline: true })
      .setColor(result.won ? config.colors.success : config.colors.error).setTimestamp()
  ] });
}

async function handleRpsBet(interaction) {
  const amount = parseInt(interaction.fields.getTextInputValue('bet_amount'));
  const choice = interaction.fields.getTextInputValue('bet_choice').toLowerCase();
  if (isNaN(amount) || amount <= 0) return replyError(interaction, 'Enter a positive number.');
  if (!['rock', 'paper', 'scissors'].includes(choice)) return replyError(interaction, 'Choose rock, paper, or scissors.');

  const result = games.playRps(interaction.user.id, interaction.guild.id, interaction.channel.id, choice, amount);
  if (!result.success) return replyError(interaction, result.reason);

  const emojis = { rock: '✊', paper: '📄', scissors: '✂️' };
  const resultText = result.result === 'win' ? '🎉 Won!' : result.result === 'draw' ? '🤝 Draw!' : '😔 Lost!';

  await log(interaction.guild, 'games', `✊ RPS: ${result.result}`, { actor: interaction.user.id, amount });
  await interaction.reply({ embeds: [
    new EmbedBuilder()
      .setTitle('✊ Rock Paper Scissors')
      .setDescription(`${emojis[choice]} ${choice} vs ${emojis[result.botChoice]} ${result.botChoice}\n\n${resultText}`)
      .addFields({ name: 'Balance', value: formatCredits(result.balance), inline: true })
      .setColor(result.won ? config.colors.success : result.result === 'draw' ? config.colors.warning : config.colors.error).setTimestamp()
  ] });
}

async function replyError(interaction, msg) {
  await interaction.reply({ embeds: [
    new EmbedBuilder().setTitle('❌ Error').setDescription(msg).setColor(config.colors.error)
  ], ephemeral: true }).catch(() => {});
}
