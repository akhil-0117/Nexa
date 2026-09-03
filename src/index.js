const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const { initDatabase } = require('./database/init');
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

// Initialize database
initDatabase();

// Load commands
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

// Load event handlers
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

// Load components (buttons, selects, modals)
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

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('[ERROR] Unhandled promise rejection:', error.message || error);
});

process.on('uncaughtException', (error) => {
  console.error('[ERROR] Uncaught exception:', error.message || error);
});

// Login
client.login(config.token).catch(err => {
  console.error('[FATAL] Failed to login:', err.message);
  process.exit(1);
});

module.exports = client;
