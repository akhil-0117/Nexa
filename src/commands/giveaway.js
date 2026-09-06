const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const { isStaff } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Manage giveaways')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub
      .setName('create')
      .setDescription('Create a new giveaway')
      .addStringOption(opt => opt.setName('prize').setDescription('What are you giving away?').setRequired(true))
      .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in minutes').setRequired(true).setMinValue(1).setMaxValue(43200))
      .addIntegerOption(opt => opt.setName('winners').setDescription('Number of winners').setMinValue(1).setMaxValue(20))
      .addStringOption(opt => opt.setName('description').setDescription('Extra description for the giveaway'))
    )
    .addSubcommand(sub => sub
      .setName('end')
      .setDescription('End a giveaway early')
      .addStringOption(opt => opt.setName('message_id').setDescription('The giveaway message ID').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('reroll')
      .setDescription('Reroll a winner for a giveaway')
      .addStringOption(opt => opt.setName('message_id').setDescription('The giveaway message ID').setRequired(true))
    ),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setTitle('Staff Only').setDescription('Only staff can manage giveaways.').setColor(config.colors.error)],
        flags: 64,
      });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      const prize = interaction.options.getString('prize');
      const duration = interaction.options.getInteger('duration');
      const winners = interaction.options.getInteger('winners') || 1;
      const description = interaction.options.getString('description') || '';

      const { createGiveaway } = require('../systems/giveaways');
      const { id, endTime } = createGiveaway(
        interaction.guild.id, interaction.channel.id, interaction.user.id,
        prize, duration * 60000, { winnerCount: winners, description }
      );

      const embed = new EmbedBuilder()
        .setTitle('GIVEAWAY')
        .setColor(config.colors.giveaway)
        .setDescription(
          `\u2501`.repeat(32) + '\n' +
          `**${prize}**\n` +
          (description ? `${description}\n\n` : '') +
          `**Winner${winners > 1 ? 's' : ''}** ${winners}\n` +
          `**Ends** <t:${Math.floor(endTime / 1000)}:R>\n` +
          `**ID** ${id}\n` +
          `\u2501`.repeat(32) + '\n\n' +
          `React with \uD83C\uDF89 to enter!`
        )
        .setFooter({ text: `Giveaway by ${interaction.user.tag}` })
        .setTimestamp(endTime);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`gw_enter_${id}`).setLabel('Enter Giveaway').setStyle(ButtonStyle.Success).setEmoji('\uD83C\uDF89')
      );

      const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

      // Store message ID for ending
      const { getDb } = require('../database/init');
      getDb().prepare('UPDATE giveaways SET channel_id = ? WHERE id = ?').run(interaction.channel.id, id);

      // Schedule auto-end
      setTimeout(async () => {
        try {
          const { endGiveaway } = require('../systems/giveaways');
          const result = await endGiveaway(id, interaction.guild);
          if (result && result.winners && result.winners.length > 0) {
            const winnerText = result.winners.map(w => `<@${w}>`).join(', ');
            await interaction.channel.send({
              embeds: [new EmbedBuilder()
                .setTitle('GIVEAWAY ENDED')
                .setColor(config.colors.success)
                .setDescription(`**Prize:** ${prize}\n**Winner${result.winners.length > 1 ? 's' : ''}:** ${winnerText}`)
                .setTimestamp()
              ]
            }).catch(() => {});
          } else {
            await interaction.channel.send({
              embeds: [new EmbedBuilder()
                .setTitle('GIVEAWAY ENDED')
                .setColor(config.colors.warning)
                .setDescription(`**Prize:** ${prize}\n\nNo valid entries — no winners this time.`)
                .setTimestamp()
              ]
            }).catch(() => {});
          }
        } catch (e) {
          console.error('[GIVEAWAY] Auto-end failed:', e.message);
        }
      }, duration * 60000);

    } else if (sub === 'end') {
      const messageId = interaction.options.getString('message_id');
      const { endGiveaway } = require('../systems/giveaways');
      const result = await endGiveaway(messageId, interaction.guild);

      if (!result || !result.success) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setTitle('Error').setDescription(result?.error || 'Giveaway not found.').setColor(config.colors.error)],
          flags: 64,
        });
      }

      const winnerText = result.winners.length > 0 ? result.winners.map(w => `<@${w}>`).join(', ') : 'No valid entries';
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle('Giveaway Ended')
          .setColor(config.colors.success)
          .setDescription(`**Prize:** ${result.prize}\n**Winner${result.winners.length > 1 ? 's' : ''}:** ${winnerText}`)
          .setTimestamp()
        ],
      });

    } else if (sub === 'reroll') {
      const messageId = interaction.options.getString('message_id');
      const { rerollGiveaway } = require('../systems/giveaways');
      const result = await rerollGiveaway(messageId, interaction.guild);

      if (!result || !result.success) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setTitle('Error').setDescription(result?.error || 'Could not reroll.').setColor(config.colors.error)],
          flags: 64,
        });
      }

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle('Giveaway Rerolled')
          .setColor(config.colors.primary)
          .setDescription(`**Prize:** ${result.prize}\n**New Winner:** ${result.winners.length > 0 ? result.winners.map(w => `<@${w}>`).join(', ') : 'No valid entries'}`)
          .setTimestamp()
        ],
      });
    }
  },
};
