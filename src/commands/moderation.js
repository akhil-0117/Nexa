const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { isStaff, getStaffRole } = require('../utils/permissions');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moderation')
    .setDescription('Open the Moderation Panel (Staff only)')
    .addUserOption(opt => opt.setName('target').setDescription('Target member').setRequired(false)),

  async execute(interaction) {
    const { member } = interaction;

    if (!isStaff(member)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setTitle('🔒 Access Denied').setDescription('Staff permissions required.').setColor(config.colors.error)],
        ephemeral: true,
      });
    }

    const staffRole = getStaffRole(member);
    const target = interaction.options.getMember('target');
    const targetLabel = target ? `${target.user.username} (${target.id})` : 'None selected';

    const embed = new EmbedBuilder()
      .setTitle('🛡️ Moderation Panel')
      .setColor(config.colors.moderation)
      .setDescription(`**Your Level:** ${staffRole?.label || 'Staff'}\n**Target:** ${targetLabel}`)
      .addFields(
        { name: '⚠️ Warn', value: 'Issue a warning', inline: true },
        { name: '🔇 Timeout', value: 'Timeout a member', inline: true },
        { name: '👢 Kick', value: 'Kick a member', inline: true },
        { name: '🔨 Ban', value: 'Ban a member', inline: true },
        { name: '🔊 Unmute', value: 'Remove mute', inline: true },
        { name: '⏰ Untimeout', value: 'Remove timeout', inline: true },
        { name: '🧹 Purge', value: 'Delete messages', inline: true },
        { name: '🔒 Lock/Unlock', value: 'Toggle channel lock', inline: true },
        { name: '🐌 Slowmode', value: 'Set channel slowmode', inline: true },
        { name: '📋 Cases', value: 'View user cases', inline: true },
      )
      .setFooter({ text: 'All actions are logged • Select an action below' })
      .setTimestamp();

    // Store target ID in the menu custom data
    const targetId = target?.id || 'none';

    const select = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`mod_select_${targetId}`)
        .setPlaceholder('Choose a moderation action...')
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
          { label: 'View Cases', value: 'cases', emoji: '📋', description: 'View moderation cases' },
        ])
    );

    await interaction.reply({ embeds: [embed], components: [select], ephemeral: true });
  },
};
