const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const config = require('../config');
const { isStaff, getStaffRole } = require('../utils/permissions');

module.exports = {
  selectMenus: {},
  buttons: {},
  modals: {},
};

// Mod action select handlers are registered dynamically via interactionCreate
// This file provides helper functions for moderation actions

function canPerformAction(staffMember, action, targetMember) {
  const staffRole = getStaffRole(staffMember);
  const targetRole = getStaffRole(targetMember);

  if (!staffRole) return { allowed: false, error: 'No staff role found.' };

  // Cannot moderate someone of equal or higher rank
  if (targetRole && targetRole.level >= staffRole.level) {
    return { allowed: false, error: `Cannot moderate a ${targetRole.label}. They are equal or higher rank.` };
  }

  return { allowed: true, staffRole };
}

function divider() {
  return '\u2501'.repeat(32);
}

module.exports.canPerformAction = canPerformAction;
module.exports.divider = divider;
