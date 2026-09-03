const { Events, EmbedBuilder } = require('discord.js');
const { log } = require('../systems/logging');
const { recordLeave } = require('../systems/invites');
const config = require('../config');
const { getDb } = require('../database/init');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member, client) {
    const { guild, user } = member;
    const guildId = guild.id;

    recordLeave(user.id, guildId);

    // Log leave
    await log(guild, 'members', '👋 Member Left', {
      actor: user.id,
    });

    // Farewell message
    const db = getDb();
    const farewellChannelId = db.prepare('SELECT value FROM guild_config WHERE guild_id = ? AND key = ?').get(guildId, 'farewell_channel');
    const channel = farewellChannelId ? guild.channels.cache.get(farewellChannelId.value) : null;

    if (channel) {
      const embed = new EmbedBuilder()
        .setTitle('Goodbye!')
        .setDescription(`${user.username} has left the server.\nWe now have ${guild.memberCount} members.`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setColor(config.colors.warning)
        .setTimestamp();

      await channel.send({ embeds: [embed] }).catch(() => {});
    }
  },
};
