const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
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
        const id = interaction.customId;

        // Verify buttons
        if (id === 'verify_confirm') {
          await handleVerifyButton(interaction, client);
          return;
        }
        if (id.startsWith('verify_final_')) {
          await handleVerifyFinal(interaction);
          return;
        }
        if (id === 'verify_cancel') {
          await handleVerifyCancel(interaction);
          return;
        }

        // Back button for moderation user select
        if (id === 'mod_back_to_select') {
          await handleModBackToSelect(interaction);
          return;
        }

        // Games back button
        if (id === 'nav_games_back') {
          // Re-show games panel
          const { getUser } = require('../systems/economy');
          const { getRepInfo } = require('../systems/reputation');
          const { formatCredits, getEffectiveMaxBet } = require('../utils/helpers');

          const userData = getUser(interaction.user.id, interaction.guild.id);
          const repInfo = getRepInfo(interaction.user.id, interaction.guild.id);
          const maxBet = getEffectiveMaxBet(userData.reputation);

          const embed = new EmbedBuilder()
            .setTitle('🎮 NEXAVERSE Games')
            .setColor(config.colors.game)
            .setDescription(`**Balance:** ${formatCredits(userData.credits)}\n**Max Bet:** ${formatCredits(maxBet)}\n**Reputation:** ${repInfo.score} · ${repInfo.level.label}`)
            .addFields(
              { name: '🎰 Roulette', value: 'Red, black, green, or number (up to 35x)', inline: true },
              { name: '🪙 Coinflip', value: 'Heads or tails, 2x payout', inline: true },
              { name: '🃏 Blackjack', value: 'Beat the dealer to 21', inline: true },
              { name: '🎰 Slots', value: 'Spin to win big', inline: true },
              { name: '🎲 Dice', value: 'Predict 1-6', inline: true },
              { name: '📊 Higher/Lower', value: 'Guess the next number', inline: true },
              { name: '✊ RPS', value: 'Classic Rock Paper Scissors', inline: true },
            )
            .setFooter({ text: 'Select a game below' })
            .setTimestamp();

          const select = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('game_select')
              .setPlaceholder('Choose a game...')
              .addOptions([
                { label: 'Roulette', value: 'roulette', emoji: '🎰' },
                { label: 'Coinflip', value: 'coinflip', emoji: '🪙' },
                { label: 'Blackjack', value: 'blackjack', emoji: '🃏' },
                { label: 'Slots', value: 'slots', emoji: '🎰' },
                { label: 'Dice', value: 'dice', emoji: '🎲' },
                { label: 'Higher/Lower', value: 'higherlower', emoji: '📊' },
                { label: 'RPS', value: 'rps', emoji: '✊' },
              ])
          );

          await interaction.update({ embeds: [embed], components: [select] });
          return;
        }

        // Account back button
        if (id === 'nav_account_back') {
          const { backToMainMenu } = require('../utils/helpers');
          await backToMainMenu(interaction);
          return;
        }

        // Registered component handlers
        const handler = client.buttons.get(id) || findDynamicHandler(client.buttons, id);
        if (handler) {
          await handler(interaction, client);
        } else {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ embeds: [
              new EmbedBuilder().setTitle('⚠️ Expired').setDescription('This interaction is no longer active. Use the command again.').setColor(config.colors.warning)
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

      try {
        // Registered component handlers first
        const handler = client.selectMenus.get(id) || findDynamicHandler(client.selectMenus, id);
        if (handler) {
          await handler(interaction, client);
          return;
        }

        // Built-in select menus
        if (id === 'staff_panel_select') { await handleStaffPanelSelect(interaction); return; }
        if (id === 'help_category_select') { await handleHelpCategorySelect(interaction); return; }
        if (id === 'config_select') { await handleConfigSelect(interaction); return; }
        if (id === 'shop_select_item') { await handleShopSelect(interaction); return; }

        await interaction.reply({ embeds: [
          new EmbedBuilder().setTitle('⚠️ Expired').setDescription('This menu is no longer active. Use the command again.').setColor(config.colors.warning)
        ], ephemeral: true }).catch(() => {});
      } catch (error) {
        console.error(`[SELECT] Error with ${id}:`, error.message);
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

      if (id.startsWith('transfer_modal_')) {
        const modalOwnerId = id.split('_')[2];
        if (modalOwnerId !== interaction.user.id) {
          return interaction.reply({ embeds: [
            new EmbedBuilder().setTitle('🔒 Not Your Panel').setDescription('This is not your transfer panel.').setColor(config.colors.error)
          ], ephemeral: true });
        }
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

async function handleVerifyButton(interaction, client) {
  const { isVerified, verifyUser } = require('../systems/verification');
  const { log } = require('../systems/logging');

  if (isVerified(interaction.user.id, interaction.guild.id)) {
    return interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('✅ Already Verified').setDescription('Your account is already verified.').setColor(config.colors.success)
    ], ephemeral: true });
  }

  // Confirm step
  const confirmEmbed = new EmbedBuilder()
    .setTitle('🔐 Confirm Verification')
    .setDescription(`**${interaction.user.username}**, you are about to verify.\n\nThis will assign you the **Verified** role and grant full server access.`)
    .setColor(config.colors.primary)
    .setTimestamp();

  const confirmRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`verify_final_${interaction.user.id}`).setLabel('✅ Confirm & Verify').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('verify_cancel').setLabel('❌ Cancel').setStyle(ButtonStyle.Secondary),
  );

  await interaction.reply({ embeds: [confirmEmbed], components: [confirmRow], ephemeral: true });
}

async function handleVerifyFinal(interaction) {
  const { verifyUser } = require('../systems/verification');
  const { log } = require('../systems/logging');

  verifyUser(interaction.user.id, interaction.guild.id);

  const verifiedRoleId = config.roleIds.verified;
  if (verifiedRoleId) {
    const role = interaction.guild.roles.cache.get(verifiedRoleId);
    if (role) {
      await interaction.member.roles.add(role).catch(() => {});
    }
  }

  await log(interaction.guild, 'members', '✅ Verification Complete', { actor: interaction.user.id });

  await interaction.update({ embeds: [
    new EmbedBuilder().setTitle('✅ Verified!').setDescription('Your account has been verified. Welcome to the server!').setColor(config.colors.success).setTimestamp()
  ], components: [] });
}

async function handleVerifyCancel(interaction) {
  await interaction.update({ embeds: [
    new EmbedBuilder().setTitle('❌ Verification Cancelled').setDescription('You can verify later using `/verify`.').setColor(config.colors.warning)
  ], components: [] });
}

async function handleModBackToSelect(interaction) {
  const { isStaff, getStaffRole } = require('../utils/permissions');
  if (!isStaff(interaction.member)) {
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🔒 Staff Only').setColor(config.colors.error)], ephemeral: true });
  }

  const staffRole = getStaffRole(interaction.member);

  const embed = new EmbedBuilder()
    .setTitle('🛡️ Moderation Panel')
    .setColor(config.colors.moderation)
    .setDescription(`**Your Level:** ${staffRole?.label || 'Staff'}\n\nSelect a member below to moderate.`)
    .setTimestamp();

  const userSelect = new ActionRowBuilder().addComponents(
    new (require('discord.js').UserSelectMenuBuilder)()
      .setCustomId('mod_user_select')
      .setPlaceholder('Select a member to moderate...')
      .setMinValues(1)
      .setMaxValues(1)
  );

  await interaction.update({ embeds: [embed], components: [userSelect] });
}

async function handleStaffPanelSelect(interaction) {
  const { isStaff } = require('../utils/permissions');
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
  await interaction.reply({ embeds: [embed] });
}

async function handleHelpCategorySelect(interaction) {
  const category = interaction.values[0];
  const categories = {
    general: { title: '📖 General', desc: '`/account` — Profile & wallet\n`/games` — Games arcade\n`/shop` — Credit shop\n`/stats` — Server stats' },
    moderation: { title: '🛡️ Moderation', desc: '`/moderation` — Mod panel (Staff)\n`/staff` — Staff panel (Staff)' },
    staff: { title: '👨‍💼 Staff', desc: '`/staff` — Staff panel\n`/moderation` — Mod tools\n`/config` — Server config (Admin)' },
    utility: { title: '⚙️ Utility', desc: '`/ping` — Bot latency\n`/botinfo` — Bot info\n`/serverinfo` — Server info\n`/verify` — Verify account\n`/poll` — Create polls' },
    social: { title: '🤝 Social', desc: '`/account` — Achievements, invites\n`/stats` — Server statistics' },
  };
  const cat = categories[category] || { title: category, desc: 'No commands listed.' };
  const embed = new EmbedBuilder().setTitle(cat.title).setDescription(cat.desc).setColor(config.colors.info).setTimestamp();
  await interaction.reply({ embeds: [embed] });
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
  await interaction.reply({ embeds: [embed] });
}

async function handleShopSelect(interaction) {
  const { purchaseItem } = require('../systems/shop');
  const itemId = interaction.values[0];
  const result = purchaseItem(interaction.user.id, itemId, interaction.guild.id);
  if (result.success) {
    await interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('✅ Purchased').setDescription(`You bought **${result.item.name}**!`).setColor(config.colors.success)
    ] });
  } else {
    await interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('❌ Failed').setDescription(result.reason).setColor(config.colors.error)
    ], ephemeral: true });
  }
}

async function handleTransferModal(interaction) {
  const { getBalance, transfer } = require('../systems/economy');
  const { getDb } = require('../database/init');
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
    ] });
  } else {
    await interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('❌ Transfer Failed').setDescription(result.reason).setColor(config.colors.error)
    ], ephemeral: true });
  }
}
