const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { isStaff, getStaffRole, canModerate } = require('../utils/permissions');
const { warn, getUserCases, getWarnings, getCase, createCase } = require('../systems/moderation');
const { log } = require('../systems/logging');
const config = require('../config');
const { formatDateTime, formatTimestamp } = require('../utils/helpers');

module.exports = {
  buttons: {},
};

// Dynamic button handler for mod_* pattern
module.exports.buttons['mod_warn_*'] = handleWarn;
module.exports.buttons['mod_timeout_*'] = handleTimeout;
module.exports.buttons['mod_kick_*'] = handleKick;
module.exports.buttons['mod_ban_*'] = handleBan;
module.exports.buttons['mod_unmute_*'] = handleUnmute;
module.exports.buttons['mod_untimeout_*'] = handleUntimeout;
module.exports.buttons['mod_purge_*'] = handlePurge;
module.exports.buttons['mod_cases_*'] = handleCases;
module.exports.buttons['mod_history_*'] = handleHistory;
module.exports.buttons['mod_slowmode'] = handleSlowmode;
module.exports.buttons['mod_lock'] = handleLock;

function getTargetId(interaction) {
  const parts = interaction.customId.split('_');
  return parts[parts.length - 1];
}

async function handleModAction(interaction, action, placeholder, inputLabel) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('❌ Access Denied').setDescription('Staff only.').setColor(config.colors.error)
    ], ephemeral: true });
  }

  const targetId = getTargetId(interaction);
  if (!targetId || targetId === '') {
    return interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('❌ No Target').setDescription('Use `/moderation` with a target user first.').setColor(config.colors.error)
    ], ephemeral: true });
  }

  const modal = new ModalBuilder()
    .setCustomId(`mod_modal_${action}_${targetId}`)
    .setTitle(`${action.charAt(0).toUpperCase() + action.slice(1)} User`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('reason').setLabel(inputLabel || 'Reason').setPlaceholder(placeholder || 'Enter reason').setStyle(TextInputStyle.Paragraph).setRequired(true)
      ),
    );

  await interaction.showModal(modal);
}

async function handleWarn(interaction) { await handleModAction(interaction, 'warn', 'Enter warning reason', 'Warning Reason'); }
async function handleTimeout(interaction) {
  if (!isStaff(interaction.member)) return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Access Denied').setColor(config.colors.error)], ephemeral: true });
  const targetId = getTargetId(interaction);
  const modal = new ModalBuilder()
    .setCustomId(`mod_modal_timeout_${targetId}`)
    .setTitle('Timeout User')
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('duration').setLabel('Duration (e.g. 1h, 1d)').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reason').setLabel('Reason').setStyle(TextInputStyle.Paragraph).setRequired(true)),
    );
  await interaction.showModal(modal);
}
async function handleKick(interaction) { await handleModAction(interaction, 'kick', 'Enter kick reason', 'Kick Reason'); }
async function handleBan(interaction) { await handleModAction(interaction, 'ban', 'Enter ban reason', 'Ban Reason'); }
async function handleUnmute(interaction) {
  if (!isStaff(interaction.member)) return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Access Denied').setColor(config.colors.error)], ephemeral: true });
  const targetId = getTargetId(interaction);
  const result = require('../systems/moderation').unmute(targetId, interaction.user.id, 'Manual unmute', interaction.guild.id);
  await log(interaction.guild, 'moderation', '🔊 Unmuted', { actor: interaction.user.id, target: targetId, caseId: result.caseId });
  await interaction.reply({ embeds: [new EmbedBuilder().setTitle('✅ Unmuted').setDescription(`User <@${targetId}> unmuted.`).setColor(config.colors.success)], ephemeral: true });
}
async function handleUntimeout(interaction) {
  if (!isStaff(interaction.member)) return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Access Denied').setColor(config.colors.error)], ephemeral: true });
  const targetId = getTargetId(interaction);
  try {
    const member = await interaction.guild.members.fetch(targetId);
    await member.timeout(null);
    const result = require('../systems/moderation').removeTimeout(targetId, interaction.user.id, 'Manual untimeout', interaction.guild.id);
    await log(interaction.guild, 'moderation', '⏰ Untimeout', { actor: interaction.user.id, target: targetId, caseId: result.caseId });
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('✅ Untimeout').setDescription(`User <@${targetId}> timeout removed.`).setColor(config.colors.success)], ephemeral: true });
  } catch (e) {
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription(e.message).setColor(config.colors.error)], ephemeral: true });
  }
}
async function handlePurge(interaction) {
  if (!isStaff(interaction.member)) return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Access Denied').setColor(config.colors.error)], ephemeral: true });
  const modal = new ModalBuilder()
    .setCustomId('purge_modal')
    .setTitle('Purge Messages')
    .addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('count').setLabel('Number of messages (1-100)').setStyle(TextInputStyle.Short).setRequired(true)));
  await interaction.showModal(modal);
}
async function handleCases(interaction) {
  const targetId = getTargetId(interaction);
  if (!targetId || targetId === '') {
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ No Target').setDescription('Specify a user.').setColor(config.colors.error)], ephemeral: true });
  }
  const cases = getUserCases(targetId, 10);
  if (cases.length === 0) {
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('📋 Cases').setDescription('No cases found.').setColor(config.colors.info)], ephemeral: true });
  }
  const fields = cases.map(c => ({ name: c.id, value: `${c.action}\nReason: ${c.reason}\n${formatTimestamp(c.created_at)}`, inline: true }));
  await interaction.reply({ embeds: [new EmbedBuilder().setTitle(`📋 Cases for <@${targetId}>`).setColor(config.colors.moderation).addFields(fields).setTimestamp()], ephemeral: true });
}
async function handleHistory(interaction) {
  const targetId = getTargetId(interaction);
  if (!targetId) return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ No Target').setColor(config.colors.error)], ephemeral: true });
  const cases = getUserCases(targetId, 20);
  const warnings = getWarnings(targetId);
  await interaction.reply({ embeds: [
    new EmbedBuilder()
      .setTitle(`📜 History for <@${targetId}>`)
      .setColor(config.colors.info)
      .addFields(
        { name: 'Total Cases', value: `${cases.length}`, inline: true },
        { name: 'Active Warnings', value: `${warnings.length}`, inline: true },
      )
      .setTimestamp()
  ], ephemeral: true });
}
async function handleSlowmode(interaction) {
  if (!isStaff(interaction.member)) return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Access Denied').setColor(config.colors.error)], ephemeral: true });
  const modal = new ModalBuilder().setCustomId('slowmode_modal').setTitle('Set Slowmode')
    .addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('seconds').setLabel('Slowmode (seconds, 0 to disable)').setStyle(TextInputStyle.Short).setRequired(true)));
  await interaction.showModal(modal);
}
async function handleLock(interaction) {
  if (!isStaff(interaction.member)) return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Access Denied').setColor(config.colors.error)], ephemeral: true });
  try {
    const perms = interaction.channel.permissionOverwrites;
    const everyone = interaction.guild.roles.everyone;
    const current = perms.cache.get(everyone.id);
    const locked = current?.deny?.has('SendMessages');
    await interaction.channel.permissionOverwrites.edit(everyone, { SendMessages: locked });
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle(locked ? '🔓 Channel Unlocked' : '🔒 Channel Locked').setColor(locked ? config.colors.success : config.colors.warning).setTimestamp()], ephemeral: true });
  } catch (e) {
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription(e.message).setColor(config.colors.error)], ephemeral: true });
  }
}

// Modal handlers
module.exports.modals = {
  mod_modal_warn: async (interaction) => {
    const parts = interaction.customId.split('_');
    const targetId = parts[parts.length - 1];
    const reason = interaction.fields.getTextInputValue('reason');
    const result = warn(targetId, interaction.user.id, reason, interaction.guild.id);
    await log(interaction.guild, 'moderation', '⚠️ Warning Issued', { actor: interaction.user.id, target: targetId, reason, caseId: result.caseId });
    await interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('⚠️ Warning Issued').setDescription(`User <@${targetId}> warned.\nCase: ${result.caseId}\nReputation -${result.reputationDecrease}`).setColor(config.colors.moderation).setTimestamp()
    ], ephemeral: true });
  },

  mod_modal_timeout: async (interaction) => {
    const parts = interaction.customId.split('_');
    const targetId = parts[parts.length - 1];
    const duration = interaction.fields.getTextInputValue('duration');
    const reason = interaction.fields.getTextInputValue('reason');
    const { parseDuration } = require('../utils/helpers');
    const ms = parseDuration(duration);
    if (ms <= 0) return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Invalid Duration').setColor(config.colors.error)], ephemeral: true });
    try {
      const member = await interaction.guild.members.fetch(targetId);
      await member.timeout(ms, reason);
      const result = createCase(targetId, interaction.user.id, 'timeout', reason, { duration: ms, guildId: interaction.guild.id });
      await log(interaction.guild, 'moderation', '🔇 Timeout', { actor: interaction.user.id, target: targetId, reason, caseId: result });
      await interaction.reply({ embeds: [new EmbedBuilder().setTitle('🔇 Timeout').setDescription(`User <@${targetId}> timed out for ${duration}.\nCase: ${result}`).setColor(config.colors.moderation).setTimestamp()], ephemeral: true });
    } catch (e) {
      await interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription(e.message).setColor(config.colors.error)], ephemeral: true });
    }
  },

  mod_modal_kick: async (interaction) => {
    const parts = interaction.customId.split('_');
    const targetId = parts[parts.length - 1];
    const reason = interaction.fields.getTextInputValue('reason');
    const result = warn(targetId, interaction.user.id, reason, interaction.guild.id);
    try { await interaction.guild.members.kick(targetId, reason); } catch (e) {}
    await log(interaction.guild, 'moderation', '👢 Kick', { actor: interaction.user.id, target: targetId, reason, caseId: result.caseId });
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('👢 Kicked').setDescription(`User <@${targetId}> kicked.\nCase: ${result.caseId}`).setColor(config.colors.moderation).setTimestamp()], ephemeral: true });
  },

  mod_modal_ban: async (interaction) => {
    const parts = interaction.customId.split('_');
    const targetId = parts[parts.length - 1];
    const reason = interaction.fields.getTextInputValue('reason');
    const result = warn(targetId, interaction.user.id, reason, interaction.guild.id);
    try { await interaction.guild.members.ban(targetId, { reason }); } catch (e) {}
    await log(interaction.guild, 'moderation', '🔨 Ban', { actor: interaction.user.id, target: targetId, reason, caseId: result.caseId });
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('🔨 Banned').setDescription(`User <@${targetId}> banned.\nCase: ${result.caseId}`).setColor(config.colors.moderation).setTimestamp()], ephemeral: true });
  },

  purge_modal: async (interaction) => {
    const count = parseInt(interaction.fields.getTextInputValue('count'));
    if (isNaN(count) || count < 1 || count > 100) return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Invalid Count').setDescription('Enter 1-100.').setColor(config.colors.error)], ephemeral: true });
    try {
      const deleted = await interaction.channel.bulkDelete(count, true);
      await log(interaction.guild, 'moderation', '🧹 Purge', { actor: interaction.user.id, reason: `${deleted.size} messages deleted` });
      await interaction.reply({ embeds: [new EmbedBuilder().setTitle('🧹 Purged').setDescription(`${deleted.size} messages deleted.`).setColor(config.colors.success).setTimestamp()], ephemeral: true });
    } catch (e) {
      await interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription(e.message).setColor(config.colors.error)], ephemeral: true });
    }
  },

  slowmode_modal: async (interaction) => {
    const seconds = parseInt(interaction.fields.getTextInputValue('seconds'));
    if (isNaN(seconds) || seconds < 0 || seconds > 21600) return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Invalid').setDescription('0-21600 seconds.').setColor(config.colors.error)], ephemeral: true });
    await interaction.channel.setRateLimitPerUser(seconds);
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('🐌 Slowmode').setDescription(`Set to ${seconds}s`).setColor(config.colors.success).setTimestamp()], ephemeral: true });
  },
};
