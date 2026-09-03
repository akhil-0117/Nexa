const { Events } = require('discord.js');
const { log } = require('../systems/logging');

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage, client) {
    if (!oldMessage.guild || oldMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    await log(oldMessage.guild, 'messages', '✏️ Message Edited', {
      actor: oldMessage.author?.id,
      reason: `Channel: ${oldMessage.channel}\nBefore: ${oldMessage.content?.substring(0, 150)}\nAfter: ${newMessage.content?.substring(0, 150)}`,
    });
  },
};
