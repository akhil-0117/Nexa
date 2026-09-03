const { EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { isStaff, canModerate } = require('../utils/permissions');
const { warn, getUserCases, createCase } = require('../systems/moderation');
const { log } = require('../systems/logging');
const config = require('../config');
const { formatTimestamp, parseDuration } = require('../utils/helpers');

module.exports = {
  selectMenus: {
    mod_user_select: handleUserSelect,
  },
  modals: {
    mod_modal_warn: handleWarnModal,
    mod_modal_timeout: handleTimeoutModal,
    mod_modal_kick: handleKickModal,
    mod_modal_ban: handleBanModal,
    mod_modal_purge: handlePurgeModal,
    mod_modal_slowmode: handleSlowmodeModal,
  },
};

async function handleUserSelect(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('🔒 Staff Only').setColor(config.colors.error)
    ], ephemeral: true });
  }

  const targetId = interaction.values[0];
  const member = await interaction.guild.members.fetch(targetId).catch(() => null);
  if (!member) {
    return interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('❌ Not Found').setDescription('User not found in this server.').setColor(config.colors.error)
    ], ephemeral: true });
  }

  if (!canModerate(interaction.member, member)) {
    return interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('🔒 Cannot Moderate').setDescription('You cannot moderate this user (higher or equal role).').setColor(config.colors.error)
    ], ephemeral: true });
  }

  const embed = new EmbedBuilder()
    .setTitle(`🛡️ Moderating ${member.user.username}`)
    .setColor(config.colors.moderation)
    .setDescription(`**Target:** <@${targetId}>\n**ID:** ${targetId}\n**Joined:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>`)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setTimestamp();

  const select = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`mod_action_select_${targetId}`)
      .setPlaceholder('Choose an action...')
      .addOptions([
        { label: 'Warn', value: 'warn', emoji: '⚠️', description: 'Issue a warning' },
        { label: 'Timeout', value: 'timeout', emoji: '🔇', description: 'Timeout a member' },
        { label: 'Kick', value: 'kick', emoji: '👢', description: 'Kick a member' },
        { label: 'Ban', value: 'ban', emoji: '🔨', description: 'Ban a member' },
        { label: 'Unmute', value: 'unmute', emoji: '🔊', description: 'Remove mute' },
        { label: 'Untimeout', value: 'untimeout', emoji: '⏰', description: 'Remove timeout' },
        { label: 'Purge', value: 'purge', emoji: '🧹', description: 'Delete messages' },
        { label: 'Lock/Unlock', value: 'lock', emoji: '🔒', description: 'Toggle channel lock' },
        { label: 'Slowmode', value: 'slowmode', emoji: '🐌', description: 'Set slowmode' },
        { label: 'View Cases', value: 'cases', emoji: '📋', description: 'View cases' },
      ])
  );

  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('mod_back_to_select').setLabel('← Back').setStyle(ButtonStyle.Secondary)
  );

  await interaction.update({ embeds: [embed], components: [select, backRow] });
}

// Handle action select: mod_action_select_<targetId>
module.exports.selectMenus['mod_action_select_*'] = handleActionSelect;

async function handleActionSelect(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🔒 Staff Only').setColor(config.colors.error)], ephemeral: true });
  }

  const parts = interaction.customId.split('_');
  const targetId = parts[3]; // mod_action_select_TARGETID
  const action = interaction.values[0];

  switch (action) {
    case 'warn': {
      const modal = new ModalBuilder()
        .setCustomId(`mod_modal_warn_${targetId}`)
        .setTitle(`Warn ${targetId}`)
        .addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('reason').setLabel('Warning Reason').setStyle(TextInputStyle.Paragraph).setRequired(true)
        ));
      await interaction.showModal(modal);
      break;
    }
    case 'timeout': {
      const modal = new ModalBuilder()
        .setCustomId(`mod_modal_timeout_${targetId}`)
        .setTitle(`Timeout ${targetId}`)
        .addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('duration').setLabel('Duration (e.g. 1h, 1d)').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reason').setLabel('Reason').setStyle(TextInputStyle.Paragraph).setRequired(true)),
        );
      await interaction.showModal(modal);
      break;
    }
    case 'kick': {
      const modal = new ModalBuilder()
        .setCustomId(`mod_modal_kick_${targetId}`)
        .setTitle(`Kick ${targetId}`)
        .addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('reason').setLabel('Reason').setStyle(TextInputStyle.Paragraph).setRequired(true)
        ));
      await interaction.showModal(modal);
      break;
    }
    case 'ban': {
      const modal = new ModalBuilder()
        .setCustomId(`mod_modal_ban_${targetId}`)
        .setTitle(`Ban ${targetId}`)
        .addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('reason').setLabel('Reason').setStyle(TextInputStyle.Paragraph).setRequired(true)
        ));
      await interaction.showModal(modal);
      break;
    }
    case 'unmute': {
      try {
        const member = await interaction.guild.members.fetch(targetId);
        await member.timeout(null);
        const result = warn(targetId, interaction.user.id, 'Manual unmute', interaction.guild.id);
        await log(interaction.guild, 'moderation', '🔊 Unmuted', { actor: interaction.user.id, target: targetId, caseId: result.caseId });
        await interaction.reply({ embeds: [
          new EmbedBuilder().setTitle('✅ Unmuted').setDescription(`<@${targetId}> unmuted.`).setColor(config.colors.success).setTimestamp()
        ] });
      } catch (e) {
        await interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription(e.message).setColor(config.colors.error)], ephemeral: true });
      }
      break;
    }
    case 'untimeout': {
      try {
        const member = await interaction.guild.members.fetch(targetId);
        await member.timeout(null);
        const result = warn(targetId, interaction.user.id, 'Manual untimeout', interaction.guild.id);
        await log(interaction.guild, 'moderation', '⏰ Untimeout', { actor: interaction.user.id, target: targetId, caseId: result.caseId });
        await interaction.reply({ embeds: [
          new EmbedBuilder().setTitle('✅ Untimeout').setDescription(`<@${targetId}> timeout removed.`).setColor(config.colors.success).setTimestamp()
        ] });
      } catch (e) {
        await interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription(e.message).setColor(config.colors.error)], ephemeral: true });
      }
      break;
    }
    case 'purge': {
      const modal = new ModalBuilder()
        .setCustomId('mod_modal_purge')
        .setTitle('Purge Messages')
        .addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('count').setLabel('Number (1-100)').setStyle(TextInputStyle.Short).setRequired(true)
        ));
      await interaction.showModal(modal);
      break;
    }
    case 'lock': {
      try {
        const everyone = interaction.guild.roles.everyone;
        const current = interaction.channel.permissionOverwrites.cache.get(everyone.id);
        const locked = current?.deny?.has('SendMessages');
        await interaction.channel.permissionOverwrites.edit(everyone, { SendMessages: locked });
        await log(interaction.guild, 'moderation', locked ? '🔓 Channel Unlocked' : '🔒 Channel Locked', { actor: interaction.user.id });
        await interaction.reply({ embeds: [
          new EmbedBuilder().setTitle(locked ? '🔓 Unlocked' : '🔒 Locked').setDescription(`Channel ${locked ? 'unlocked' : 'locked'}.`).setColor(locked ? config.colors.success : config.colors.warning).setTimestamp()
        ] });
      } catch (e) {
        await interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription(e.message).setColor(config.colors.error)], ephemeral: true });
      }
      break;
    }
    case 'slowmode': {
      const modal = new ModalBuilder()
        .setCustomId('mod_modal_slowmode')
        .setTitle('Set Slowmode')
        .addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('seconds').setLabel('Seconds (0 to disable)').setStyle(TextInputStyle.Short).setRequired(true)
        ));
      await interaction.showModal(modal);
      break;
    }
    case 'cases': {
      const cases = getUserCases(targetId, 10);
      if (cases.length === 0) {
        return interaction.reply({ embeds: [
          new EmbedBuilder().setTitle('📋 Cases').setDescription('No cases found.').setColor(config.colors.info)
        ] });
      }
      const fields = cases.map(c => ({ name: c.id, value: `${c.action}\n${c.reason}\n${formatTimestamp(c.created_at)}`, inline: true }));
      await interaction.reply({ embeds: [
        new EmbedBuilder().setTitle(`📋 Cases for <@${targetId}>`).setColor(config.colors.moderation).addFields(fields).setTimestamp()
      ] });
      break;
    }
  }
}

async function handleWarnModal(interaction) {
  const parts = interaction.customId.split('_');
  const targetId = parts[parts.length - 1];
  const reason = interaction.fields.getTextInputValue('reason');
  const result = warn(targetId, interaction.user.id, reason, interaction.guild.id);
  await log(interaction.guild, 'moderation', '⚠️ Warning', { actor: interaction.user.id, target: targetId, reason, caseId: result.caseId });
  await interaction.reply({ embeds: [
    new EmbedBuilder().setTitle('⚠️ Warning Issued').setDescription(`<@${targetId}> warned.\nCase: ${result.caseId}\nRep -${result.reputationDecrease}`).setColor(config.colors.moderation).setTimestamp()
  ] });
}

async function handleTimeoutModal(interaction) {
  const parts = interaction.customId.split('_');
  const targetId = parts[parts.length - 1];
  const duration = interaction.fields.getTextInputValue('duration');
  const reason = interaction.fields.getTextInputValue('reason');
  const ms = parseDuration(duration);
  if (ms <= 0) return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Invalid Duration').setColor(config.colors.error)], ephemeral: true });
  try {
    const member = await interaction.guild.members.fetch(targetId);
    await member.timeout(ms, reason);
    const caseId = createCase(targetId, interaction.user.id, 'timeout', reason, { duration: ms, guildId: interaction.guild.id });
    await log(interaction.guild, 'moderation', '🔇 Timeout', { actor: interaction.user.id, target: targetId, reason, caseId });
    await interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('🔇 Timed Out').setDescription(`<@${targetId}> timed out for ${duration}.\nCase: ${caseId}`).setColor(config.colors.moderation).setTimestamp()
    ] });
  } catch (e) {
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription(e.message).setColor(config.colors.error)], ephemeral: true });
  }
}

async function handleKickModal(interaction) {
  const parts = interaction.customId.split('_');
  const targetId = parts[parts.length - 1];
  const reason = interaction.fields.getTextInputValue('reason');
  const result = warn(targetId, interaction.user.id, reason, interaction.guild.id);
  try { await interaction.guild.members.kick(targetId, reason); } catch (e) {}
  await log(interaction.guild, 'moderation', '👢 Kick', { actor: interaction.user.id, target: targetId, reason, caseId: result.caseId });
  await interaction.reply({ embeds: [
    new EmbedBuilder().setTitle('👢 Kicked').setDescription(`<@${targetId}> kicked.\nCase: ${result.caseId}`).setColor(config.colors.moderation).setTimestamp()
  ] });
}

async function handleBanModal(interaction) {
  const parts = interaction.customId.split('_');
  const targetId = parts[parts.length - 1];
  const reason = interaction.fields.getTextInputValue('reason');
  const result = warn(targetId, interaction.user.id, reason, interaction.guild.id);
  try { await interaction.guild.members.ban(targetId, { reason }); } catch (e) {}
  await log(interaction.guild, 'moderation', '🔨 Ban', { actor: interaction.user.id, target: targetId, reason, caseId: result.caseId });
  await interaction.reply({ embeds: [
    new EmbedBuilder().setTitle('🔨 Banned').setDescription(`<@${targetId}> banned.\nCase: ${result.caseId}`).setColor(config.colors.moderation).setTimestamp()
  ] });
}

async function handlePurgeModal(interaction) {
  const count = parseInt(interaction.fields.getTextInputValue('count'));
  if (isNaN(count) || count < 1 || count > 100) {
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Invalid').setDescription('Enter 1-100.').setColor(config.colors.error)], ephemeral: true });
  }
  try {
    const deleted = await interaction.channel.bulkDelete(count, true);
    await log(interaction.guild, 'moderation', '🧹 Purge', { actor: interaction.user.id, reason: `${deleted.size} deleted` });
    await interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('🧹 Purged').setDescription(`${deleted.size} messages deleted.`).setColor(config.colors.success).setTimestamp()
    ] });
  } catch (e) {
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription(e.message).setColor(config.colors.error)], ephemeral: true });
  }
}

async function handleSlowmodeModal(interaction) {
  const seconds = parseInt(interaction.fields.getTextInputValue('seconds'));
  if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Invalid').setDescription('0-21600 seconds.').setColor(config.colors.error)], ephemeral: true });
  }
  await interaction.channel.setRateLimitPerUser(seconds);
  await interaction.reply({ embeds: [
    new EmbedBuilder().setTitle('🐌 Slowmode').setDescription(`Set to ${seconds}s`).setColor(config.colors.success).setTimestamp()
  ] });
}
