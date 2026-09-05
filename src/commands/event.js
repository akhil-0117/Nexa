const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const { isStaff } = require('../utils/permissions');
const { getDb } = require('../database/init');

// Active events store
const activeEvents = new Map();

function createEventTable() {
  const db = getDb();
  db.exec(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT UNIQUE,
    guild_id TEXT,
    creator_id TEXT,
    title TEXT,
    game_type TEXT,
    prize INTEGER DEFAULT 0,
    max_players INTEGER DEFAULT 10,
    status TEXT DEFAULT 'waiting',
    created_at INTEGER
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS event_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT,
    user_id TEXT,
    role_assigned TEXT,
    joined_at INTEGER
  )`);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('event')
    .setDescription('Create and manage events (Staff only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setTitle('Staff Only').setDescription('You do not have permission to use this.').setColor(config.colors.error)],
        flags: 64,
      });
    }

    createEventTable();

    const divider = '\u2501'.repeat(32);

    const embed = new EmbedBuilder()
      .setTitle('Event Manager')
      .setColor(config.colors.event)
      .setDescription(`${divider}\nCreate and manage server events.\n\nSelect an option below.\n${divider}`)
      .setTimestamp();

    const select = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('event_admin_select')
        .setPlaceholder('Choose an action...')
        .addOptions([
          { label: 'Create Death Note', value: 'create_deathnote', description: 'Kira vs L mystery game' },
          { label: 'Create Trivia', value: 'create_trivia', description: 'Knowledge quiz event' },
          { label: 'Create Tournament', value: 'create_tournament', description: 'Game tournament bracket' },
          { label: 'View Active Events', value: 'view_events', description: 'See ongoing events' },
          { label: 'End Event', value: 'end_event', description: 'End an active event' },
        ])
    );

    await interaction.reply({ embeds: [embed], components: [select] });
  },
};

module.exports.activeEvents = activeEvents;
module.exports.createEventTable = createEventTable;
