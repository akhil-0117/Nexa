const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data && command.data.toJSON) {
    commands.push(command.data.toJSON());
  }
  // Register subcommands from utility.js
  if (command.subcommands) {
    for (const [name, sub] of Object.entries(command.subcommands)) {
      if (sub.data && sub.data.toJSON) {
        commands.push(sub.data.toJSON());
      }
    }
  }
}

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    console.log(`[DEPLOY] Registering ${commands.length} commands...`);

    if (config.guildId) {
      await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });
      console.log(`[DEPLOY] Registered ${commands.length} guild commands to guild ${config.guildId}`);
    } else {
      await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
      console.log(`[DEPLOY] Registered ${commands.length} global commands`);
    }

    console.log('[DEPLOY] Done!');
  } catch (error) {
    console.error('[DEPLOY] Error:', error);
  }
})();
