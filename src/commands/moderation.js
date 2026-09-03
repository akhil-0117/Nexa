const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { isStaff, getStaffRole } = require('../utils/permissions');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moderation')
    .setDescription('Open the Moderation Panel (Staff only)')
    .addUserOption(opt => opt.setName('target').setDescription('Target member (optional)').setRequired(false)),

  async execute(interaction) {
    const { member } = interaction;

    if (!isStaff(member)) {
      return interaction.reply({ embeds: [
        new EmbedBuilder().setTitle('❌ Access Denied').setDescription('You need staff permissions to use this.').setColor(config.colors.error)
      ], ephemeral: true });
    }

    const staffRole = getStaffRole(member);
    const target = interaction.options.getMember('target');

    const embed = new EmbedBuilder()
      .setTitle('🛡️ NEXAVERSE Moderation Panel')
      .setColor(config.colors.moderation)
      .setDescription(`Staff Level: **${staffRole?.label || 'Staff'}**\n${target ? `Target: **${target.user.username}**` : 'Select a target member to moderate.'}`)
      .addFields(
        { name: '⚠️ Warn', value: 'Issue a warning', inline: true },
        { name: '🔇 Timeout', value: 'Timeout a member', inline: true },
        { name: '👢 Kick', value: 'Kick a member', inline: true },
        { name: '🔨 Ban', value: 'Ban a member', inline: true },
        { name: '🔇 Mute', value: 'Mute a member', inline: true },
        { name: '🧹 Purge', value: 'Delete messages', inline: true },
      )
      .setFooter({ text: 'NEXAVERSE Moderation • All actions are logged' })
      .setTimestamp();

    const targetId = target?.id || '';

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`mod_warn_${targetId}`).setLabel('Warn').setStyle(ButtonStyle.Danger).setEmoji('⚠️'),
      new ButtonBuilder().setCustomId(`mod_timeout_${targetId}`).setLabel('Timeout').setStyle(ButtonStyle.Danger).setEmoji('🔇'),
      new ButtonBuilder().setCustomId(`mod_kick_${targetId}`).setLabel('Kick').setStyle(ButtonStyle.Danger).setEmoji('👢'),
      new ButtonBuilder().setCustomId(`mod_ban_${targetId}`).setLabel('Ban').setStyle(ButtonStyle.Danger).setEmoji('🔨'),
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`mod_mute_${targetId}`).setLabel('Mute').setStyle(ButtonStyle.Secondary).setEmoji('🔇'),
      new ButtonBuilder().setCustomId(`mod_unmute_${targetId}`).setLabel('Unmute').setStyle(ButtonStyle.Secondary).setEmoji('🔊'),
      new ButtonBuilder().setCustomId(`mod_untimeout_${targetId}`).setLabel('Untimeout').setStyle(ButtonStyle.Secondary).setEmoji('⏰'),
      new ButtonBuilder().setCustomId(`mod_purge_${targetId}`).setLabel('Purge').setStyle(ButtonStyle.Secondary).setEmoji('🧹'),
    );

    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`mod_cases_${targetId}`).setLabel('Cases').setStyle(ButtonStyle.Primary).setEmoji('📋'),
      new ButtonBuilder().setCustomId(`mod_history_${targetId}`).setLabel('History').setStyle(ButtonStyle.Primary).setEmoji('📜'),
      new ButtonBuilder().setCustomId(`mod_slowmode`).setLabel('Slowmode').setStyle(ButtonStyle.Secondary).setEmoji('🐌'),
      new ButtonBuilder().setCustomId(`mod_lock`).setLabel('Lock').setStyle(ButtonStyle.Secondary).setEmoji('🔒'),
    );

    await interaction.reply({ embeds: [embed], components: [row, row2, row3], ephemeral: true });
  },
};
