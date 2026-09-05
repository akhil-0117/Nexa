const { Client, GatewayIntentBits, Collection, Partials, ActivityType, EmbedBuilder } = require('discord.js');
const { initDatabase, getDb } = require('./database/init');
const config = require('./config');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember, Partials.User],
});

client.commands = new Collection();
client.buttons = new Collection();
client.selectMenus = new Collection();
client.modals = new Collection();
client.cooldowns = new Collection();

const START_TIME = Date.now();
const processStartTime = process.hrtime.bigint();

// ===== STATUS CHANNEL HELPERS =====

async function postStatus(client, status, details = '') {
  if (!config.statusChannelId) return;
  try {
    const channel = await client.channels.fetch(config.statusChannelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const statusMeta = {
      online: { title: 'NEXAVERSE Online', color: '#2ecc71', desc: 'Bot is running and connected.' },
      offline: { title: 'NEXAVERSE Offline', color: '#e74c3c', desc: 'Bot is shutting down.' },
      crash: { title: 'NEXAVERSE Crashed', color: '#e74c3c', desc: 'Bot encountered a fatal error and stopped.' },
      restart: { title: 'NEXAVERSE Restarting', color: '#f39c12', desc: 'Bot is restarting.' },
    };

    const meta = statusMeta[status] || statusMeta.online;
    const uptimeMs = Date.now() - START_TIME;
    const hours = Math.floor(uptimeMs / 3600000);
    const minutes = Math.floor((uptimeMs % 3600000) / 60000);
    const uptimeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    const embed = new EmbedBuilder()
      .setTitle(meta.title)
      .setColor(meta.color)
      .setDescription(
        `${'\u2501'.repeat(32)}\n` +
        `${meta.desc}\n` +
        (details ? `${details}\n` : '') +
        (status === 'online' ? `**Uptime** Last session: ${uptimeStr}\n` : '') +
        `**Time** <t:${Math.floor(Date.now() / 1000)}:F>\n` +
        `${'\u2501'.repeat(32)}`
      )
      .setFooter({ text: `NEXAVERSE \u00b7 ${status.toUpperCase()}` })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch (e) {
    console.error('[STATUS] Failed to post status:', e.message);
  }
}

// ===== DATABASE =====
initDatabase();

// ===== COMMAND LOADING =====
const fs = require('fs');
const path = require('path');

const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
  for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if (command.data && command.data.name) {
      client.commands.set(command.data.name, command);
      console.log(`[CMD] Loaded: /${command.data.name}`);
    }
  }
}

// ===== EVENT LOADING =====
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));
  for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
    console.log(`[EVT] Loaded: ${event.name}`);
  }
}

// ===== COMPONENT LOADING =====
const componentsPath = path.join(__dirname, 'components');
if (fs.existsSync(componentsPath)) {
  const componentFiles = fs.readdirSync(componentsPath).filter(f => f.endsWith('.js'));
  for (const file of componentFiles) {
    const component = require(path.join(componentsPath, file));
    if (component.buttons) {
      for (const [id, handler] of Object.entries(component.buttons)) {
        client.buttons.set(id, handler);
      }
    }
    if (component.selectMenus) {
      for (const [id, handler] of Object.entries(component.selectMenus)) {
        client.selectMenus.set(id, handler);
      }
    }
    if (component.modals) {
      for (const [id, handler] of Object.entries(component.modals)) {
        client.modals.set(id, handler);
      }
    }
    console.log(`[COMP] Loaded: ${file}`);
  }
}

// ===== ERROR HANDLING =====
let crashReported = false;

process.on('unhandledRejection', (error) => {
  console.error('[ERROR] Unhandled promise rejection:', error.message || error);
  if (client.isReady() && !crashReported && error instanceof Error && error.message?.includes('FATAL')) {
    crashReported = true;
    postStatus(client, 'crash', `**Error** ${error.message}`.substring(0, 500));
  }
});

process.on('uncaughtException', (error) => {
  console.error('[ERROR] Uncaught exception:', error.message || error);
  if (client.isReady() && !crashReported) {
    crashReported = true;
    postStatus(client, 'crash', `**Error** ${(error.message || 'unknown').substring(0, 500)}`).finally(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// ===== LOGIN =====
client.login(config.token).then(() => {
  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`[SHUTDOWN] Received ${signal}`);
    try {
      if (client.isReady()) {
        await postStatus(client, 'offline', `**Reason** ${signal} received`);
      }
    } catch (e) {}
    client.destroy();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}).catch(err => {
  console.error('[FATAL] Failed to login:', err.message);
  process.exit(1);
});

// ===== READY: post online status =====
client.once('ready', async () => {
  const guildCount = client.guilds.cache.size;
  await postStatus(client, 'online', `**Servers** ${guildCount}  \u00b7  **Commands** ${client.commands.size}`);
});

// ===== READY: rotating presence =====
const PRESENCES = [
  { name: 'NEXAVERSE | /help', type: ActivityType.Watching },
  { name: 'the arcade | /games', type: ActivityType.Playing },
  { name: 'over the economy | /wallet', type: ActivityType.Watching },
  { name: 'for new members | /verify', type: ActivityType.Listening },
];

client.once('ready', () => {
  let idx = 0;
  client.user.setPresence({
    activities: [PRESENCES[0]],
    status: 'online',
  });
  setInterval(() => {
    idx = (idx + 1) % PRESENCES.length;
    client.user.setPresence({ activities: [PRESENCES[idx]], status: 'online' });
  }, 60 * 1000); // rotate every minute
});

module.exports = client;
