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
    console.log(`[DEPLOY] Commands: ${commands.map(c => '/' + c.name).join(', ')}`);

    if (config.guildId) {
      // Delete ALL existing guild commands in batches (API limit)
      let existing = [];
      try {
        existing = await rest.get(Routes.applicationGuildCommands(config.clientId, config.guildId));
      } catch (e) {
        console.log('[DEPLOY] Could not fetch existing commands, proceeding...');
      }

      if (existing.length > 0) {
        console.log(`[DEPLOY] Found ${existing.length} old commands, deleting ALL...`);

        // Delete in batches of 10 (API allows batch delete)
        for (let i = 0; i < existing.length; i += 10) {
          const batch = existing.slice(i, i + 10);
          try {
            await rest.put(
              Routes.applicationGuildCommands(config.clientId, config.guildId),
              { body: [] }
            );
          } catch (e) {
            // Fallback: delete one by one
            for (const cmd of batch) {
              try {
                await rest.delete(Routes.applicationGuildCommand(config.clientId, config.guildId, cmd.id));
              } catch (delErr) {
                console.log(`[DEPLOY] Could not delete ${cmd.name}: ${delErr.message}`);
              }
            }
          }
          console.log(`[DEPLOY] Deleted batch ${Math.floor(i/10)+1}/${Math.ceil(existing.length/10)}`);
        }

        console.log('[DEPLOY] All old commands deleted.');
      }

      // Now register fresh commands
      await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });
      console.log(`[DEPLOY] Registered ${commands.length} commands to guild ${config.guildId}`);
    } else {
      // Global commands
      let existing = [];
      try {
        existing = await rest.get(Routes.applicationCommands(config.clientId));
      } catch (e) {}

      if (existing.length > 0) {
        console.log(`[DEPLOY] Found ${existing.length} old global commands, deleting ALL...`);
        // Overwrite with empty array to clear all
        await rest.put(Routes.applicationCommands(config.clientId), { body: [] });
        console.log('[DEPLOY] Old global commands deleted.');
      }

      await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
      console.log(`[DEPLOY] Registered ${commands.length} global commands`);
    }

    console.log('[DEPLOY] Done! Restart the bot to use new commands.');
  } catch (error) {
    console.error('[DEPLOY] Error:', error.message || error);
    process.exit(1);
  }
})();
