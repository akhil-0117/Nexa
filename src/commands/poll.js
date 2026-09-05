const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createPoll } = require('../systems/polls');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create an interactive poll')
    .addStringOption(opt => opt.setName('question').setDescription('Poll question').setRequired(true))
    .addStringOption(opt => opt.setName('options').setDescription('Options separated by commas').setRequired(true))
    .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in minutes').setMinValue(1).setMaxValue(10080)),

  async execute(interaction) {
    const question = interaction.options.getString('question');
    const optionsStr = interaction.options.getString('options');
    const duration = interaction.options.getInteger('duration') || 60;

    const options = optionsStr.split(',').map(o => o.trim()).filter(o => o.length > 0);
    if (options.length < 2 || options.length > 10) {
      return interaction.reply({ embeds: [
        new EmbedBuilder().setTitle('❌ Invalid Options').setDescription('Provide 2-10 options separated by commas.').setColor(config.colors.error)
      ], flags: 64 });
    }

    const result = createPoll(interaction.guild.id, interaction.user.id, question, options, duration * 60000);

    const optionText = options.map((o, i) => `**${i + 1}.** ${o}`).join('\n');
    const embed = new EmbedBuilder()
      .setTitle(`📊 ${question}`)
      .setDescription(optionText)
      .setColor(config.colors.info)
      .setFooter({ text: `Poll by ${interaction.user.username} • Ends ${duration}m from now` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      ...options.slice(0, 5).map((_, i) => new ButtonBuilder().setCustomId(`poll_vote_${result.id}_${i}`).setLabel(`${i + 1}`).setStyle(ButtonStyle.Secondary))
    );

    const row2 = options.length > 5 ? new ActionRowBuilder().addComponents(
      ...options.slice(5, 10).map((_, i) => new ButtonBuilder().setCustomId(`poll_vote_${result.id}_${i + 5}`).setLabel(`${i + 6}`).setStyle(ButtonStyle.Secondary))
    ) : null;

    const components = [row, ...(row2 ? [row2] : [])];
    await interaction.reply({ embeds: [embed], components });
  },
};
