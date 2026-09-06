const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remindme')
    .setDescription('Set a reminder that DMs you later')
    .addStringOption(opt => opt.setName('message').setDescription('What to remind you about').setRequired(true).setMaxLength(200))
    .addIntegerOption(opt => opt.setName('minutes').setDescription('Minutes from now').setMinValue(1).setMaxValue(43200))
    .addIntegerOption(opt => opt.setName('hours').setDescription('Hours from now').setMinValue(0).setMaxValue(720)),

  async execute(interaction) {
    const message = interaction.options.getString('message');
    const minutes = (interaction.options.getInteger('hours') || 0) * 60 + (interaction.options.getInteger('minutes') || 60);
    const remindAt = Date.now() + minutes * 60000;

    const { getDb } = require('../database/init');
    const db = getDb();
    db.prepare('INSERT INTO reminders (user_id, channel_id, message, remind_at, created_at) VALUES (?, ?, ?, ?, ?)').run(
      interaction.user.id, interaction.channel.id, message, remindAt, Date.now()
    );

    const timeStr = minutes >= 60
      ? `${Math.floor(minutes / 60)}h ${minutes % 60 > 0 ? minutes % 60 + 'm' : ''}`
      : `${minutes}m`;

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle('Reminder Set')
        .setColor(config.colors.success)
        .setDescription(
          `\u2501`.repeat(32) + '\n' +
          `I'll DM you in **${timeStr.trim()}** with:\n\n` +
          `> ${message}\n\n` +
          `\u2501`.repeat(32)
        )
        .setFooter({ text: 'NEXAVERSE Reminders' })
        .setTimestamp()
      ],
      flags: 64,
    });
  },
};
