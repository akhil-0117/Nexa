const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');
const games = require('../systems/games');
const config = require('../config');
const { formatCredits } = require('../utils/helpers');
const { log } = require('../systems/logging');

module.exports = {
  buttons: {
    game_roulette: handleRoulette,
    game_coinflip: handleCoinflip,
    game_blackjack: handleBlackjack,
    game_slots: handleSlots,
    game_dice: handleDice,
    game_higherlower: handleHigherLower,
    game_rps: handleRps,
  },
};

async function showBetModal(interaction, gameType, title) {
  const modal = new ModalBuilder()
    .setCustomId(`bet_modal_${gameType}`)
    .setTitle(title)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('bet_amount').setLabel('Bet Amount').setPlaceholder('Enter credits to bet').setStyle(TextInputStyle.Short).setRequired(true)
      ),
    );

  if (gameType === 'roulette') {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('bet_choice').setLabel('Bet Type (red/black/green/number)').setPlaceholder('e.g. red, black, green, or 17').setStyle(TextInputStyle.Short).setRequired(true)
      ),
    );
  } else if (gameType === 'coinflip') {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('bet_choice').setLabel('Heads or Tails').setPlaceholder('heads or tails').setStyle(TextInputStyle.Short).setRequired(true)
      ),
    );
  } else if (gameType === 'dice') {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('bet_choice').setLabel('Predict (1-6)').setPlaceholder('Enter a number 1-6').setStyle(TextInputStyle.Short).setRequired(true)
      ),
    );
  } else if (gameType === 'higherlower') {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('bet_choice').setLabel('higher/lower/equal').setPlaceholder('higher, lower, or equal').setStyle(TextInputStyle.Short).setRequired(true)
      ),
    );
  } else if (gameType === 'rps') {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('bet_choice').setLabel('rock/paper/scissors').setPlaceholder('rock, paper, or scissors').setStyle(TextInputStyle.Short).setRequired(true)
      ),
    );
  }

  await interaction.showModal(modal);
}

async function handleRoulette(interaction) { await showBetModal(interaction, 'roulette', '🎰 Roulette Bet'); }
async function handleCoinflip(interaction) { await showBetModal(interaction, 'coinflip', '🪙 Coinflip Bet'); }
async function handleDice(interaction) { await showBetModal(interaction, 'dice', '🎲 Dice Bet'); }
async function handleHigherLower(interaction) { await showBetModal(interaction, 'higherlower', '📊 Higher/Lower Bet'); }
async function handleRps(interaction) { await showBetModal(interaction, 'rps', '✊ Rock Paper Scissors'); }

async function handleBlackjack(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('bet_modal_blackjack')
    .setTitle('🃏 Blackjack Bet')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('bet_amount').setLabel('Bet Amount').setPlaceholder('Enter credits to bet').setStyle(TextInputStyle.Short).setRequired(true)
      ),
    );
  await interaction.showModal(modal);
}

async function handleSlots(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('bet_modal_slots')
    .setTitle('🎰 Slots Bet')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('bet_amount').setLabel('Bet Amount').setPlaceholder('Enter credits to bet').setStyle(TextInputStyle.Short).setRequired(true)
      ),
    );
  await interaction.showModal(modal);
}

// Modal submission handler for bet modals
module.exports.modals = {
  bet_modal_roulette: async (interaction) => {
    const amount = parseInt(interaction.fields.getTextInputValue('bet_amount'));
    const choice = interaction.fields.getTextInputValue('bet_choice').toLowerCase();

    if (isNaN(amount) || amount <= 0) {
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Invalid Bet').setDescription('Enter a positive number.').setColor(config.colors.error)], ephemeral: true });
    }

    const result = games.playRoulette(interaction.user.id, interaction.guild.id, interaction.channel.id, choice, choice, amount);
    if (!result.success) {
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription(result.reason).setColor(config.colors.error)], ephemeral: true });
    }

    const color = result.won ? config.colors.success : config.colors.error;
    await log(interaction.guild, 'games', result.won ? '🎰 Roulette Win' : '🎰 Roulette Loss', {
      actor: interaction.user.id, amount, reason: `Result: ${result.result}`,
    });

    await interaction.reply({ embeds: [
      new EmbedBuilder()
        .setTitle(`🎰 Roulette: ${result.result}`)
        .setDescription(result.won ? `🎉 You won **${formatCredits(result.payout)}**!` : `You lost **${formatCredits(amount)}**.`)
        .addFields({ name: 'Balance', value: formatCredits(result.balance), inline: true })
        .setColor(color).setTimestamp()
    ], ephemeral: true });
  },

  bet_modal_coinflip: async (interaction) => {
    const amount = parseInt(interaction.fields.getTextInputValue('bet_amount'));
    const choice = interaction.fields.getTextInputValue('bet_choice').toLowerCase();

    if (isNaN(amount) || amount <= 0) {
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Invalid Bet').setDescription('Enter a positive number.').setColor(config.colors.error)], ephemeral: true });
    }
    if (!['heads', 'tails'].includes(choice)) {
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Invalid Choice').setDescription('Choose heads or tails.').setColor(config.colors.error)], ephemeral: true });
    }

    const result = games.playCoinflip(interaction.user.id, interaction.guild.id, interaction.channel.id, choice, amount);
    if (!result.success) {
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription(result.reason).setColor(config.colors.error)], ephemeral: true });
    }

    await log(interaction.guild, 'games', result.won ? '🪙 Coinflip Win' : '🪙 Coinflip Loss', {
      actor: interaction.user.id, amount, reason: `Result: ${result.result}`,
    });

    await interaction.reply({ embeds: [
      new EmbedBuilder()
        .setTitle(`🪙 Coinflip: ${result.result}`)
        .setDescription(result.won ? `🎉 You won **${formatCredits(result.payout)}**!` : `You lost **${formatCredits(amount)}**.`)
        .addFields({ name: 'Balance', value: formatCredits(result.balance), inline: true })
        .setColor(result.won ? config.colors.success : config.colors.error).setTimestamp()
    ], ephemeral: true });
  },

  bet_modal_blackjack: async (interaction) => {
    const amount = parseInt(interaction.fields.getTextInputValue('bet_amount'));
    if (isNaN(amount) || amount <= 0) {
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Invalid Bet').setDescription('Enter a positive number.').setColor(config.colors.error)], ephemeral: true });
    }

    const result = games.playBlackjack(interaction.user.id, interaction.guild.id, interaction.channel.id, amount);
    if (!result.success) {
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription(result.reason).setColor(config.colors.error)], ephemeral: true });
    }

    const handStr = result.playerHand.map(c => `${c.value}${c.suit}`).join(' ');
    const dealerStr = result.dealerHand.map(c => `${c.value}${c.suit}`).join(' ');

    await log(interaction.guild, 'games', `🃏 Blackjack: ${result.result}`, { actor: interaction.user.id, amount, reason: `Player: ${result.playerVal}, Dealer: ${result.dealerVal}` });

    await interaction.reply({ embeds: [
      new EmbedBuilder()
        .setTitle(`🃏 Blackjack: ${result.result}`)
        .setDescription(`Your hand (${result.playerVal}): ${handStr}\nDealer hand (${result.dealerVal}): ${dealerStr}`)
        .setColor(result.won ? config.colors.success : config.colors.error)
        .addFields({ name: 'Balance', value: formatCredits(result.balance), inline: true })
        .setTimestamp()
    ], ephemeral: true });
  },

  bet_modal_slots: async (interaction) => {
    const amount = parseInt(interaction.fields.getTextInputValue('bet_amount'));
    if (isNaN(amount) || amount <= 0) {
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Invalid Bet').setDescription('Enter a positive number.').setColor(config.colors.error)], ephemeral: true });
    }

    const result = games.playSlots(interaction.user.id, interaction.guild.id, interaction.channel.id, amount);
    if (!result.success) {
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription(result.reason).setColor(config.colors.error)], ephemeral: true });
    }

    await log(interaction.guild, 'games', result.won ? '🎰 Slots Win' : '🎰 Slots Loss', { actor: interaction.user.id, amount });

    await interaction.reply({ embeds: [
      new EmbedBuilder()
        .setTitle('🎰 Slots')
        .setDescription(`${result.reels[0]} | ${result.reels[1]} | ${result.reels[2]}`)
        .addFields(
          { name: result.won ? '🎉 Won!' : '😔 Lost', value: result.won ? formatCredits(result.payout) : formatCredits(amount), inline: true },
          { name: 'Balance', value: formatCredits(result.balance), inline: true },
        )
        .setColor(result.won ? config.colors.success : config.colors.error).setTimestamp()
    ], ephemeral: true });
  },

  bet_modal_dice: async (interaction) => {
    const amount = parseInt(interaction.fields.getTextInputValue('bet_amount'));
    const choice = parseInt(interaction.fields.getTextInputValue('bet_choice'));

    if (isNaN(amount) || amount <= 0 || isNaN(choice) || choice < 1 || choice > 6) {
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Invalid Input').setDescription('Enter a valid bet and predict 1-6.').setColor(config.colors.error)], ephemeral: true });
    }

    const result = games.playDice(interaction.user.id, interaction.guild.id, interaction.channel.id, choice, amount);
    if (!result.success) {
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription(result.reason).setColor(config.colors.error)], ephemeral: true });
    }

    await log(interaction.guild, 'games', result.won ? '🎲 Dice Win' : '🎲 Dice Loss', { actor: interaction.user.id, amount, reason: `Roll: ${result.roll}` });

    await interaction.reply({ embeds: [
      new EmbedBuilder()
        .setTitle(`🎲 Dice: ${result.roll}`)
        .setDescription(result.won ? `🎉 You won **${formatCredits(result.payout)}**!` : `You lost **${formatCredits(amount)}**.`)
        .addFields({ name: 'Balance', value: formatCredits(result.balance), inline: true })
        .setColor(result.won ? config.colors.success : config.colors.error).setTimestamp()
    ], ephemeral: true });
  },

  bet_modal_higherlower: async (interaction) => {
    const amount = parseInt(interaction.fields.getTextInputValue('bet_amount'));
    const choice = interaction.fields.getTextInputValue('bet_choice').toLowerCase();

    if (isNaN(amount) || amount <= 0) {
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Invalid Bet').setDescription('Enter a positive number.').setColor(config.colors.error)], ephemeral: true });
    }
    if (!['higher', 'lower', 'equal'].includes(choice)) {
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Invalid Choice').setDescription('Choose higher, lower, or equal.').setColor(config.colors.error)], ephemeral: true });
    }

    const result = games.playHigherLower(interaction.user.id, interaction.guild.id, interaction.channel.id, choice, amount);
    if (!result.success) {
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription(result.reason).setColor(config.colors.error)], ephemeral: true });
    }

    await log(interaction.guild, 'games', result.won ? '📊 H/L Win' : '📊 H/L Loss', { actor: interaction.user.id, amount, reason: `${result.first} → ${result.second}` });

    await interaction.reply({ embeds: [
      new EmbedBuilder()
        .setTitle(`📊 Higher/Lower: ${result.first} → ${result.second}`)
        .setDescription(result.won ? `🎉 You won **${formatCredits(result.payout)}**!` : `You lost **${formatCredits(amount)}**.`)
        .addFields({ name: 'Balance', value: formatCredits(result.balance), inline: true })
        .setColor(result.won ? config.colors.success : config.colors.error).setTimestamp()
    ], ephemeral: true });
  },

  bet_modal_rps: async (interaction) => {
    const amount = parseInt(interaction.fields.getTextInputValue('bet_amount'));
    const choice = interaction.fields.getTextInputValue('bet_choice').toLowerCase();

    if (isNaN(amount) || amount <= 0) {
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Invalid Bet').setDescription('Enter a positive number.').setColor(config.colors.error)], ephemeral: true });
    }
    if (!['rock', 'paper', 'scissors'].includes(choice)) {
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Invalid Choice').setDescription('Choose rock, paper, or scissors.').setColor(config.colors.error)], ephemeral: true });
    }

    const result = games.playRps(interaction.user.id, interaction.guild.id, interaction.channel.id, choice, amount);
    if (!result.success) {
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription(result.reason).setColor(config.colors.error)], ephemeral: true });
    }

    const emojis = { rock: '✊', paper: '📄', scissors: '✂️' };
    const resultText = result.result === 'win' ? '🎉 You won!' : result.result === 'draw' ? '🤝 Draw!' : '😔 You lost!';

    await log(interaction.guild, 'games', `✊ RPS: ${result.result}`, { actor: interaction.user.id, amount });

    await interaction.reply({ embeds: [
      new EmbedBuilder()
        .setTitle('✊ Rock Paper Scissors')
        .setDescription(`${emojis[choice]} ${choice} vs ${emojis[result.botChoice]} ${result.botChoice}\n\n${resultText}`)
        .addFields({ name: 'Balance', value: formatCredits(result.balance), inline: true })
        .setColor(result.won ? config.colors.success : result.result === 'draw' ? config.colors.warning : config.colors.error).setTimestamp()
    ], ephemeral: true });
  },
};
