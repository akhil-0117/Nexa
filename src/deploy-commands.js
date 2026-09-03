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
}

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    console.log(`[DEPLOY] Registering ${commands.length} commands...`);

    if (config.guildId) {
      // First delete all existing guild commands
      const existing = await rest.get(Routes.applicationGuildCommands(config.clientId, config.guildId));
      console.log(`[DEPLOY] Found ${existing.length} existing commands, deleting...`);
      for (const cmd of existing) {
        await rest.delete(Routes.applicationGuildCommand(config.clientId, config.guildId, cmd.id));
      }
      console.log('[DEPLOY] Old commands deleted.');

      // Register new commands
      await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });
      console.log(`[DEPLOY] Registered ${commands.length} guild commands to ${config.guildId}`);
    } else {
      // Global: delete all existing then register
      const existing = await rest.get(Routes.applicationCommands(config.clientId));
      console.log(`[DEPLOY] Found ${existing.length} existing commands, deleting...`);
      for (const cmd of existing) {
        await rest.delete(Routes.applicationCommand(config.clientId, cmd.id));
      }

      await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
      console.log(`[DEPLOY] Registered ${commands.length} global commands`);
    }

    console.log('[DEPLOY] Done!');
  } catch (error) {
    console.error('[DEPLOY] Error:', error);
  }
})();
