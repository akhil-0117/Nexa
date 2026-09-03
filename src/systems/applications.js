const { getDb } = require('../database/init');
const { generateStaffAppId } = require('../utils/helpers');

function createApplication(guildId, userId, data) {
  const db = getDb();
  const id = generateStaffAppId();
  db.prepare(`INSERT INTO staff_applications (id, guild_id, user_id, experience, activity, timezone, motivation, situational, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, guildId, userId, data.experience || '', data.activity || '', data.timezone || '',
    data.motivation || '', data.situational || '', 'pending', Date.now()
  );
  return { id };
}

function getApplication(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM staff_applications WHERE id = ?').get(id);
}

function getPendingApplications(guildId) {
  const db = getDb();
  return db.prepare('SELECT * FROM staff_applications WHERE guild_id = ? AND status = ? ORDER BY created_at DESC').all(guildId, 'pending');
}

function acceptApplication(id, staffId) {
  const db = getDb();
  db.prepare('UPDATE staff_applications SET reviewed_by = ?, status = ? WHERE id = ?').run(staffId, 'accepted', id);
  return { success: true };
}

function rejectApplication(id, staffId) {
  const db = getDb();
  db.prepare('UPDATE staff_applications SET reviewed_by = ?, status = ? WHERE id = ?').run(staffId, 'rejected', id);
  return { success: true };
}

module.exports = { createApplication, getApplication, getPendingApplications, acceptApplication, rejectApplication };
