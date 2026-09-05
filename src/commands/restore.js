const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getDb } = require('../database/init');
const config = require('../config');
const { log } = require('../systems/logging');

function isOwner(userId, username) {
  if (config.ownerUserId && userId === config.ownerUserId) return true;
  if (config.ownerUsername && username && username.toLowerCase() === config.ownerUsername.toLowerCase()) return true;
  return false;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('restore')
    .setDescription('Owner only \u2014 DM join invitations to all verified members'),

  async execute(interaction) {
    // Owner check: ID from env takes priority; fallback to configured username
    if (!isOwner(interaction.user.id, interaction.user.username)) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setTitle('Owner Only')
          .setDescription('This command can only be used by the server owner.')
          .setColor(config.colors.error)],
        flags: 64,
      });
    }

    await interaction.deferReply({ flags: 64 });

    const db = getDb();
    const guild = interaction.guild;

    // Get the best invite to use
    const { value: savedInvite } = db.prepare('SELECT value FROM guild_config WHERE guild_id = ? AND key = ?').get(guild.id, 'restore_invite') || {};
    let inviteUrl = savedInvite || null;

    if (!inviteUrl) {
      // Try to find or create an invite
      try {
        const channels = guild.channels.cache.filter(c => c.isTextBased() && c.permissionsFor(guild.members.me).has('CreateInstantInvite'));
        const target = channels.first();
        if (target) {
          const invite = await target.createInvite({ maxAge: 0, maxUses: 0, unique: true, reason: 'NEXAVERSE restore invite' });
          inviteUrl = invite.url;
          db.prepare('INSERT OR REPLACE INTO guild_config (guild_id, key, value) VALUES (?, ?, ?)').run(guild.id, 'restore_invite', inviteUrl);
        }
      } catch (e) {
        // No permission to create invites
      }
    }

    if (!inviteUrl) {
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setTitle('No Invite Available')
          .setDescription('I could not find or create an invite link.\n\n**Fix:** Give me the `Create Invite` permission in at least one channel, or save an invite with `/restore save <link>`.')]
      });
    }

    // Gather verified members (from any guild record — cross-server restore)
    const verifiedUsers = db.prepare("SELECT DISTINCT user_id FROM verifications WHERE status = 'verified'").all();
    const currentMemberIds = new Set((await guild.members.fetch()).map(m => m.id));

    // Filter to users NOT currently in the server
    const missing = verifiedUsers.filter(v => !currentMemberIds.has(v.user_id));

    const divider = '\u2501'.repeat(32);

    if (missing.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('NEXAVERSE \u00b7 Restore')
        .setColor(config.colors.success)
        .setDescription(`${divider}\nAll **${verifiedUsers.length}** verified members are already in this server.\n${divider}`)
        .setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    }

    // Preview before execution
    const preview = new EmbedBuilder()
      .setTitle('NEXAVERSE \u00b7 Restore Members')
      .setColor(config.colors.primary)
      .setDescription(
        `${divider}\n` +
        `**Verified members on record** ${verifiedUsers.length}\n` +
        `**Currently in server** ${currentMemberIds.size}\n` +
        `**Missing (will be DM'd)** ${missing.length}\n\n` +
        `**Invite to send** ${inviteUrl}\n` +
        `${divider}\n` +
        `Click **Send Invites** to DM the join link to all missing members.\n` +
        `Discord rate limits DMs \u2014 sends are queued at ~1 per 2 seconds.`
      )
      .setFooter({ text: 'Restore is logged to the staff log' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`restore_confirm_${interaction.user.id}`).setLabel('Send Invites').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`restore_cancel_${interaction.user.id}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary),
    );

    await interaction.editReply({ embeds: [preview], components: [row] });
  },
};

module.exports.isOwner = isOwner;
