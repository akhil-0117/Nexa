const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('birthday')
    .setDescription('Set your birthday to get a special role on your day!')
    .addSubcommand(sub => sub
      .setName('set')
      .setDescription('Set your birthday')
      .addIntegerOption(opt => opt.setName('day').setDescription('Day of month').setRequired(true).setMinValue(1).setMaxValue(31))
      .addIntegerOption(opt => opt.setName('month').setDescription('Month (1-12)').setRequired(true).setMinValue(1).setMaxValue(12))
    )
    .addSubcommand(sub => sub
      .setName('remove')
      .setDescription('Remove your birthday')
    )
    .addSubcommand(sub => sub
      .setName('upcoming')
      .setDescription('Show upcoming birthdays')
    )
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('Show all birthdays this month')
    ),

  async execute(interaction) {
    const { getDb } = require('../database/init');
    const db = getDb();
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    if (sub === 'set') {
      const day = interaction.options.getInteger('day');
      const month = interaction.options.getInteger('month');

      // Store birthday (month-day format)
      db.prepare(`INSERT OR REPLACE INTO guild_config (guild_id, key, value) VALUES (?, ?, ?)`).run(
        guildId, `birthday_${userId}`, `${month}-${day}`
      );

      const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle('Birthday Set')
          .setColor(config.colors.success)
          .setDescription(
            `\u2501`.repeat(32) + '\n' +
            `Your birthday is set to **${months[month]} ${day}**.\n\n` +
            `You'll receive a special role on your birthday!\n` +
            `\u2501`.repeat(32)
          )
          .setFooter({ text: 'NEXAVERSE Birthdays' })
          .setTimestamp()
        ],
        flags: 64,
      });

    } else if (sub === 'remove') {
      db.prepare('DELETE FROM guild_config WHERE guild_id = ? AND key = ?').run(guildId, `birthday_${userId}`);

      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle('Birthday Removed').setDescription('Your birthday has been removed.').setColor(config.colors.warning)],
        flags: 64,
      });

    } else if (sub === 'upcoming') {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentDay = now.getDate();

      // Get all birthdays
      const bdays = db.prepare("SELECT key, value FROM guild_config WHERE guild_id = ? AND key LIKE 'birthday_%'").all(guildId);

      // Parse and sort by days until next birthday
      const upcoming = bdays.map(row => {
        const userId2 = row.key.replace('birthday_', '');
        const [m, d] = row.value.split('-').map(Number);
        let daysUntil = ((m - currentMonth) * 31 + (d - currentDay));
        if (daysUntil < 0) daysUntil += 365;
        if (daysUntil === 0) daysUntil = 0; // Today!
        return { userId: userId2, month: m, day: d, daysUntil };
      }).sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 10);

      const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      let desc = `\u2501`.repeat(32) + '\n';

      if (upcoming.length === 0) {
        desc += 'No birthdays set yet.';
      } else {
        for (const b of upcoming) {
          const label = b.daysUntil === 0 ? '**Today!** \uD83C\uDF82' : `in ${b.daysUntil} days`;
          desc += `<@${b.userId}> \u2014 ${months[b.month]} ${b.day} (${label})\n`;
        }
      }
      desc += `\n\u2501`.repeat(32);

      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle('Upcoming Birthdays').setColor(config.colors.primary).setDescription(desc).setTimestamp()],
        flags: 64,
      });

    } else if (sub === 'list') {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

      const bdays = db.prepare("SELECT key, value FROM guild_config WHERE guild_id = ? AND key LIKE 'birthday_%'").all(guildId);
      const thisMonth = bdays.filter(row => {
        const [m] = row.value.split('-').map(Number);
        return m === currentMonth;
      });

      let desc = `\u2501`.repeat(32) + '\n**' + months[currentMonth] + ' Birthdays**\n\n';

      if (thisMonth.length === 0) {
        desc += 'No birthdays this month.';
      } else {
        for (const row of thisMonth) {
          const uid = row.key.replace('birthday_', '');
          const [, d] = row.value.split('-').map(Number);
          desc += `<@${uid}> \u2014 ${months[currentMonth]} ${d}\n`;
        }
      }
      desc += `\n\u2501`.repeat(32);

      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle('Birthdays This Month').setColor(config.colors.primary).setDescription(desc).setTimestamp()],
      });
    }
  },
};
