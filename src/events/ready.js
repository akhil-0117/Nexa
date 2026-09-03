const { Events, ActivityType } = require('discord.js');
const config = require('../config');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`[NEXAVERSE] Logged in as ${client.user.tag}`);
    console.log(`[NEXAVERSE] Serving ${client.guilds.cache.size} server(s) with ${client.users.cache.size} user(s)`);
    console.log(`[NEXAVERSE] ${client.commands.size} commands loaded`);

    client.user.setPresence({
      activities: [{ name: 'NEXAVERSE | /help', type: ActivityType.Watching }],
      status: 'online',
    });
  },
};
