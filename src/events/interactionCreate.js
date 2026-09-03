const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        // Handle subcommand modules
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
          embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription('An error occurred while executing this command.').setColor(config.colors.error)],
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
      const id = interaction.customId;

      // Route to component handler
      const handler = client.buttons.get(id) || findDynamicHandler(client.buttons, id);
      if (handler) {
        try {
          await handler(interaction, client);
        } catch (error) {
          console.error(`[BTN] Error with ${id}:`, error.message);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ embeds: [
              new EmbedBuilder().setTitle('❌ Error').setDescription('An error occurred.').setColor(config.colors.error)
            ], ephemeral: true }).catch(() => {});
          }
        }
        return;
      }

      // Route by prefix
      try {
        await routeButton(interaction, client, id);
      } catch (error) {
        console.error(`[BTN] Error routing ${id}:`, error.message);
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

      const handler = client.selectMenus.get(id) || findDynamicHandler(client.selectMenus, id);
      if (handler) {
        try {
          await handler(interaction, client);
        } catch (error) {
          console.error(`[SELECT] Error with ${id}:`, error.message);
        }
        return;
      }

      try {
        await routeSelect(interaction, client, id);
      } catch (error) {
        console.error(`[SELECT] Error routing ${id}:`, error.message);
      }
      return;
    }

    // Handle modals
    if (interaction.isModalSubmit()) {
      const id = interaction.customId;
      const handler = client.modals.get(id) || findDynamicHandler(client.modals, id);
      if (handler) {
        try {
          await handler(interaction, client);
        } catch (error) {
          console.error(`[MODAL] Error with ${id}:`, error.message);
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

async function routeButton(interaction, client, id) {
  const { handleAccountButton } = require('../components/accountPanel');
  const { handleEconomyButton } = require('../components/economyPanel');
  const { handleGameButton } = require('../components/gamesPanel');
  const { handleModButton } = require('../components/moderationPanel');
  const { handleTicketButton } = require('../components/ticketPanel');

  if (id.startsWith('account_')) return handleAccountButton(interaction, client);
  if (id.startsWith('economy_')) return handleEconomyButton(interaction, client);
  if (id.startsWith('game_')) return handleGameButton(interaction, client);
  if (id.startsWith('mod_')) return handleModButton(interaction, client);
  if (id.startsWith('verify_')) return handleVerifyButton(interaction, client);
  if (id.startsWith('ticket_')) return handleTicketButton(interaction, client);
  if (id.startsWith('poll_vote_')) return handlePollVote(interaction, client);

  await interaction.reply({ embeds: [
    new EmbedBuilder().setTitle('⚠️ Unknown Action').setDescription('This button is no longer active.').setColor(config.colors.warning)
  ], ephemeral: true });
}

async function routeSelect(interaction, client, id) {
  if (id === 'staff_panel_select') return handleStaffPanelSelect(interaction, client);
  if (id === 'help_category_select') return handleHelpCategorySelect(interaction, client);
  if (id === 'config_select') return handleConfigSelect(interaction, client);
  if (id === 'shop_select_item') return handleShopSelect(interaction, client);
  if (id === 'ticket_create_select') return handleTicketCreateSelect(interaction, client);
}

async function handleVerifyButton(interaction, client) {
  if (interaction.customId === 'verify_confirm') {
    const { verifyUser } = require('../systems/verification');
    const { log } = require('../systems/logging');

    verifyUser(interaction.user.id, interaction.guild.id);

    // Try to assign verified role
    const verifiedRoleName = 'Verified';
    const role = interaction.guild.roles.cache.find(r => r.name === verifiedRoleName);
    if (role) {
      await interaction.member.roles.add(role).catch(() => {});
    }

    await log(interaction.guild, 'members', '✅ Verification Complete', {
      actor: interaction.user.id,
    });

    await interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('✅ Verified!').setDescription('Your account has been verified. Welcome to the server!').setColor(config.colors.success)
    ], ephemeral: true });
  }
}

async function handlePollVote(interaction, client) {
  const { votePoll } = require('../systems/polls');
  const parts = interaction.customId.split('_');
  const pollId = parts[2];
  const optionIndex = parseInt(parts[3]);

  const result = votePoll(pollId, interaction.user.id, optionIndex);
  if (result.success) {
    await interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('✅ Vote Recorded').setDescription(`You voted for option ${optionIndex + 1}.`).setColor(config.colors.success)
    ], ephemeral: true });
  } else {
    await interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('❌ Error').setDescription(result.reason).setColor(config.colors.error)
    ], ephemeral: true });
  }
}

async function handleStaffPanelSelect(interaction, client) {
  const { isStaff } = require('../utils/permissions');
  if (!isStaff(interaction.member)) {
    return interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('❌ Access Denied').setColor(config.colors.error)
    ], ephemeral: true });
  }

  const category = interaction.values[0];
  const { EmbedBuilder: EB, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

  const panels = {
    moderation: {
      title: '🛡️ Moderation Tools',
      description: 'Select a moderation action.',
      buttons: [
        { id: 'mod_warn_', label: 'Warn', style: ButtonStyle.Danger, emoji: '⚠️' },
        { id: 'mod_timeout_', label: 'Timeout', style: ButtonStyle.Danger, emoji: '🔇' },
        { id: 'mod_kick_', label: 'Kick', style: ButtonStyle.Danger, emoji: '👢' },
        { id: 'mod_ban_', label: 'Ban', style: ButtonStyle.Danger, emoji: '🔨' },
      ],
    },
    cases: { title: '📋 Case Management', description: 'View and manage moderation cases.' },
    reports: { title: '🚨 Reports', description: 'View pending reports.' },
    tickets: { title: '🎫 Tickets', description: 'Manage support tickets.' },
    security: { title: '🔒 Security', description: 'Monitor security status.' },
    economy: { title: '💰 Economy', description: 'Manage economy settings.' },
    applications: { title: '📋 Applications', description: 'Review staff and partnership applications.' },
    logs: { title: '📜 Logs', description: 'View system logs.' },
  };

  const panel = panels[category];
  const embed = new EB().setTitle(panel.title).setDescription(panel.description).setColor(config.colors.staff).setTimestamp();

  if (panel.buttons) {
    const row = new ActionRowBuilder().addComponents(
      ...panel.buttons.map(b => new ButtonBuilder().setCustomId(b.id).setLabel(b.label).setStyle(b.style).setEmoji(b.emoji))
    );
    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  } else {
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

async function handleHelpCategorySelect(interaction, client) {
  const { EmbedBuilder: EB } = require('discord.js');
  const category = interaction.values[0];

  const categories = {
    general: {
      title: '📖 General Commands',
      fields: [
        '/account - Your account panel',
        '/economy - Economy panel',
        '/games - Games panel',
        '/stats - Server statistics',
        '/shop - Browse the shop',
        '/poll - Create a poll',
      ],
    },
    moderation: {
      title: '🛡️ Moderation Commands',
      fields: [
        '/moderation - Moderation panel (Staff)',
        '/staff - Staff panel (Staff)',
      ],
    },
    staff: {
      title: '👨‍💼 Staff Commands',
      fields: ['/staff - Staff panel', '/moderation - Moderation tools', '/config - Server configuration (Admin)'],
    },
    social: {
      title: '🤝 Social Commands',
      fields: ['/account - View profile and achievements', '/stats - Server statistics', '/poll - Create polls'],
    },
    support: {
      title: '🎫 Support Commands',
      fields: ['/ticket - Create support ticket', '/report - Report an issue', '/appeal - Appeal a punishment'],
    },
    security: {
      title: '🔒 Security Commands',
      fields: ['/verify - Verify your account', '/moderation - Security tools (Staff)'],
    },
    utility: {
      title: '⚙️ Utility Commands',
      fields: ['/ping - Bot latency', '/avatar - User avatar', '/userinfo - User info', '/serverinfo - Server info', '/botinfo - Bot info', '/remind - Set reminder'],
    },
  };

  const cat = categories[category];
  const embed = new EB()
    .setTitle(cat.title)
    .setDescription(cat.fields.map(f => `\`${f}\``).join('\n'))
    .setColor(config.colors.info)
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleConfigSelect(interaction, client) {
  const { isAdmin } = require('../utils/permissions');
  if (!isAdmin(interaction.member)) {
    return interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('❌ Access Denied').setColor(config.colors.error)
    ], ephemeral: true });
  }

  const category = interaction.values[0];
  const { EmbedBuilder: EB, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

  const embed = new EB()
    .setTitle(`⚙️ Configure: ${category}`)
    .setDescription(`Use the buttons below to configure ${category} settings.`)
    .setColor(config.colors.staff)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`config_edit_${category}`).setLabel('Edit Settings').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`config_view_${category}`).setLabel('View Current').setStyle(ButtonStyle.Secondary),
  );

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

async function handleShopSelect(interaction, client) {
  const { purchaseItem } = require('../systems/shop');
  const itemId = interaction.values[0];

  const result = purchaseItem(interaction.user.id, itemId, interaction.guild.id);
  if (result.success) {
    const { EmbedBuilder: EB } = require('discord.js');
    await interaction.reply({ embeds: [
      new EB().setTitle('✅ Purchase Successful').setDescription(`You purchased **${result.item.name}**!`).setColor(config.colors.success)
    ], ephemeral: true });
  } else {
    await interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('❌ Purchase Failed').setDescription(result.reason).setColor(config.colors.error)
    ], ephemeral: true });
  }
}

async function handleTicketCreateSelect(interaction, client) {
  const { createTicket } = require('../systems/tickets');
  const category = interaction.values[0];

  const result = createTicket(interaction.guild.id, interaction.user.id, category, 'Created from ticket panel');
  const catInfo = config.ticketCategories.find(c => c.id === category);

  await interaction.reply({ embeds: [
    new EmbedBuilder()
      .setTitle(`🎫 Ticket Created - ${result.id}`)
      .setDescription(`Category: ${catInfo?.label || category}\n\nA staff member will assist you shortly.`)
      .setColor(config.colors.ticket)
      .setTimestamp()
  ], ephemeral: true });
}
