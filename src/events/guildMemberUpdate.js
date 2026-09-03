const { Events } = require('discord.js');
const { log } = require('../systems/logging');

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember, client) {
    if (!oldMember.guild) return;

    // Nickname change
    if (oldMember.nickname !== newMember.nickname) {
      await log(oldMember.guild, 'members', '📝 Nickname Changed', {
        actor: newMember.user.id,
        reason: `${oldMember.nickname || oldMember.user.username} → ${newMember.nickname || newMember.user.username}`,
      });
    }

    // Role changes
    const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

    if (addedRoles.size > 0) {
      await log(oldMember.guild, 'members', '➕ Role Added', {
        actor: newMember.user.id,
        reason: addedRoles.map(r => r.name).join(', '),
      });
    }

    if (removedRoles.size > 0) {
      await log(oldMember.guild, 'members', '➖ Role Removed', {
        actor: newMember.user.id,
        reason: removedRoles.map(r => r.name).join(', '),
      });
    }
  },
};
