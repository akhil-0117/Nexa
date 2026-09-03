const { getDb } = require('../database/init');
const config = require('../config');

function getAchievements(userId, guildId = '0') {
  const db = getDb();
  const user = db.prepare('SELECT achievements FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  if (!user) return [];
  try { return JSON.parse(user.achievements); } catch { return []; }
}

function hasAchievement(userId, achievementId, guildId = '0') {
  return getAchievements(userId, guildId).includes(achievementId);
}

function awardAchievement(userId, achievementId, guildId = '0') {
  if (hasAchievement(userId, achievementId, guildId)) return false;

  const db = getDb();
  const current = getAchievements(userId, guildId);
  current.push(achievementId);
  db.prepare('UPDATE users SET achievements = ?, updated_at = ? WHERE user_id = ? AND guild_id = ?')
    .run(JSON.stringify(current), Date.now(), userId, guildId);

  const achievement = config.achievements.find(a => a.id === achievementId);
  return achievement || { id: achievementId };
}

function checkAchievements(userId, userStats, guildId = '0') {
  const awarded = [];
  for (const achievement of config.achievements) {
    if (hasAchievement(userId, achievement.id, guildId)) continue;
    const { type, count } = achievement.requirement;
    const statValue = userStats[type] || 0;
    if (statValue >= count) {
      const result = awardAchievement(userId, achievement.id, guildId);
      if (result) awarded.push(achievement);
    }
  }
  return awarded;
}

function getAllAchievements() {
  return config.achievements;
}

module.exports = { getAchievements, hasAchievement, awardAchievement, checkAchievements, getAllAchievements };
