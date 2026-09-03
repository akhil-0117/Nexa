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

module.exports = { getStaffLevel, getStaffRole, isStaff, hasPermission, canModerate, getPermLabel, isAdmin, getMemberRoleName };
