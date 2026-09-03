const { EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
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

async function handleGameSelect(interaction) {
  const game = interaction.values[0];

  switch (game) {
    case 'roulette': {
      const modal = new ModalBuilder()
        .setCustomId('bet_modal_roulette')
        .setTitle('🎰 Roulette')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('bet_amount').setLabel('Bet Amount').setPlaceholder('Enter credits').setStyle(TextInputStyle.Short).setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('bet_choice').setLabel('Bet Type').setPlaceholder('red / black / green / number (e.g. 17)').setStyle(TextInputStyle.Short).setRequired(true)
          ),
        );
      await interaction.showModal(modal);
      break;
    }
    case 'coinflip': {
      const modal = new ModalBuilder()
        .setCustomId('bet_modal_coinflip')
        .setTitle('🪙 Coinflip')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('bet_amount').setLabel('Bet Amount').setPlaceholder('Enter credits').setStyle(TextInputStyle.Short).setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('bet_choice').setLabel('Choice').setPlaceholder('heads or tails').setStyle(TextInputStyle.Short).setRequired(true)
          ),
        );
      await interaction.showModal(modal);
      break;
    }
    case 'blackjack': {
      const modal = new ModalBuilder()
        .setCustomId('bet_modal_blackjack')
        .setTitle('🃏 Blackjack')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('bet_amount').setLabel('Bet Amount').setPlaceholder('Enter credits').setStyle(TextInputStyle.Short).setRequired(true)
          ),
        );
      await interaction.showModal(modal);
      break;
    }
    case 'slots': {
      const modal = new ModalBuilder()
        .setCustomId('bet_modal_slots')
        .setTitle('🎰 Slots')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('bet_amount').setLabel('Bet Amount').setPlaceholder('Enter credits').setStyle(TextInputStyle.Short).setRequired(true)
          ),
        );
      await interaction.showModal(modal);
      break;
    }
    case 'dice': {
      const modal = new ModalBuilder()
        .setCustomId('bet_modal_dice')
        .setTitle('🎲 Dice')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('bet_amount').setLabel('Bet Amount').setPlaceholder('Enter credits').setStyle(TextInputStyle.Short).setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('bet_choice').setLabel('Predict (1-6)').setPlaceholder('Enter number').setStyle(TextInputStyle.Short).setRequired(true)
          ),
        );
      await interaction.showModal(modal);
      break;
    }
    case 'higherlower': {
      const modal = new ModalBuilder()
        .setCustomId('bet_modal_higherlower')
        .setTitle('📊 Higher/Lower')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('bet_amount').setLabel('Bet Amount').setPlaceholder('Enter credits').setStyle(TextInputStyle.Short).setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('bet_choice').setLabel('Choice').setPlaceholder('higher / lower / equal').setStyle(TextInputStyle.Short).setRequired(true)
          ),
        );
      await interaction.showModal(modal);
      break;
    }
    case 'rps': {
      const modal = new ModalBuilder()
        .setCustomId('bet_modal_rps')
        .setTitle('✊ Rock Paper Scissors')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('bet_amount').setLabel('Bet Amount').setPlaceholder('Enter credits').setStyle(TextInputStyle.Short).setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('bet_choice').setLabel('Choice').setPlaceholder('rock / paper / scissors').setStyle(TextInputStyle.Short).setRequired(true)
          ),
        );
      await interaction.showModal(modal);
      break;
    }
  }
}

async function handleRouletteBet(interaction) {
  const amount = parseInt(interaction.fields.getTextInputValue('bet_amount'));
  const choice = interaction.fields.getTextInputValue('bet_choice').toLowerCase();

  if (isNaN(amount) || amount <= 0) {
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Invalid').setDescription('Enter a positive number.').setColor(config.colors.error)], ephemeral: true });
  }

  const result = games.playRoulette(interaction.user.id, interaction.guild.id, interaction.channel.id, choice, choice, amount);
  if (!result.success) {
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription(result.reason).setColor(config.colors.error)], ephemeral: true });
  }

  await log(interaction.guild, 'games', result.won ? '🎰 Roulette Win' : '🎰 Roulette Loss', { actor: interaction.user.id, amount, reason: `Result: ${result.result}` });

  await interaction.reply({ embeds: [
    new EmbedBuilder()
      .setTitle(`🎰 Roulette — ${result.result}`)
      .setDescription(result.won ? `🎉 Won **${formatCredits(result.payout)}**!` : `Lost **${formatCredits(amount)}**.`)
      .addFields({ name: 'Balance', value: formatCredits(result.balance), inline: true })
      .setColor(result.won ? config.colors.success : config.colors.error).setTimestamp()
  ], ephemeral: true });
}

async function handleCoinflipBet(interaction) {
  const amount = parseInt(interaction.fields.getTextInputValue('bet_amount'));
  const choice = interaction.fields.getTextInputValue('bet_choice').toLowerCase();

  if (isNaN(amount) || amount <= 0) {
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Invalid').setDescription('Enter a positive number.').setColor(config.colors.error)], ephemeral: true });
  }
  if (!['heads', 'tails'].includes(choice)) {
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Invalid').setDescription('Choose heads or tails.').setColor(config.colors.error)], ephemeral: true });
  }

  const result = games.playCoinflip(interaction.user.id, interaction.guild.id, interaction.channel.id, choice, amount);
  if (!result.success) {
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription(result.reason).setColor(config.colors.error)], ephemeral: true });
  }

  await log(interaction.guild, 'games', result.won ? '🪙 Coinflip Win' : '🪙 Coinflip Loss', { actor: interaction.user.id, amount, reason: result.result });

  await interaction.reply({ embeds: [
    new EmbedBuilder()
      .setTitle(`🪙 ${result.result}`)
      .setDescription(result.won ? `🎉 Won **${formatCredits(result.payout)}**!` : `Lost **${formatCredits(amount)}**.`)
      .addFields({ name: 'Balance', value: formatCredits(result.balance), inline: true })
      .setColor(result.won ? config.colors.success : config.colors.error).setTimestamp()
  ], ephemeral: true });
}

async function handleBlackjackBet(interaction) {
  const amount = parseInt(interaction.fields.getTextInputValue('bet_amount'));
  if (isNaN(amount) || amount <= 0) {
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Invalid').setDescription('Enter a positive number.').setColor(config.colors.error)], ephemeral: true });
  }

  const result = games.playBlackjack(interaction.user.id, interaction.guild.id, interaction.channel.id, amount);
  if (!result.success) {
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription(result.reason).setColor(config.colors.error)], ephemeral: true });
  }

  const handStr = result.playerHand.map(c => `${c.value}${c.suit}`).join(' ');
  const dealerStr = result.dealerHand.map(c => `${c.value}${c.suit}`).join(' ');

  await log(interaction.guild, 'games', `🃏 Blackjack: ${result.result}`, { actor: interaction.user.id, amount, reason: `P:${result.playerVal} D:${result.dealerVal}` });

  await interaction.reply({ embeds: [
    new EmbedBuilder()
      .setTitle(`🃏 Blackjack — ${result.result}`)
      .setDescription(`**You (${result.playerVal}):** ${handStr}\n**Dealer (${result.dealerVal}):** ${dealerStr}`)
      .addFields({ name: 'Balance', value: formatCredits(result.balance), inline: true })
      .setColor(result.won ? config.colors.success : config.colors.error).setTimestamp()
  ], ephemeral: true });
}

async function handleSlotsBet(interaction) {
  const amount = parseInt(interaction.fields.getTextInputValue('bet_amount'));
  if (isNaN(amount) || amount <= 0) {
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Invalid').setDescription('Enter a positive number.').setColor(config.colors.error)], ephemeral: true });
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
        { name: result.won ? '🎉 Won' : '😔 Lost', value: result.won ? formatCredits(result.payout) : formatCredits(amount), inline: true },
        { name: 'Balance', value: formatCredits(result.balance), inline: true },
      )
      .setColor(result.won ? config.colors.success : config.colors.error).setTimestamp()
  ], ephemeral: true });
}

async function handleDiceBet(interaction) {
  const amount = parseInt(interaction.fields.getTextInputValue('bet_amount'));
  const choice = parseInt(interaction.fields.getTextInputValue('bet_choice'));

  if (isNaN(amount) || amount <= 0 || isNaN(choice) || choice < 1 || choice > 6) {
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Invalid').setDescription('Enter valid bet and predict 1-6.').setColor(config.colors.error)], ephemeral: true });
  }

  const result = games.playDice(interaction.user.id, interaction.guild.id, interaction.channel.id, choice, amount);
  if (!result.success) {
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription(result.reason).setColor(config.colors.error)], ephemeral: true });
  }

  await log(interaction.guild, 'games', result.won ? '🎲 Dice Win' : '🎲 Dice Loss', { actor: interaction.user.id, amount, reason: `Roll: ${result.roll}` });

  await interaction.reply({ embeds: [
    new EmbedBuilder()
      .setTitle(`🎲 Dice — ${result.roll}`)
      .setDescription(result.won ? `🎉 Won **${formatCredits(result.payout)}**!` : `Lost **${formatCredits(amount)}**.`)
      .addFields({ name: 'Balance', value: formatCredits(result.balance), inline: true })
      .setColor(result.won ? config.colors.success : config.colors.error).setTimestamp()
  ], ephemeral: true });
}

async function handleHigherLowerBet(interaction) {
  const amount = parseInt(interaction.fields.getTextInputValue('bet_amount'));
  const choice = interaction.fields.getTextInputValue('bet_choice').toLowerCase();

  if (isNaN(amount) || amount <= 0) {
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Invalid').setDescription('Enter a positive number.').setColor(config.colors.error)], ephemeral: true });
  }
  if (!['higher', 'lower', 'equal'].includes(choice)) {
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Invalid').setDescription('Choose higher, lower, or equal.').setColor(config.colors.error)], ephemeral: true });
  }

  const result = games.playHigherLower(interaction.user.id, interaction.guild.id, interaction.channel.id, choice, amount);
  if (!result.success) {
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription(result.reason).setColor(config.colors.error)], ephemeral: true });
  }

  await log(interaction.guild, 'games', result.won ? '📊 H/L Win' : '📊 H/L Loss', { actor: interaction.user.id, amount, reason: `${result.first} → ${result.second}` });

  await interaction.reply({ embeds: [
    new EmbedBuilder()
      .setTitle(`📊 ${result.first} → ${result.second}`)
      .setDescription(result.won ? `🎉 Won **${formatCredits(result.payout)}**!` : `Lost **${formatCredits(amount)}**.`)
      .addFields({ name: 'Balance', value: formatCredits(result.balance), inline: true })
      .setColor(result.won ? config.colors.success : config.colors.error).setTimestamp()
  ], ephemeral: true });
}

async function handleRpsBet(interaction) {
  const amount = parseInt(interaction.fields.getTextInputValue('bet_amount'));
  const choice = interaction.fields.getTextInputValue('bet_choice').toLowerCase();

  if (isNaN(amount) || amount <= 0) {
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Invalid').setDescription('Enter a positive number.').setColor(config.colors.error)], ephemeral: true });
  }
  if (!['rock', 'paper', 'scissors'].includes(choice)) {
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Invalid').setDescription('Choose rock, paper, or scissors.').setColor(config.colors.error)], ephemeral: true });
  }

  const result = games.playRps(interaction.user.id, interaction.guild.id, interaction.channel.id, choice, amount);
  if (!result.success) {
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription(result.reason).setColor(config.colors.error)], ephemeral: true });
  }

  const emojis = { rock: '✊', paper: '📄', scissors: '✂️' };
  const resultText = result.result === 'win' ? '🎉 Won!' : result.result === 'draw' ? '🤝 Draw!' : '😔 Lost!';

  await log(interaction.guild, 'games', `✊ RPS: ${result.result}`, { actor: interaction.user.id, amount });

  await interaction.reply({ embeds: [
    new EmbedBuilder()
      .setTitle('✊ Rock Paper Scissors')
      .setDescription(`${emojis[choice]} ${choice} vs ${emojis[result.botChoice]} ${result.botChoice}\n\n${resultText}`)
      .addFields({ name: 'Balance', value: formatCredits(result.balance), inline: true })
      .setColor(result.won ? config.colors.success : result.result === 'draw' ? config.colors.warning : config.colors.error).setTimestamp()
  ], ephemeral: true });
}
