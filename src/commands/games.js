const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUser } = require('../systems/economy');
const { getRepInfo } = require('../systems/reputation');
const config = require('../config');
const { formatCredits, getEffectiveMaxBet } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('games')
    .setDescription('Open the Games Panel'),

  async execute(interaction) {
    const { user, guild } = interaction;
    const guildId = guild.id;
    const userData = getUser(user.id, guildId);
    const repInfo = getRepInfo(user.id, guildId);
    const maxBet = getEffectiveMaxBet(userData.reputation);

    const embed = new EmbedBuilder()
      .setTitle('🎮 NEXAVERSE Games')
      .setColor(config.colors.game)
      .setDescription(`Welcome to the games arcade, **${user.username}**!\n\nPlace bets and win Credits! Your max bet: **${formatCredits(maxBet)}**`)
      .addFields(
        { name: '🎰 Roulette', value: 'Bet on red, black, green, or a number', inline: true },
        { name: '🪙 Coinflip', value: 'Heads or tails, 2x payout', inline: true },
        { name: '🃏 Blackjack', value: 'Beat the dealer to 21', inline: true },
        { name: '🎰 Slots', value: 'Spin to win big', inline: true },
        { name: '🎲 Dice', value: 'Predict the roll', inline: true },
        { name: '📊 Higher/Lower', value: 'Guess if the next number is higher', inline: true },
        { name: '✊ Rock Paper Scissors', value: 'Classic RPS duel', inline: true },
      )
      .setFooter({ text: 'NEXAVERSE Games • Max bet is based on reputation and role' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('game_roulette').setLabel('Roulette').setStyle(ButtonStyle.Primary).setEmoji('🎰'),
      new ButtonBuilder().setCustomId('game_coinflip').setLabel('Coinflip').setStyle(ButtonStyle.Primary).setEmoji('🪙'),
      new ButtonBuilder().setCustomId('game_blackjack').setLabel('Blackjack').setStyle(ButtonStyle.Primary).setEmoji('🃏'),
      new ButtonBuilder().setCustomId('game_slots').setLabel('Slots').setStyle(ButtonStyle.Primary).setEmoji('🎰'),
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('game_dice').setLabel('Dice').setStyle(ButtonStyle.Secondary).setEmoji('🎲'),
      new ButtonBuilder().setCustomId('game_higherlower').setLabel('Higher/Lower').setStyle(ButtonStyle.Secondary).setEmoji('📊'),
      new ButtonBuilder().setCustomId('game_rps').setLabel('RPS').setStyle(ButtonStyle.Secondary).setEmoji('✊'),
    );

    await interaction.reply({ embeds: [embed], components: [row, row2], ephemeral: true });
  },
};
