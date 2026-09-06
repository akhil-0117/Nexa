const config = require('../config');

function getStaffLevel(member) {
  if (!member || !member.roles) return 0;
  // Check by role ID first (env-configured)
  for (const staff of config.staffHierarchy) {
    const roleId = config.roleIds[staff.roleIdKey];
    if (roleId && member.roles.cache.has(roleId)) {
      return staff.level;
    }
  }
  // Fallback: check by role name
  for (const staff of config.staffHierarchy) {
    if (member.roles.cache.some(r => r.name === staff.name)) {
      return staff.level;
    }
  }
  return 0;
}

function getStaffRole(member) {
  if (!member || !member.roles) return null;
  // Check by role ID first
  for (const staff of config.staffHierarchy) {
    const roleId = config.roleIds[staff.roleIdKey];
    if (roleId && member.roles.cache.has(roleId)) {
      return staff;
    }
  }
  // Fallback: check by role name
  for (const staff of config.staffHierarchy) {
    if (member.roles.cache.some(r => r.name === staff.name)) {
      return staff;
    }
  }
  return null;
}

function isStaff(member) {
  return getStaffLevel(member) > 0;
}

function hasPermission(member, requiredLevel) {
  return getStaffLevel(member) >= requiredLevel;
}

function canModerate(moderator, target) {
  const modLevel = getStaffLevel(moderator);
  if (modLevel === 0) return false;
  const targetLevel = getStaffLevel(target);
  return modLevel > targetLevel;
}

function getPermLabel(level) {
  for (const staff of config.staffHierarchy) {
    if (staff.level === level) return staff.label;
  }
  return 'None';
}

function isAdmin(member) {
  if (!member) return false;
  return member.permissions?.has('Administrator') || getStaffLevel(member) >= 5;
}

// Get the role name display for a member (what role they have from the configured list)
function getMemberRoleName(member) {
  const role = getStaffRole(member);
  if (role) return role.label;

  // Check if they have verified role
  if (config.roleIds.verified && member.roles.cache.has(config.roleIds.verified)) {
    return 'Verified';
  }

  return 'Member';
}

// Staff permission levels — what each staff level can do
const STAFF_ACTIONS = {
  warn:        1, // Trial Moderator+
  view_cases:  1, // Trial Moderator+
  kick:        2, // Moderator+
  timeout:     2, // Moderator+
  untimeout:   2, // Moderator+
  ban:         3, // Senior Moderator+
  unban:       3, // Senior Moderator+
  mute:        2, // Moderator+
  unmute:      2, // Moderator+
  purge:       3, // Senior Moderator+
  slowmode:    3, // Senior Moderator+
  reputation:  3, // Senior Moderator+
  handle_reports: 4, // Head of Staff+
  manage_tickets: 4, // Head of Staff+
  close_tickets:  4, // Head of Staff+
  credits_manager: 4, // Head of Staff+
  config:      5, // President/Co-President
  manage_staff: 5, // President/Co-President
};

/** Check if a member can perform a specific action */
function canPerformAction(member, action) {
  const level = getStaffLevel(member);
  const required = STAFF_ACTIONS[action];
  if (!required) return true; // Unrestricted action
  return level >= required;
}

/** Get a summary of what a staff member can and cannot do */
function getStaffPermissions(member) {
  const level = getStaffLevel(member);
  const allowed = [];
  const denied = [];
  for (const [action, reqLevel] of Object.entries(STAFF_ACTIONS)) {
    if (level >= reqLevel) allowed.push(action);
    else denied.push({ action, required: getPermLabel(reqLevel) });
  }
  return { level, label: getPermLabel(level), allowed, denied };
}

/** Check if member can handle/manage reports (Head of Staff+) */
function isHigherOfficial(member) {
  return getStaffLevel(member) >= 4;
}

module.exports = { getStaffLevel, getStaffRole, isStaff, hasPermission, canModerate, getPermLabel, isAdmin, getMemberRoleName, canPerformAction, getStaffPermissions, isHigherOfficial, STAFF_ACTIONS };
