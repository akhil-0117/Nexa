const { getDb } = require('../database/init');
const { generateId } = require('../utils/helpers');
const { getUser, createTransaction, updateBalance, getBalance } = require('./economy');

function createItem(guildId, data) {
  const db = getDb();
  const id = generateId('ITEM');
  db.prepare(`INSERT INTO shop_items (id, guild_id, name, description, category, price, stock, role_id, emoji, active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, guildId, data.name, data.description || '', data.category || 'roles',
    data.price, data.stock ?? -1, data.roleId || '', data.emoji || '🎁', 1, Date.now()
  );
  return { id };
}

function getItem(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM shop_items WHERE id = ?').get(id);
}

function getItems(guildId, category = null) {
  const db = getDb();
  if (category) {
    return db.prepare('SELECT * FROM shop_items WHERE guild_id = ? AND category = ? AND active = 1 ORDER BY price ASC').all(guildId, category);
  }
  return db.prepare('SELECT * FROM shop_items WHERE guild_id = ? AND active = 1 ORDER BY category, price ASC').all(guildId);
}

function purchaseItem(userId, itemId, guildId) {
  const db = getDb();
  const item = getItem(itemId);
  if (!item) return { success: false, reason: 'Item not found' };
  if (!item.active) return { success: false, reason: 'Item no longer available' };
  if (item.stock === 0) return { success: false, reason: 'Out of stock' };

  const balance = getBalance(userId, guildId);
  if (balance < item.price) return { success: false, reason: `Insufficient balance. Need ${item.price}` };

  updateBalance(userId, -item.price, guildId);
  createTransaction(userId, -item.price, 'shop_purchase', { description: `Purchased: ${item.name}` });

  if (item.stock > 0) {
    db.prepare('UPDATE shop_items SET stock = stock - 1 WHERE id = ?').run(itemId);
  }

  return { success: true, item };
}

function removeItem(id) {
  const db = getDb();
  db.prepare('UPDATE shop_items SET active = 0 WHERE id = ?').run(id);
  return { success: true };
}

module.exports = { createItem, getItem, getItems, purchaseItem, removeItem };
