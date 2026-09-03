const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        if (command.subcommands) {
          const subName = interaction.options.getSubcommand(false);
          if (subName && command.subcommands[subName]) {
            await command.subcommands[subName].execute(interaction, client);
            return;
          }
        }
        await command.execute(interaction, client);
      } catch (error) {
        console.error(`[CMD] Error executing ${interaction.commandName}:`, error.message);
        const reply = {
          embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription('An error occurred.').setColor(config.colors.error)],
          ephemeral: true,
        };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply).catch(() => {});
        } else {
          await interaction.reply(reply).catch(() => {});
        }
      }
      return;
    }

    // Handle buttons
    if (interaction.isButton()) {
      try {
        const handler = client.buttons.get(interaction.customId) || findDynamicHandler(client.buttons, interaction.customId);
        if (handler) {
          await handler(interaction, client);
        } else {
          // Unknown button
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ embeds: [
              new EmbedBuilder().setTitle('⚠️ Expired').setDescription('This button is no longer active. Use the command again.').setColor(config.colors.warning)
            ], ephemeral: true }).catch(() => {});
          }
        }
      } catch (error) {
        console.error(`[BTN] Error with ${interaction.customId}:`, error.message);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ embeds: [
            new EmbedBuilder().setTitle('❌ Error').setDescription('An error occurred.').setColor(config.colors.error)
          ], ephemeral: true }).catch(() => {});
        }
      }
      return;
    }

    // Handle select menus
    if (interaction.isStringSelectMenu() || interaction.isUserSelectMenu() || interaction.isRoleSelectMenu()) {
      const id = interaction.customId;

      // Registered component handlers first
      try {
        const handler = client.selectMenus.get(id) || findDynamicHandler(client.selectMenus, id);
        if (handler) {
          await handler(interaction, client);
          return;
        }
      } catch (error) {
        console.error(`[SELECT] Error with ${id}:`, error.message);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ embeds: [
            new EmbedBuilder().setTitle('❌ Error').setDescription('An error occurred.').setColor(config.colors.error)
          ], ephemeral: true }).catch(() => {});
        }
        return;
      }

      // Built-in select menus
      try {
        if (id === 'staff_panel_select') { await handleStaffPanelSelect(interaction); return; }
        if (id === 'help_category_select') { await handleHelpCategorySelect(interaction); return; }
        if (id === 'config_select') { await handleConfigSelect(interaction); return; }
        if (id === 'shop_select_item') { await handleShopSelect(interaction); return; }

        await interaction.reply({ embeds: [
          new EmbedBuilder().setTitle('⚠️ Expired').setDescription('This menu is no longer active. Use the command again.').setColor(config.colors.warning)
        ], ephemeral: true }).catch(() => {});
      } catch (error) {
        console.error(`[SELECT] Error routing ${id}:`, error.message);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ embeds: [
            new EmbedBuilder().setTitle('❌ Error').setDescription('An error occurred.').setColor(config.colors.error)
          ], ephemeral: true }).catch(() => {});
        }
      }
      return;
    }

    // Handle modals
    if (interaction.isModalSubmit()) {
      const id = interaction.customId;

      // Security: Transfer modal only for the owner
      if (id.startsWith('transfer_modal_')) {
        const modalOwnerId = id.split('_')[2];
        if (modalOwnerId !== interaction.user.id) {
          return interaction.reply({ embeds: [
            new EmbedBuilder().setTitle('🔒 Not Your Panel').setDescription('This is not your transfer panel.').setColor(config.colors.error)
          ], ephemeral: true });
        }
        // Handle transfer
        await handleTransferModal(interaction);
        return;
      }

      const handler = client.modals.get(id) || findDynamicHandler(client.modals, id);
      if (handler) {
        try {
          await handler(interaction, client);
        } catch (error) {
          console.error(`[MODAL] Error with ${id}:`, error.message);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ embeds: [
              new EmbedBuilder().setTitle('❌ Error').setDescription('An error occurred.').setColor(config.colors.error)
            ], ephemeral: true }).catch(() => {});
          }
        }
      }
      return;
    }
  },
};

function findDynamicHandler(collection, id) {
  for (const [key, handler] of collection.entries()) {
    if (key.includes('*')) {
      const prefix = key.replace('*', '');
      if (id.startsWith(prefix)) return handler;
    }
  }
  return null;
}

async function handleStaffPanelSelect(interaction) {
  const { isStaff, getStaffRole } = require('../utils/permissions');
  if (!isStaff(interaction.member)) {
    return interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('🔒 Staff Only').setColor(config.colors.error)
    ], ephemeral: true });
  }

  const category = interaction.values[0];
  const panels = {
    moderation: { title: '🛡️ Moderation', description: 'Use `/moderation` to access moderation tools.' },
    cases: { title: '📋 Cases', description: 'Use `/moderation` and select View Cases.' },
    reports: { title: '🚨 Reports', description: 'Report management coming soon.' },
    tickets: { title: '🎫 Tickets', description: 'Ticket management coming soon.' },
    security: { title: '🔒 Security', description: 'Security controls coming soon.' },
    economy: { title: '💰 Economy', description: 'Economy management coming soon.' },
    applications: { title: '📋 Applications', description: 'Application management coming soon.' },
    logs: { title: '📜 Logs', description: 'Log viewer coming soon.' },
  };

  const panel = panels[category] || { title: category, description: 'Coming soon.' };
  const embed = new EmbedBuilder().setTitle(panel.title).setDescription(panel.description).setColor(config.colors.staff).setTimestamp();
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleHelpCategorySelect(interaction) {
  const category = interaction.values[0];
  const categories = {
    general: { title: '📖 General', fields: ['/account — Profile & wallet\n/games — Games arcade\n/shop — Credit shop\n/stats — Server stats'] },
    moderation: { title: '🛡️ Moderation', fields: ['/moderation — Mod panel (Staff)\n/staff — Staff panel (Staff)'] },
    staff: { title: '👨‍💼 Staff', fields: ['/staff — Staff panel\n/moderation — Mod tools\n/config — Server config (Admin)'] },
    utility: { title: '⚙️ Utility', fields: ['/ping — Bot latency\n/botinfo — Bot info\n/serverinfo — Server info\n/verify — Verify account\n/poll — Create polls'] },
    social: { title: '🤝 Social', fields: ['/account — Achievements, invites\n/stats — Server statistics'] },
  };
  const cat = categories[category] || { title: category, fields: ['No commands listed.'] };
  const embed = new EmbedBuilder().setTitle(cat.title).setDescription(cat.fields.join('\n')).setColor(config.colors.info).setTimestamp();
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleConfigSelect(interaction) {
  const { isAdmin } = require('../utils/permissions');
  if (!isAdmin(interaction.member)) {
    return interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('🔒 Admin Only').setColor(config.colors.error)
    ], ephemeral: true });
  }
  const category = interaction.values[0];
  const embed = new EmbedBuilder().setTitle(`⚙️ ${category}`).setDescription('Configuration panel coming soon.').setColor(config.colors.staff).setTimestamp();
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleShopSelect(interaction) {
  const { purchaseItem } = require('../systems/shop');
  const itemId = interaction.values[0];
  const result = purchaseItem(interaction.user.id, itemId, interaction.guild.id);
  if (result.success) {
    await interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('✅ Purchased').setDescription(`You bought **${result.item.name}**!`).setColor(config.colors.success)
    ], ephemeral: true });
  } else {
    await interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('❌ Failed').setDescription(result.reason).setColor(config.colors.error)
    ], ephemeral: true });
  }
}

async function handleTransferModal(interaction) {
  const { getUser, getBalance, transfer } = require('../systems/economy');
  const { log } = require('../systems/logging');

  const recipientId = interaction.fields.getTextInputValue('recipient');
  const amount = parseInt(interaction.fields.getTextInputValue('amount'));

  if (isNaN(amount) || amount <= 0) {
    return interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('❌ Invalid Amount').setDescription('Enter a positive number.').setColor(config.colors.error)
    ], ephemeral: true });
  }

  if (recipientId === interaction.user.id) {
    return interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('❌ Self-Transfer').setDescription('Cannot transfer to yourself.').setColor(config.colors.error)
    ], ephemeral: true });
  }

  const balance = getBalance(interaction.user.id, interaction.guild.id);
  if (balance < amount) {
    return interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('❌ Insufficient Funds').setDescription(`Balance: ${balance} Credits`).setColor(config.colors.error)
    ], ephemeral: true });
  }

  // Ensure recipient exists in DB
  const { getDb } = require('../database/init');
  const db = getDb();
  db.prepare('INSERT OR IGNORE INTO users (user_id, guild_id, username, created_at) VALUES (?, ?, ?, ?)').run(recipientId, interaction.guild.id, 'Unknown', Date.now());

  const result = transfer(interaction.user.id, recipientId, amount, interaction.guild.id);
  if (result.success) {
    await log(interaction.guild, 'economy', '💸 Transfer', { actor: interaction.user.id, target: recipientId, amount, reason: result.transactionId });
    await interaction.reply({ embeds: [
      new EmbedBuilder()
        .setTitle('💸 Transfer Complete')
        .setDescription(`Sent **${amount} Credits** to <@${recipientId}>\nFee: ${result.fee || 0} Credits\nTransaction: ${result.transactionId}`)
        .addFields({ name: 'Your Balance', value: `${result.senderBalance} Credits`, inline: true })
        .setColor(config.colors.success).setTimestamp()
    ], ephemeral: true });
  } else {
    await interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('❌ Transfer Failed').setDescription(result.reason).setColor(config.colors.error)
    ], ephemeral: true });
  }
}
