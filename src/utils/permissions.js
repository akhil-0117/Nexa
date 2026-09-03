const config = require('../config');

function getStaffLevel(member) {
  if (!member || !member.roles) return 0;
  for (const staff of config.staffHierarchy) {
    if (member.roles.cache.some(r => r.name === staff.name || r.id === staff.name)) {
      return staff.level;
    }
  }
  return 0;
}

function getStaffRole(member) {
  if (!member || !member.roles) return null;
  for (const staff of config.staffHierarchy) {
    if (member.roles.cache.some(r => r.name === staff.name || r.id === staff.name)) {
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

module.exports = { getStaffLevel, getStaffRole, isStaff, hasPermission, canModerate, getPermLabel, isAdmin };
