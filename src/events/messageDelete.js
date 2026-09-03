const { Events, EmbedBuilder } = require('discord.js');
const { log } = require('../systems/logging');

module.exports = {
  name: Events.MessageDelete,
  async execute(message, client) {
    if (!message.guild || message.author?.bot) return;

    await log(message.guild, 'messages', '🗑️ Message Deleted', {
      actor: message.author?.id,
      reason: `Channel: ${message.channel}\nContent: ${message.content?.substring(0, 200) || 'N/A'}`,
    });
  },
};
