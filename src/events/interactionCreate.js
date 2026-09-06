const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, UserSelectMenuBuilder } = require('discord.js');
const config = require('../config');
const { isNewInteraction, checkRateLimit } = require('../utils/security');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    try {
      // Prevent duplicate interaction processing
      if (!isNewInteraction(interaction.id)) return;

      // Handle slash commands
      if (interaction.isChatInputCommand()) {
        // Rate limit slash commands
        const rl = checkRateLimit(interaction.user.id, 'command');
        if (!rl.allowed) {
          return safeReply(interaction, {
            embeds: [new EmbedBuilder().setTitle('Slow Down').setDescription(`You are doing that too fast. Try again in ${Math.ceil(rl.retryAfter / 1000)}s.`).setColor(config.colors.warning)],
            flags: 64,
          });
        }
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
          await command.execute(interaction, client);
        } catch (error) {
          console.error(`[CMD] Error executing ${interaction.commandName}:`, error.message);
          await safeReply(interaction, {
            embeds: [new EmbedBuilder().setTitle('Error').setDescription('Something went wrong. Please try again.').setColor(config.colors.error)],
            flags: 64,
          });
        }
        return;
      }

      // Handle buttons
      if (interaction.isButton()) {
        try {
          const id = interaction.customId;

          // Verify buttons
          if (id === 'verify_confirm') {
            await handleVerifyConfirm(interaction);
            return;
          }
          if (id === 'verify_otp_modal') {
            await showOTPModal(interaction);
            return;
          }
          if (id.startsWith('verify_authorize_')) {
            await handleAuthorizeClick(interaction, id);
            return;
          }
          if (id.startsWith('verify_skip_auth_')) {
            await interaction.update({ components: [], embeds: [
              new EmbedBuilder().setTitle('Verified').setDescription('You can verify and use all features. Authorization is optional.')
                .setColor(config.colors.success)
            ]});
            return;
          }

          // Restore (owner-only) buttons
          if (id.startsWith('restore_confirm_') || id.startsWith('restore_cancel_')) {
            await handleRestoreButton(interaction, id);
            return;
          }
          if (id === 'verify_cancel') {
            await interaction.update({
              embeds: [new EmbedBuilder().setTitle('Cancelled').setDescription('Verification cancelled. Use `/verify` to start again.').setColor(config.colors.warning)],
              components: []
            });
            return;
          }

          // Back navigation buttons
          if (id === 'nav_account_back') {
            await navToAccount(interaction);
            return;
          }
          if (id === 'nav_wallet_back') {
            await navToWallet(interaction);
            return;
          }
          if (id === 'nav_games_back') {
            await navToGames(interaction);
            return;
          }
          if (id === 'mod_back_to_select') {
            await navToModSelect(interaction);
            return;
          }
          if (id === 'help_home') {
            await navToHelpHome(interaction);
            return;
          }
          if (id === 'config_home') {
            await handleConfigHome(interaction);
            return;
          }
          if (id.startsWith('config_back_')) {
            await handleConfigBack(interaction, id);
            return;
          }

          // Death Note buttons
          if (id.startsWith('dn_join_')) {
            await handleDeathNoteJoin(interaction, id);
            return;
          }
          if (id.startsWith('dn_start_')) {
            await handleDeathNoteStart(interaction, id);
            return;
          }
          if (id.startsWith('dn_kill_')) {
            await handleDeathNoteKill(interaction, id);
            return;
          }
          if (id.startsWith('dn_accuse_')) {
            await handleDeathNoteAccuse(interaction, id);
            return;
          }

          // Report take-action button
          if (id.startsWith('report_take_action_')) { await handleReportTakeAction(interaction, id); return; }
          if (id.startsWith('ticket_close_')) { await handleTicketClose(interaction, id); return; }

          // Registered component handlers
          const handler = client.buttons.get(id) || findDynamicHandler(client.buttons, id);
          if (handler) {
            await handler(interaction, client);
          } else {
            await safeReply(interaction, {
              embeds: [new EmbedBuilder().setTitle('Expired').setDescription('This interaction is no longer active. Use the command again.').setColor(config.colors.warning)],
              flags: 64,
            });
          }
        } catch (error) {
          console.error(`[BTN] Error with ${interaction.customId}:`, error.message);
          await safeReply(interaction, {
            embeds: [new EmbedBuilder().setTitle('Error').setDescription('Something went wrong. Please try again.').setColor(config.colors.error)],
            flags: 64,
          });
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
          if (id.startsWith('config_edit_')) { await handleConfigEditSelect(interaction, id); return; }
          if (id === 'credits_user_select') { await handleCreditsUserSelect(interaction); return; }
          if (id.startsWith('credits_action_')) { await handleCreditsAction(interaction, id); return; }
          if (id === 'event_admin_select') { await handleEventAdminSelect(interaction); return; }
          if (id === 'mod_user_select') { await handleModUserSelect(interaction); return; }
          if (id.startsWith('mod_action_select_')) { await handleModActionSelect(interaction, id); return; }
          if (id.startsWith('wallet_transfer_select_')) { await handleWalletTransferSelect(interaction, id); return; }
          if (id === 'report_user_select') { await handleReportUserSelect(interaction); return; }
          if (id === 'report_type_select') { await handleReportTypeSelect(interaction); return; }
          if (id === 'report_category_select') { await handleReportCategorySelect(interaction); return; }

          await safeReply(interaction, {
            embeds: [new EmbedBuilder().setTitle('Expired').setDescription('This menu is no longer active. Use the command again.').setColor(config.colors.warning)],
            flags: 64,
          });
        } catch (error) {
          console.error(`[SELECT] Error with ${id}:`, error.message);
          await safeReply(interaction, {
            embeds: [new EmbedBuilder().setTitle('Error').setDescription('Something went wrong. Please try again.').setColor(config.colors.error)],
            flags: 64,
          });
        }
        return;
      }

      // Handle modals
      if (interaction.isModalSubmit()) {
        const id = interaction.customId;

        try {        // Report reason modal
          if (id === 'report_reason_modal') {
            await handleReportReasonModal(interaction);
            return;
          }

        // Transfer modal: transfer_modal_<userId>_<recipientId>
            if (id.startsWith('transfer_modal_')) {
            const parts = id.split('_');
            const modalOwnerId = parts[2];
            const recipientId = parts[3];

            if (modalOwnerId !== interaction.user.id) {
              return safeReply(interaction, {
                embeds: [new EmbedBuilder().setTitle('Not Your Panel').setDescription('This is not your transfer panel.').setColor(config.colors.error)],
                flags: 64,
              });
            }
            await handleTransferModal(interaction, recipientId);
            return;
          }

          // Transfer OTP modal
          if (id === 'transfer_otp_modal') {
            await handleTransferOTPSubmit(interaction);
            return;
          }

          // Verification OTP modal
          if (id === 'verify_otp_submit') {
            await handleVerifyOTPSubmit(interaction);
            return;
          }

          // Config setting modals: config_set_<category>_<settingKey>
          if (id.startsWith('config_set_')) {
            await handleConfigSetModal(interaction, id);
            return;
          }
          // Credits execution modals: credits_exec_<action>_<targetId>_<staffId>
          if (id.startsWith('credits_exec_')) {
            await handleCreditsExecModal(interaction, id);
            return;
          }

          // Moderation execution modals: mod_execute_<action>_<targetId>_<modId>
          if (id.startsWith('mod_execute_')) {
            const parts = id.split('_');
            const action = parts[2];
            const targetId = parts[3];
            const modId = parts[4];

            if (modId !== interaction.user.id) {
              return safeReply(interaction, {
                embeds: [new EmbedBuilder().setTitle('Not Your Panel').setDescription('This is not your moderation panel.')],
                flags: 64,
              });
            }

            const reason = interaction.fields.getTextInputValue('reason') || 'No reason provided';
            let durationMs = 0;
            if (action === 'timeout') {
              const { parseDuration } = require('../utils/helpers');
              durationMs = parseDuration(interaction.fields.getTextInputValue('duration') || '');
              if (durationMs <= 0 || durationMs > 28 * 86400000) {
                return safeReply(interaction, {
                  embeds: [new EmbedBuilder().setTitle('Invalid Duration').setDescription('Use formats like 10m, 1h, 1d, 1w. Max 28 days.')],
                  flags: 64,
                });
              }
            }
            if (action === 'purge') {
              return executePurge(interaction, targetId, reason);
            }
            if (action === 'slowmode') {
              return executeSlowmode(interaction, reason);
            }
            if (action === 'rep') {
              return executeReputation(interaction, targetId, reason);
            }

            await executeModAction(interaction, targetId, action, reason, durationMs);
            return;
          }

          // Event creation modals
          if (id === 'event_deathnote_modal') {
            await handleCreateDeathNote(interaction);
            return;
          }

          // Game bet modals
          const handler = client.modals.get(id) || findDynamicHandler(client.modals, id);
          if (handler) {
            await handler(interaction, client);
          } else {
            await safeReply(interaction, {
              embeds: [new EmbedBuilder().setTitle('Expired').setDescription('This modal is no longer active. Use the command again.').setColor(config.colors.warning)],
              flags: 64,
            });
          }
        } catch (error) {
          console.error(`[MODAL] Error with ${id}:`, error.message);
          await safeReply(interaction, {
            embeds: [new EmbedBuilder().setTitle('Error').setDescription('Something went wrong. Please try again.').setColor(config.colors.error)],
            flags: 64,
          });
        }
        return;
      }
    } catch (error) {
      console.error('[INTERACTION] Unhandled error:', error.message);
      await safeReply(interaction, {
        embeds: [new EmbedBuilder().setTitle('Error').setDescription('An unexpected error occurred.').setColor(config.colors.error)],
        flags: 64,
      });
    }
  },
};

// === SAFE REPLY HELPER ===
async function safeReply(interaction, payload) {
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  } catch (e) {
    // Silently fail
  }
}

function findDynamicHandler(collection, id) {
  for (const [key, handler] of collection.entries()) {
    if (key.includes('*')) {
      const prefix = key.replace('*', '');
      if (id.startsWith(prefix)) return handler;
    }
  }
  return null;
}

// === VERIFICATION OTP FLOW ===

async function handleVerifyConfirm(interaction) {
  const { isVerified, canVerify, createOTPChallenge } = require('../systems/verification');
  const { log } = require('../systems/logging');

  if (isVerified(interaction.user.id, interaction.guild.id)) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Already Verified').setDescription('Your account is already verified.').setColor(config.colors.success)],
      flags: 64,
    });
  }

  const can = canVerify(interaction.member, interaction.guild.id);
  if (!can.allowed) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Cannot Verify').setDescription(can.reason).setColor(config.colors.error)],
      flags: 64,
    });
  }

  const otp = createOTPChallenge(interaction.user.id);

  try {
    await interaction.user.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('Verification OTP')
          .setDescription(`Your verification code is:\n\n**\`${otp}\`**\n\nEnter this code in the server to verify.\n\n*This code expires in 5 minutes.*`)
          .setColor(config.colors.primary)
          .setTimestamp()
      ]
    });
  } catch (e) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('DMs Closed').setDescription('I cannot send you a DM. Please enable DMs from server members and try again.').setColor(config.colors.error)],
      flags: 64,
    });
  }

  await log(interaction.guild, 'security', 'Verification OTP Sent', { actor: interaction.user.id });

  await safeReply(interaction, {
    embeds: [
      new EmbedBuilder()
        .setTitle('OTP Sent')
        .setDescription(`A **6-digit OTP** has been sent to your DMs.\n\nCheck your DMs and enter the code here to verify.`)
        .setColor(config.colors.primary)
        .setTimestamp()
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('verify_otp_modal').setLabel('Enter OTP').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('verify_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
      )
    ],
    flags: 64,
  });
}

async function showOTPModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('verify_otp_submit')
    .setTitle('Enter Verification OTP')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('otp_code').setLabel('6-Digit OTP').setPlaceholder('Enter the code from your DM').setStyle(TextInputStyle.Short).setMinLength(6).setMaxLength(6).setRequired(true)
      )
    );
  await interaction.showModal(modal);
}

async function handleVerifyOTPSubmit(interaction) {
  const { verifyOTP, verifyUser, buildOAuthUrl } = require('../systems/verification');
  const { log } = require('../systems/logging');

  const code = interaction.fields.getTextInputValue('otp_code');
  const result = verifyOTP(interaction.user.id, code);

  if (result.success) {
    verifyUser(interaction.user.id, interaction.guild.id, 'otp');

    const verifiedRoleId = config.roleIds.verified;
    if (verifiedRoleId) {
      const role = interaction.guild.roles.cache.get(verifiedRoleId);
      if (role) {
        await interaction.member.roles.add(role).catch(() => {});
      }
    }

    try {
      const { updateNickname } = require('../utils/helpers');
      await updateNickname(interaction.member);
    } catch (e) {}

    await log(interaction.guild, 'members', 'Verification Complete', { actor: interaction.user.id });

    // Build OAuth authorize button so the bot can re-add the user if the server is ever recreated
    const oauthUrl = buildOAuthUrl(interaction.user.id);

    const components = [];
    if (oauthUrl) {
      components.push(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel('Authorize NEXAVERSE (Optional but Recommended)')
            .setStyle(ButtonStyle.Link)
            .setURL(oauthUrl),
          new ButtonBuilder()
            .setCustomId(`verify_skip_auth_${interaction.user.id}`)
            .setLabel('Skip')
            .setStyle(ButtonStyle.Secondary)
        )
      );
    }

    const authNote = oauthUrl
      ? `\n\n**One more step (optional):** Authorize the bot below so we can automatically re-add you if this server is ever recreated. You keep full access either way.`
      : '';

    await safeReply(interaction, {
      embeds: [
        new EmbedBuilder()
          .setTitle('Verified')
          .setDescription(`Welcome, **${interaction.user.username}**.\n\nYour Verified role is assigned and your nickname is updated.${authNote}`)
          .setColor(config.colors.success)
          .setTimestamp()
      ],
      components,
    });
  } else {
    await safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Verification Failed').setDescription(result.reason).setColor(config.colors.error)],
      flags: 64,
    });
  }
}

// === RESTORE BUTTONS (OWNER ONLY) ===

async function handleRestoreButton(interaction, id) {
  const { isOwner } = require('../commands/restore');
  if (!isOwner(interaction.user.id, interaction.user.username)) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Owner Only').setDescription('Only the server owner can run restores.')],
      flags: 64,
    });
  }

  const { sendDM } = require('../utils/dm');

  if (id.startsWith('restore_cancel_')) {
    await interaction.update({
      embeds: [new EmbedBuilder().setTitle('Restore Cancelled').setColor(config.colors.warning)],
      components: [],
    });
    return;
  }

  await interaction.update({
    embeds: [new EmbedBuilder().setTitle('Restore Started').setDescription('DMing all missing verified members. This may take a while.')
      .setColor(config.colors.primary)],
    components: [],
  });

  const db = require('../database/init').getDb();
  const guild = interaction.guild;

  const { value: savedInvite } = db.prepare('SELECT value FROM guild_config WHERE guild_id = ? AND key = ?').get(guild.id, 'restore_invite') || {};
  if (!savedInvite) {
    return interaction.followUp({
      embeds: [new EmbedBuilder().setTitle('No Saved Invite').setDescription('Run `/restore` again to regenerate one.')],
      flags: 64,
    });
  }

  const verifiedUsers = db.prepare("SELECT DISTINCT user_id FROM verifications WHERE status = 'verified'").all();
  const currentMemberIds = new Set((await guild.members.fetch()).map(m => m.id));
  const missing = verifiedUsers.filter(v => !currentMemberIds.has(v.user_id));

  let sent = 0, failed = 0;
  for (const v of missing) {
    try {
      const user = await interaction.client.users.fetch(v.user_id).catch(() => null);
      if (!user) { failed++; continue; }

      const dmEmbed = new EmbedBuilder()
        .setAuthor({ name: 'NEXAVERSE' })
        .setTitle('Server Invitation')
        .setColor(config.colors.primary)
        .setDescription(
          `${'\u2501'.repeat(32)}\n` +
          `You were previously verified in a NEXAVERSE community.\n` +
          `Use the invite below to rejoin.\n\n` +
          `**Invite** ${savedInvite}\n` +
          `${'\u2501'.repeat(32)}`
        )
        .setTimestamp();

      const result = await sendDM(user, dmEmbed);
      if (result.sent) sent++; else failed++;

      // Rate limit: ~1 DM every 2 seconds
      await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
      failed++;
    }
  }

  const { log } = require('../systems/logging');
  await log(guild, 'staff', 'Member Restore Executed', {
    actor: interaction.user.id,
    reason: `${sent} invites sent, ${failed} failed`,
  }).catch(() => {});

  const summary = new EmbedBuilder()
    .setTitle('NEXAVERSE \u00b7 Restore Complete')
    .setColor(config.colors.success)
    .setDescription(
      `${'\u2501'.repeat(32)}\n` +
      `**Invites Sent** ${sent}\n` +
      `**Failed (DMs closed/unknown users)** ${failed}\n` +
      `**Total Targeted** ${missing.length}\n` +
      `${'\u2501'.repeat(32)}`
    )
    .setTimestamp();

  await interaction.followUp({ embeds: [summary], flags: 64 });
}

async function handleAuthorizeClick(interaction, id) {
  const ownerId = id.replace('verify_authorize_', '');
  if (ownerId !== interaction.user.id) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Not Your Panel').setDescription('This is not your verification panel.')],
      flags: 64,
    });
  }

  const { getDb } = require('../database/init');
  getDb().prepare('INSERT OR REPLACE INTO guild_config (guild_id, key, value) VALUES (?, ?, ?)')
    .run(interaction.guild.id, `oauth_authorized_${interaction.user.id}`, '1');

  await interaction.update({
    embeds: [new EmbedBuilder()
      .setTitle('Authorized')
      .setDescription('Thank you. If this server is ever recreated, you will be re-invited automatically.')
      .setColor(config.colors.success)],
    components: [],
  });
}

// === TRANSFER FLOW ===

let pendingTransferData = null;

async function handleTransferModal(interaction, recipientId) {
  const { formatCredits } = require('../utils/helpers');
  const { getBalance } = require('../systems/economy');

  const amount = parseInt(interaction.fields.getTextInputValue('amount'));

  if (isNaN(amount) || amount <= 0) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Invalid Amount').setDescription('Enter a positive number.').setColor(config.colors.error)],
      flags: 64,
    });
  }

  const balance = getBalance(interaction.user.id, interaction.guild.id);
  if (balance < amount) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Insufficient Funds').setDescription(`Balance: ${formatCredits(balance)}`).setColor(config.colors.error)],
      flags: 64,
    });
  }

  // If amount > 1000, require OTP
  if (amount > 1000) {
    const { createOTPChallenge } = require('../systems/verification');
    const otp = createOTPChallenge(`transfer_${interaction.user.id}`);

    try {
      await interaction.user.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('Transfer OTP Required')
            .setDescription(`You are transferring **${formatCredits(amount)}** to <@${recipientId}>.\n\nA **6-digit OTP** has been sent to your DMs.\nEnter it to confirm the transfer.\n\n**Code: \`${otp}\`**\n\n*Expires in 5 minutes.*`)
            .setColor(config.colors.warning)
            .setTimestamp()
        ]
      });
    } catch (e) {
      return safeReply(interaction, {
        embeds: [new EmbedBuilder().setTitle('DMs Closed').setDescription('Enable DMs to receive transfer OTP.').setColor(config.colors.error)],
        flags: 64,
      });
    }

    pendingTransferData = { userId: interaction.user.id, recipientId, amount, guildId: interaction.guild.id, timestamp: Date.now() };

    const modal = new ModalBuilder()
      .setCustomId('transfer_otp_modal')
      .setTitle('Enter Transfer OTP')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('otp_code').setLabel('6-Digit OTP').setPlaceholder('Enter the code from your DM').setStyle(TextInputStyle.Short).setMinLength(6).setMaxLength(6).setRequired(true)
        )
      );
    await interaction.showModal(modal);
    return;
  }

  await executeTransfer(interaction, recipientId, amount, interaction.guild.id);
}

async function handleTransferOTPSubmit(interaction) {
  const { verifyOTP } = require('../systems/verification');

  if (!pendingTransferData || pendingTransferData.userId !== interaction.user.id) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('No Pending Transfer').setDescription('No transfer to verify. Start again.').setColor(config.colors.error)],
      flags: 64,
    });
  }

  if (Date.now() - pendingTransferData.timestamp > 300000) {
    pendingTransferData = null;
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Expired').setDescription('Transfer OTP expired. Start again.').setColor(config.colors.error)],
      flags: 64,
    });
  }

  const code = interaction.fields.getTextInputValue('otp_code');
  const result = verifyOTP(`transfer_${interaction.user.id}`, code);

  if (result.success) {
    const data = pendingTransferData;
    pendingTransferData = null;
    await executeTransfer(interaction, data.recipientId, data.amount, data.guildId);
  } else {
    pendingTransferData = null;
    await safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Wrong OTP').setDescription(result.reason).setColor(config.colors.error)],
      flags: 64,
    });
  }
}

async function executeTransfer(interaction, recipientId, amount, guildId) {
  const { getBalance, transfer } = require('../systems/economy');
  const { formatCredits } = require('../utils/helpers');
  const { getDb } = require('../database/init');
  const { log } = require('../systems/logging');

  const db = getDb();
  db.prepare('INSERT OR IGNORE INTO users (user_id, guild_id, username, created_at) VALUES (?, ?, ?, ?)').run(recipientId, guildId, 'Unknown', Date.now());

  const result = transfer(interaction.user.id, recipientId, amount, guildId);
  if (result.success) {
    await log(interaction.guild, 'economy', 'Transfer Completed', { actor: interaction.user.id, target: recipientId, amount, reason: result.senderTxId });

    const { sendDM, transferDM } = require('../utils/dm');

    // DM sender (non-blocking)
    sendDM(interaction.user, transferDM({
      direction: 'sent',
      toId: recipientId,
      amount: formatCredits(amount),
      fee: formatCredits(result.fee || 0),
      txId: result.senderTxId,
    })).catch(() => {});

    // DM receiver (non-blocking)
    try {
      const recipient = await interaction.guild.members.fetch(recipientId).catch(() => null);
      if (recipient) {
        sendDM(recipient.user, transferDM({
          direction: 'received',
          fromId: interaction.user.id,
          amount: formatCredits(amount),
          txId: result.senderTxId,
        })).catch(() => {});
      }
    } catch (e) {}

    await safeReply(interaction, {
      embeds: [
        new EmbedBuilder()
          .setTitle('Transfer Complete')
          .setDescription(`**From:** <@${interaction.user.id}>\n**To:** <@${recipientId}>\n**Amount:** ${formatCredits(amount)}\n**Fee:** ${formatCredits(result.fee || 0)}\n**TxID:** \`${result.senderTxId}\``)
          .addFields({ name: 'Your Balance', value: formatCredits(result.senderBalance || getBalance(interaction.user.id, guildId)), inline: true })
          .setColor(config.colors.success)
          .setTimestamp()
      ],
    });
  } else {
    await safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Transfer Failed').setDescription(result.error || 'Transfer failed').setColor(config.colors.error)],
      flags: 64,
    });
  }
}

// === NAVIGATION HELPERS ===

async function navToAccount(interaction) {
  const { getUser } = require('../systems/economy');
  const { getXpInfo } = require('../systems/xp');
  const { getRepInfo } = require('../systems/reputation');
  const { getMemberRoleName } = require('../utils/permissions');
  const { getRankForXp, formatCredits } = require('../utils/helpers');
  const { getAchievements, getAllAchievements } = require('../systems/achievements');
  const { getStaffRole } = require('../utils/permissions');

  const PRESIDENT_GIFS = [
    'https://c.tenor.com/YW9ehEp6X0kAAAAd/tenor.gif',
    'https://c.tenor.com/Z31b_uCKPVEAAAAd/tenor.gif',
  ];

  const userData = getUser(interaction.user.id, interaction.guild.id);
  const xpInfo = getXpInfo(interaction.user.id, interaction.guild.id);
  const rank = getRankForXp(userData.total_xp);
  const repInfo = getRepInfo(interaction.user.id, interaction.guild.id);
  const roleName = getMemberRoleName(interaction.member);
  const staffRole = getStaffRole(interaction.member);

  const divider = '\u2501'.repeat(32);

  const embed = new EmbedBuilder()
    .setAuthor({ name: `${interaction.user.username} \u2014 Account`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
    .setColor(config.colors.primary)
    .setDescription(
      `Select a section from the dropdown below.\n\n` +
      `${divider}\n` +
      `**Level** ${xpInfo.level} \u00b7 ${rank.name}  \u00b7  **XP** ${xpInfo.xp}/${xpInfo.xpNeeded}\n` +
      `**Credits** ${formatCredits(userData.credits)}  \u00b7  **Reputation** ${repInfo.score}/100\n` +
      `**Role** ${roleName}\n` +
      `${divider}`
    )
    .setFooter({ text: 'NEXAVERSE Account System' })
    .setTimestamp();

  // GIF for President/Co-President
  if (staffRole && (staffRole.name === 'PRESIDENT' || staffRole.name === 'CO_PRESIDENT')) {
    embed.setImage(PRESIDENT_GIFS[Math.floor(Math.random() * PRESIDENT_GIFS.length)]);
  } else {
    embed.setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));
  }

  const select = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('account_select')
      .setPlaceholder('Browse your account...')
      .addOptions([
        { label: 'Profile', value: 'profile', description: 'View your visual profile card' },
        { label: 'Activity', value: 'activity', description: 'Messages, XP and level' },
        { label: 'Reputation', value: 'reputation', description: 'Trust score and restrictions' },
        { label: 'Achievements', value: 'achievements', description: 'Unlocked achievements' },
        { label: 'Transactions', value: 'transactions', description: 'Recent credit history' },
        { label: 'Invites', value: 'invites', description: 'Invite statistics' },
      ])
  );

  await interaction.update({ embeds: [embed], files: [], components: [select] });
}

async function navToWallet(interaction) {
  const { getUser } = require('../systems/economy');
  const { getRepInfo } = require('../systems/reputation');
  const { formatCredits, getEffectiveMaxTransfer } = require('../utils/helpers');

  const userData = getUser(interaction.user.id, interaction.guild.id);
  const repInfo = getRepInfo(interaction.user.id, interaction.guild.id);
  const maxTransfer = getEffectiveMaxTransfer(userData.reputation);

  const divider = '\u2501'.repeat(32);

  const embed = new EmbedBuilder()
    .setAuthor({ name: `${interaction.user.username} \u2014 Wallet`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
    .setTitle('NEXAVERSE \u00b7 Wallet')
    .setColor(config.colors.economy)
    .setDescription(`${divider}\n**Balance** ${formatCredits(userData.credits)}\n**Reputation** ${repInfo.score}/100 \u00b7 ${repInfo.level.label}\n**Max Transfer** ${formatCredits(maxTransfer)}\n${divider}`)
    .setFooter({ text: 'NEXAVERSE Wallet System' })
    .setTimestamp();

  const select = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('wallet_action_select')
      .setPlaceholder('Choose an action...')
      .addOptions([
        { label: 'Claim Daily', value: 'daily', description: 'Claim daily reward' },
        { label: 'Claim Weekly', value: 'weekly', description: 'Claim weekly reward' },
        { label: 'Transfer', value: 'transfer', description: 'Send credits to a user' },
        { label: 'Transactions', value: 'transactions', description: 'Recent activity' },
        { label: 'Leaderboard', value: 'leaderboard', description: 'Top earners' },
      ])
  );

  await interaction.update({ embeds: [embed], files: [], components: [select] });
}

async function navToGames(interaction) {
  const { getUser } = require('../systems/economy');
  const { getRepInfo } = require('../systems/reputation');
  const { formatCredits, getEffectiveMaxBet } = require('../utils/helpers');

  const userData = getUser(interaction.user.id, interaction.guild.id);
  const repInfo = getRepInfo(interaction.user.id, interaction.guild.id);
  const maxBet = getEffectiveMaxBet(userData.reputation);

  const divider = '\u2501'.repeat(32);

  const embed = new EmbedBuilder()
    .setAuthor({ name: `${interaction.user.username} \u2014 Games`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
    .setTitle('NEXAVERSE \u00b7 Games Arcade')
    .setColor(config.colors.game)
    .setDescription(`${divider}\n**Balance** ${formatCredits(userData.credits)}  \u00b7  **Max Bet** ${formatCredits(maxBet)}\n**Reputation** ${repInfo.score}/100 \u00b7 ${repInfo.level.label}\n${divider}\nOne game at a time. All results are logged.`)
    .setFooter({ text: 'NEXAVERSE Games Arcade' })
    .setTimestamp();

  const select = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('game_select')
      .setPlaceholder('Select a game...')
      .addOptions([
        { label: 'Roulette', value: 'roulette', description: 'Red, black, green, or a number 0-36' },
        { label: 'Coinflip', value: 'coinflip', description: 'Heads or tails \u00b7 2x payout' },
        { label: 'Blackjack', value: 'blackjack', description: 'Beat the dealer to 21 \u00b7 2.5x' },
        { label: 'Slots', value: 'slots', description: 'Match symbols \u00b7 up to 100x' },
        { label: 'Dice', value: 'dice', description: 'Predict the roll \u00b7 6x payout' },
        { label: 'Higher / Lower', value: 'higherlower', description: 'Guess the next number \u00b7 3x' },
        { label: 'Rock Paper Scissors', value: 'rps', description: 'Beat the bot \u00b7 2x payout' },
      ])
  );

  await interaction.update({ embeds: [embed], files: [], components: [select] });
}

async function navToModSelect(interaction) {
  const { isStaff, getStaffRole } = require('../utils/permissions');
  if (!isStaff(interaction.member)) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Staff Only').setColor(config.colors.error)],
      flags: 64,
    });
  }

  const staffRole = getStaffRole(interaction.member);
  const divider = '\u2501'.repeat(32);

  const embed = new EmbedBuilder()
    .setTitle('Moderation Panel')
    .setColor(config.colors.moderation)
    .setDescription(`${divider}\n**Your Level:** ${staffRole?.label || 'Staff'}\n\nSelect a member below to moderate.\n${divider}`)
    .setTimestamp();

  const userSelect = new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId('mod_user_select')
      .setPlaceholder('Select a member to moderate...')
      .setMinValues(1)
      .setMaxValues(1)
  );

  await interaction.update({ embeds: [embed], components: [userSelect] });
}

// === MOD USER SELECT -> ACTION PANEL ===

async function handleModUserSelect(interaction) {
  const { isStaff, getStaffRole } = require('../utils/permissions');
  if (!isStaff(interaction.member)) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Staff Only').setColor(config.colors.error)],
      flags: 64,
    });
  }

  const targetId = interaction.values[0];
  const target = await interaction.guild.members.fetch(targetId).catch(() => null);
  if (!target) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Error').setDescription('Member not found.').setColor(config.colors.error)],
      flags: 64,
    });
  }

  const staffRole = getStaffRole(interaction.member);
  const divider = '\u2501'.repeat(32);

  const embed = new EmbedBuilder()
    .setTitle('Moderation Actions')
    .setColor(config.colors.moderation)
    .setDescription(
      `${divider}\n**Target:** ${target.user.tag} (${target.user.id})\n**Your Level:** ${staffRole?.label || 'Staff'}\n${divider}\n\nSelect an action from the menu below.`
    )
    .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
    .setTimestamp();

  const select = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`mod_action_select_${targetId}`)
      .setPlaceholder('Select an action...')
      .addOptions([
        { label: 'Warn', value: 'warn', description: 'Issue a warning' },
        { label: 'Timeout', value: 'timeout', description: 'Timeout the member' },
        { label: 'Untimeout', value: 'untimeout', description: 'Remove timeout' },
        { label: 'Kick', value: 'kick', description: 'Kick from server' },
        { label: 'Ban', value: 'ban', description: 'Ban from server' },
        { label: 'Reputation', value: 'reputation', description: 'Adjust reputation score' },
        { label: 'Purge', value: 'purge', description: 'Delete messages' },
        { label: 'Slowmode', value: 'slowmode', description: 'Set channel slowmode' },
        { label: 'Cases', value: 'cases', description: 'View mod history' },
      ])
  );

  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('mod_back_to_select').setLabel('Back').setStyle(ButtonStyle.Secondary)
  );

  await interaction.update({ embeds: [embed], components: [select, backRow] });
}

// === MOD ACTION SELECT -> OPEN MODAL ===

const MOD_ACTIONS_REQUIRING_REASON = ['warn', 'timeout', 'kick', 'ban'];

async function handleModActionSelect(interaction, id) {
  const { isStaff, getStaffRole, canModerate } = require('../utils/permissions');
  if (!isStaff(interaction.member)) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Staff Only').setColor(config.colors.error)],
      flags: 64,
    });
  }

  const targetId = id.replace('mod_action_select_', '');
  const action = interaction.values[0];

  // Special actions (no modal)
  if (action === 'untimeout' || action === 'unmute') {
    return executeModAction(interaction, targetId, action, 'Timeout removed by staff');
  }
  if (action === 'cases') {
    return showModCases(interaction, targetId);
  }
  if (action === 'purge') {
    return showPurgeModal(interaction, targetId);
  }
  if (action === 'slowmode') {
    return showSlowmodeModal(interaction);
  }
  if (action === 'reputation') {
    return showReputationModal(interaction, targetId);
  }

  if (!MOD_ACTIONS_REQUIRING_REASON.includes(action)) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Unknown Action').setColor(config.colors.error)],
      flags: 64,
    });
  }

  // Hierarchy check before opening the modal
  const target = await interaction.guild.members.fetch(targetId).catch(() => null);
  if (!target) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Error').setDescription('Member not found. They may have left.')],
      flags: 64,
    });
  }
  if (target.user.bot) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Invalid Target').setDescription('Bots cannot be moderated through this panel.')],
      flags: 64,
    });
  }
  if (targetId === interaction.user.id) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Invalid Target').setDescription('You cannot moderate yourself.')],
      flags: 64,
    });
  }
  const { canPerformAction } = require('../components/moderationPanel');
  const check = canPerformAction(interaction.member, action, target);
  if (!check.allowed) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Not Permitted').setDescription(check.error)],
      flags: 64,
    });
  }

  // Enforce role-based permission system
  const { canPerformAction: canDo } = require('../utils/permissions');
  const permMap = { warn: 'warn', kick: 'kick', ban: 'ban', timeout: 'timeout', untimeout: 'untimeout', reputation: 'reputation', mute: 'mute', unmute: 'unmute' };
  if (permMap[action] && !canDo(interaction.member, permMap[action])) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Not Permitted').setDescription('Your staff level does not permit this action.')],
      flags: 64,
    });
  }

  // Ban/kick require higher clearance than warn
  const staffRole = getStaffRole(interaction.member);
  if ((action === 'ban' || action === 'kick') && (!staffRole || staffRole.level < 2)) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Not Permitted').setDescription('Moderator level required for kick and ban.')],
      flags: 64,
    });
  }

  const needsDuration = action === 'timeout';
  const modal = new ModalBuilder()
    .setCustomId(`mod_execute_${action}_${targetId}_${interaction.user.id}`)
    .setTitle(`${action.charAt(0).toUpperCase() + action.slice(1)} Member`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('reason').setLabel('Reason').setPlaceholder('Explain why this action is taken').setStyle(TextInputStyle.Short).setMinLength(3).setMaxLength(200).setRequired(true)
      ),
      ...(needsDuration ? [
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('duration').setLabel('Duration').setPlaceholder('e.g. 10m, 1h, 1d, 1w').setStyle(TextInputStyle.Short).setRequired(true)
        )
      ] : [])
    );

  await interaction.showModal(modal);
}

async function showModCases(interaction, targetId) {
  const { getUserCases } = require('../systems/moderation');
  const cases = getUserCases(targetId, 10);
  const divider = '\u2501'.repeat(32);

  let desc = `${divider}\n`;
  if (!cases || cases.length === 0) {
    desc += 'No moderation history.';
  } else {
    for (const c of cases) {
      desc += `**${c.id}** ${c.action} \u2014 ${c.reason}\n`;
      desc += `<t:${Math.floor(c.created_at / 1000)}:R> by <@${c.moderator_id}>\n`;
    }
  }
  desc += `\n${divider}`;

  const target = await interaction.guild.members.fetch(targetId).catch(() => null);
  const embed = new EmbedBuilder()
    .setTitle(`NEXAVERSE \u00b7 Cases \u2014 ${target ? target.user.username : targetId}`)
    .setDescription(desc)
    .setColor(config.colors.moderation)
    .setTimestamp();

  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('mod_back_to_select').setLabel('Back').setStyle(ButtonStyle.Secondary)
  );
  await interaction.update({ embeds: [embed], components: [backRow] });
}

function showPurgeModal(interaction, targetId) {
  const modal = new ModalBuilder()
    .setCustomId(`mod_execute_purge_${targetId}_${interaction.user.id}`)
    .setTitle('Purge Messages')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('count').setLabel('Amount (2-100)').setPlaceholder('50').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('reason').setLabel('Reason').setPlaceholder('Why is this purge happening').setStyle(TextInputStyle.Short).setRequired(true)
      )
    );
  return interaction.showModal(modal);
}

function showSlowmodeModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId(`mod_execute_slowmode_0_${interaction.user.id}`)
    .setTitle('Channel Slowmode')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('seconds').setLabel('Seconds (0 = off)').setPlaceholder('10').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('reason').setLabel('Reason').setPlaceholder('Why is slowmode being set').setStyle(TextInputStyle.Short).setRequired(false)
      )
    );
  return interaction.showModal(modal);
}

function showReputationModal(interaction, targetId) {
  const modal = new ModalBuilder()
    .setCustomId(`mod_execute_rep_${targetId}_${interaction.user.id}`)
    .setTitle('Adjust Reputation')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('amount').setLabel('Amount (+ or -)').setPlaceholder('e.g. +5 or -10').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('reason').setLabel('Reason').setPlaceholder('Why is reputation changing').setStyle(TextInputStyle.Short).setRequired(false)
      )
    );
  return interaction.showModal(modal);
}

async function executeModAction(interaction, targetId, action, reason, durationMs = 0) {
  const { isStaff, getStaffLevel } = require('../utils/permissions');
  const { warn, timeout, removeTimeout, kick, ban, unban, mute, unmute } = require('../systems/moderation');
  const { sendDMById, modActionDM } = require('../utils/dm');
  const { log } = require('../systems/logging');

  if (!isStaff(interaction.member)) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Staff Only').setColor(config.colors.error)],
      flags: 64,
    });
  }

  await interaction.deferReply();

  const guild = interaction.guild;
  let target = await guild.members.fetch(targetId).catch(() => null);
  let caseId = null;
  let dmOutcome = 'not sent (not in server)';

  try {
    switch (action) {
      case 'warn': {
        const result = warn(targetId, interaction.user.id, reason, guild.id);
        caseId = result.caseId;
        if (target) {
          const dm = await sendDMById(guild, targetId, modActionDM({ action: 'warn', caseId, reason, moderatorId: interaction.user.id, guildName: guild.name }));
          dmOutcome = dm.sent ? 'sent' : 'failed (DMs closed)';
        }
        break;
      }
      case 'timeout': {
        if (target) {
          await target.timeout(durationMs, `[${interaction.user.username}] ${reason}`);
        }
        const result = timeout(targetId, interaction.user.id, durationMs, reason, guild.id);
        caseId = result.caseId;
        if (target) {
          const mins = Math.round(durationMs / 60000);
          const dm = await sendDMById(guild, targetId, modActionDM({ action: 'timeout', caseId, reason, duration: mins >= 60 ? `${Math.round(mins / 60)}h` : `${mins}m`, moderatorId: interaction.user.id, guildName: guild.name }));
          dmOutcome = dm.sent ? 'sent' : 'failed (DMs closed)';
        }
        break;
      }
      case 'untimeout': {
        if (target) await target.timeout(null, reason);
        const result = removeTimeout(targetId, interaction.user.id, reason, guild.id);
        caseId = result.caseId;
        break;
      }
      case 'kick': {
        if (target) {
          // DM before kicking — cannot DM after they leave
          const dm = await sendDMById(guild, targetId, modActionDM({ action: 'kick', caseId: 'pending', reason, moderatorId: interaction.user.id, guildName: guild.name }));
          dmOutcome = dm.sent ? 'sent' : 'failed (DMs closed)';
          await target.kick(`[${interaction.user.username}] ${reason}`);
        }
        const result = kick(targetId, interaction.user.id, reason, guild.id);
        caseId = result.caseId;
        break;
      }
      case 'ban': {
        const banTarget = target ? target.user : await interaction.client.users.fetch(targetId).catch(() => null);
        if (banTarget) {
          const { sendDM } = require('../utils/dm');
          const dm = await sendDM(banTarget, modActionDM({ action: 'ban', caseId: 'pending', reason, moderatorId: interaction.user.id, guildName: guild.name }));
          dmOutcome = dm.sent ? 'sent' : 'failed (DMs closed)';
        }
        await guild.members.ban(targetId, { reason: `[${interaction.user.username}] ${reason}` });
        const result = ban(targetId, interaction.user.id, reason, { guildId: guild.id });
        caseId = result.caseId;
        break;
      }
      case 'unban': {
        await guild.members.unban(targetId, reason).catch(() => {});
        const result = unban(targetId, interaction.user.id, reason, guild.id);
        caseId = result.caseId;
        break;
      }
      case 'mute': {
        const result = mute(targetId, interaction.user.id, reason, guild.id);
        caseId = result.caseId;
        break;
      }
      case 'unmute': {
        const result = unmute(targetId, interaction.user.id, reason, guild.id);
        caseId = result.caseId;
        break;
      }
      default:
        return interaction.editReply({ embeds: [err('Unknown Action', 'Unsupported moderation action.')] });
    }
  } catch (discordError) {
    console.error(`[MOD] Discord API error (${action}):`, discordError.message);
    return interaction.editReply({
      embeds: [err('Action Failed', `Discord rejected the ${action}: ${discordError.message}. Check the bot's role position and permissions.`)],
    });
  }

  // Log to moderation channel
  await log(guild, 'moderation', `Moderation \u2014 ${action.charAt(0).toUpperCase() + action.slice(1)}`, {
    actor: interaction.user.id,
    target: targetId,
    reason,
    caseId: caseId || 'N/A',
    footer: `DM notification: ${dmOutcome}`,
  }).catch(() => {});

  const divider = '\u2501'.repeat(32);
  const embed = new EmbedBuilder()
    .setTitle(`NEXAVERSE \u00b7 ${action.charAt(0).toUpperCase() + action.slice(1)} Complete`)
    .setColor(config.colors.moderation)
    .setDescription(
      `${divider}\n` +
      `**Target** <@${targetId}>\n` +
      `**Action** ${action.charAt(0).toUpperCase() + action.slice(1)}\n` +
      (durationMs ? `**Duration** ${Math.round(durationMs / 60000)} minutes\n` : '') +
      `**Reason** ${reason}\n` +
      `**Case** ${caseId || 'N/A'}\n` +
      `**DM** ${dmOutcome}\n` +
      `${divider}`
    )
    .setFooter({ text: `By ${interaction.user.username}` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function executeReputation(interaction, targetId, reason) {
  const { isStaff, getStaffLevel } = require('../utils/permissions');
  if (!isStaff(interaction.member) || getStaffLevel(interaction.member) < 2) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Not Permitted').setDescription('Moderator level required to adjust reputation.')],
      flags: 64,
    });
  }

  await interaction.deferReply();

  const guildId = interaction.guild.id;
  const { getUser } = require('../systems/economy');
  const { getReputation, setReputation } = require('../systems/reputation');
  const { sendDMById } = require('../utils/dm');
  const { log } = require('../systems/logging');

  // Ensure the user row exists so the reputation update actually persists
  getUser(targetId, guildId);

  const raw = (interaction.fields && interaction.fields.getTextInputValue('amount')) || '';
  const trimmed = raw.trim();
  if (!/^[+-]?\d+$/.test(trimmed)) {
    return interaction.editReply({
      embeds: [err('Invalid Amount', 'Enter a whole number like +5 or -10.')],
    });
  }
  const amount = parseInt(trimmed, 10);
  if (amount === 0) {
    return interaction.editReply({
      embeds: [err('Invalid Amount', 'Amount cannot be zero.')],
    });
  }

  const before = getReputation(targetId, guildId);
  const after = setReputation(targetId, before + amount, guildId);
  const delta = after - before;

  await log(interaction.guild, 'moderation', 'Moderation \u2014 Reputation Adjusted', {
    actor: interaction.user.id,
    target: targetId,
    reason: `${delta > 0 ? '+' : ''}${delta} \u2014 ${reason || 'No reason'}`,
  }).catch(() => {});

  let dmOutcome = 'not sent';
  try {
    const member = await interaction.guild.members.fetch(targetId).catch(() => null);
    if (member && !member.user.bot) {
      const dmEmbed = new EmbedBuilder()
        .setAuthor({ name: 'NEXAVERSE Moderation' })
        .setTitle('Reputation Updated')
        .setColor(delta > 0 ? config.colors.success : config.colors.warning)
        .setDescription(
          `${'\u2501'.repeat(32)}\n` +
          `**Server** ${interaction.guild.name}\n` +
          `**Change** ${delta > 0 ? '+' : ''}${delta}\n` +
          `**New Score** ${after}\n` +
          (reason ? `**Reason** ${reason}\n` : '') +
          `**By** <@${interaction.user.id}>\n` +
          `${'\u2501'.repeat(32)}`
        )
        .setTimestamp();
      const dm = await sendDMById(interaction.guild, targetId, dmEmbed);
      dmOutcome = dm.sent ? 'sent' : 'failed (DMs closed)';
    }
  } catch (e) {}

  const divider = '\u2501'.repeat(32);
  const embed = new EmbedBuilder()
    .setTitle('NEXAVERSE \u00b7 Reputation Updated')
    .setColor(delta > 0 ? config.colors.success : config.colors.warning)
    .setDescription(
      `${divider}\n` +
      `**Target** <@${targetId}>\n` +
      `**Change** ${delta > 0 ? '+' : ''}${delta}\n` +
      `**Before** ${before}\n` +
      `**After** ${after}\n` +
      `**Reason** ${reason || 'No reason'}\n` +
      `**DM** ${dmOutcome}\n` +
      `${divider}`
    )
    .setFooter({ text: `By ${interaction.user.username}` })
    .setTimestamp();

  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('mod_back_to_select').setLabel('Back').setStyle(ButtonStyle.Secondary)
  );
  await interaction.editReply({ embeds: [embed], components: [backRow] });
}

function err(title, description) {
  return new EmbedBuilder().setTitle(title).setDescription(description).setColor(config.colors.error);
}

// === PURGE & SLOWMODE EXECUTION ===

async function executePurge(interaction, targetId, reason) {
  const { isStaff } = require('../utils/permissions');
  if (!isStaff(interaction.member)) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Staff Only').setColor(config.colors.error)],
      flags: 64,
    });
  }

  const count = parseInt(interaction.fields.getTextInputValue('count'));
  if (isNaN(count) || count < 2 || count > 100) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Invalid Amount').setDescription('Enter a number between 2 and 100.')],
      flags: 64,
    });
  }

  await interaction.deferReply({ flags: 64 });

  try {
    // Collect messages, filter by target if provided
    const fetched = await interaction.channel.messages.fetch({ limit: 100 });
    let toDelete = [...fetched.values()];
    if (targetId && targetId !== '0') {
      toDelete = toDelete.filter(m => m.author.id === targetId);
    }
    toDelete = toDelete.slice(0, count).filter(m => Date.now() - m.createdTimestamp < 14 * 86400000);

    await interaction.channel.bulkDelete(toDelete, true);

    const { log } = require('../systems/logging');
    await log(interaction.guild, 'moderation', 'Moderation \u2014 Purge', {
      actor: interaction.user.id,
      target: targetId || 'channel',
      reason: `${reason} (${toDelete.length} messages)`,
    }).catch(() => {});

    const embed = new EmbedBuilder()
      .setTitle('NEXAVERSE \u00b7 Purge Complete')
      .setColor(config.colors.moderation)
      .setDescription(`Deleted **${toDelete.length}** messages.${targetId && targetId !== '0' ? ` from <@${targetId}>` : ''}\n**Reason** ${reason}`)
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } catch (e) {
    await interaction.editReply({
      embeds: [new EmbedBuilder().setTitle('Purge Failed').setDescription(e.message).setColor(config.colors.error)],
    });
  }
}

async function executeSlowmode(interaction, reason) {
  const { isStaff, getStaffLevel } = require('../utils/permissions');
  if (!isStaff(interaction.member) || getStaffLevel(interaction.member) < 2) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Not Permitted').setDescription('Moderator level required for slowmode.')],
      flags: 64,
    });
  }

  const seconds = parseInt(interaction.fields.getTextInputValue('seconds'));
  if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Invalid Duration').setDescription('Enter seconds between 0 (off) and 21600 (6h).')],
      flags: 64,
    });
  }

  await interaction.deferReply({ flags: 64 });
  try {
    await interaction.channel.setRateLimitPerUser(seconds, `[${interaction.user.username}] ${reason}`);

    const { log } = require('../systems/logging');
    await log(interaction.guild, 'moderation', 'Moderation \u2014 Slowmode', {
      actor: interaction.user.id,
      reason: `${seconds}s \u2014 ${reason}`,
    }).catch(() => {});

    const embed = new EmbedBuilder()
      .setTitle('NEXAVERSE \u00b7 Slowmode Set')
      .setColor(config.colors.moderation)
      .setDescription(`Slowmode is now **${seconds === 0 ? 'off' : `${seconds}s`}** in this channel.\n**Reason** ${reason}`)
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } catch (e) {
    await interaction.editReply({
      embeds: [new EmbedBuilder().setTitle('Slowmode Failed').setDescription(e.message).setColor(config.colors.error)],
    });
  }
}

// === WALLET TRANSFER SELECT ===

async function handleWalletTransferSelect(interaction, id) {
  const ownerId = id.replace('wallet_transfer_select_', '');
  if (ownerId !== interaction.user.id) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Not Your Panel').setDescription('This is not your transfer panel.')],
      flags: 64,
    });
  }

  const recipientId = interaction.values[0];
  if (recipientId === interaction.user.id) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Invalid Recipient').setDescription('You cannot transfer to yourself.')],
      flags: 64,
    });
  }

  const modal = new ModalBuilder()
    .setCustomId(`transfer_modal_${interaction.user.id}_${recipientId}`)
    .setTitle('Transfer Credits')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('amount').setLabel('Amount').setPlaceholder('e.g. 500').setStyle(TextInputStyle.Short).setRequired(true)
      )
    );

  await interaction.showModal(modal);
}

// === MOD EXECUTION MODALS ===

function registerModModals(client) {
  // Handled via prefix matching in interactionCreate
}

// === STAFF PANEL SELECT ===

async function handleStaffPanelSelect(interaction) {
  const { isStaff } = require('../utils/permissions');
  if (!isStaff(interaction.member)) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Staff Only').setColor(config.colors.error)],
      flags: 64,
    });
  }

  const category = interaction.values[0];
  const divider = '\u2501'.repeat(32);

  const panels = {
    moderation: { title: 'Moderation', desc: 'Use `/moderation` to access moderation tools.' },
    cases: { title: 'Cases', desc: 'Use `/moderation` and select Cases.' },
    reports: { title: 'Reports', desc: 'Report management.' },
    tickets: { title: 'Tickets', desc: 'Ticket management.' },
    security: { title: 'Security', desc: 'Security controls.' },
    economy: { title: 'Economy', desc: 'Economy management.' },
    applications: { title: 'Applications', desc: 'Application management.' },
    logs: { title: 'Logs', desc: 'Log viewer.' },
  };

  const panel = panels[category] || { title: category, desc: 'Coming soon.' };
  const embed = new EmbedBuilder()
    .setTitle(panel.title)
    .setDescription(`${divider}\n${panel.desc}\n${divider}`)
    .setColor(config.colors.staff)
    .setTimestamp();
  await safeReply(interaction, { embeds: [embed] });
}

// === HELP CATEGORY SELECT ===

async function handleHelpCategorySelect(interaction) {
  const { CATEGORIES } = require('../commands/help');
  const category = interaction.values[0];
  const divider = '\u2501'.repeat(32);

  const cat = CATEGORIES[category] || { title: category, desc: 'No commands listed.' };
  const embed = new EmbedBuilder()
    .setTitle(`NEXAVERSE \u00b7 ${cat.title}`)
    .setDescription(`${divider}\n${cat.desc}\n${divider}`)
    .setColor(config.colors.primary)
    .setTimestamp();

  const rows = [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('help_category_select')
        .setPlaceholder('Browse commands by category...')
        .addOptions([
          { label: 'General', value: 'general', description: 'Account, wallet, games' },
          { label: 'Moderation', value: 'moderation', description: 'Mod tools and staff' },
          { label: 'Utility', value: 'utility', description: 'Ping, info, verify, poll' },
          { label: 'Staff', value: 'staff', description: 'Staff panel and config' },
        ])
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('help_home').setLabel('Home').setStyle(ButtonStyle.Secondary)
    ),
  ];

  await interaction.update({ embeds: [embed], files: [], components: rows });
}

async function navToHelpHome(interaction) {
  const { homeEmbed } = require('../commands/help');
  const { generateBrandBanner } = require('../utils/images');
  const banner = await generateBrandBanner('NEXAVERSE', 'HELP CENTER');

  const rows = [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('help_category_select')
        .setPlaceholder('Browse commands by category...')
        .addOptions([
          { label: 'General', value: 'general', description: 'Account, wallet, games' },
          { label: 'Moderation', value: 'moderation', description: 'Mod tools and staff' },
          { label: 'Utility', value: 'utility', description: 'Ping, info, verify, poll' },
          { label: 'Staff', value: 'staff', description: 'Staff panel and config' },
        ])
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('help_home').setLabel('Home').setStyle(ButtonStyle.Secondary)
    ),
  ];

  await interaction.update({ embeds: [homeEmbed(banner)], files: [banner], components: rows });
}

// === CONFIG SELECT ===

async function handleConfigSelect(interaction) {
  const { isAdmin, getStaffLevel } = require('../utils/permissions');
  if (!isAdmin(interaction.member) && getStaffLevel(interaction.member) < 4) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Access Denied').setDescription('Administrator or Head of Staff required.').setColor(config.colors.error)],
      flags: 64,
    });
  }

  const category = interaction.values[0];

  if (category === 'credits') {
    return showCreditsUserSelect(interaction);
  }

  const { CATEGORY_SETTINGS, getSettingValue } = require('../commands/config');
  const cat = CATEGORY_SETTINGS[category];
  if (!cat) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Unknown Category').setColor(config.colors.error)],
      flags: 64,
    });
  }

  const divider = '\u2501'.repeat(32);

  // Build settings overview with current values
  let desc = `${divider}\n**${cat.title} Settings**\n\n`;
  const settingKeys = Object.keys(cat.settings);
  for (const key of settingKeys) {
    const s = cat.settings[key];
    const value = getSettingValue(interaction.guild.id, key, s.default);
    const display = s.kind === 'onoff' ? (value === '1' ? 'Enabled' : 'Disabled') : value;
    desc += `**${s.label}** — ${display}\n`;
  }
  desc += `${divider}\nSelect a setting below to change it.`;

  const embed = new EmbedBuilder()
    .setTitle(`NEXAVERSE · ${cat.title}`)
    .setDescription(desc)
    .setColor(config.colors.staff)
    .setTimestamp();

  const settingSelect = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`config_edit_${category}`)
      .setPlaceholder('Select a setting to edit...')
      .addOptions(settingKeys.map(key => ({
        label: cat.settings[key].label,
        value: key,
      })))
  );

  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('config_home').setLabel('Back').setStyle(ButtonStyle.Secondary)
  );

  await interaction.update({ embeds: [embed], files: [], components: [settingSelect, backRow] });
}

async function handleConfigEditSelect(interaction, customId) {
  const { isAdmin, getStaffLevel } = require('../utils/permissions');
  if (!isAdmin(interaction.member) && getStaffLevel(interaction.member) < 4) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Access Denied').setColor(config.colors.error)],
      flags: 64,
    });
  }

  const category = customId.replace('config_edit_', '');
  const { CATEGORY_SETTINGS, getSettingValue } = require('../commands/config');
  const cat = CATEGORY_SETTINGS[category];
  const settingKey = interaction.values[0];
  const setting = cat.settings[settingKey];
  if (!cat || !setting) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Unknown Setting').setColor(config.colors.error)],
      flags: 64,
    });
  }

  const currentValue = getSettingValue(interaction.guild.id, settingKey, setting.default);

  // On/off toggles flip instantly
  if (setting.kind === 'onoff') {
    const { setConfig } = require('../systems/config');
    const newValue = currentValue === '1' ? '0' : '1';
    setConfig(interaction.guild.id, `cfg_${settingKey}`, newValue);

    const { log } = require('../systems/logging');
    log(interaction.guild, 'staff', 'Setting Changed', {
      actor: interaction.user.id,
      reason: `${cat.title} · ${setting.label}: ${newValue === '1' ? 'Enabled' : 'Disabled'}`,
    }).catch(() => {});

    // Re-render the category view in-place
    interaction.values = [category];
    return handleConfigSelect(interaction);
  }

  // number/text -> open edit modal
  const modal = new ModalBuilder()
    .setCustomId(`config_set_${category}_${settingKey}`)
    .setTitle(`Edit — ${setting.label}`.substring(0, 45))
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('value')
          .setLabel(setting.kind === 'number' ? 'New Number Value' : 'New Value')
          .setPlaceholder(`Current: ${currentValue}`)
          .setValue(currentValue)
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
  await interaction.showModal(modal);
}

function settingKeys(category) {
  const { CATEGORY_SETTINGS } = require('../commands/config');
  return Object.keys(CATEGORY_SETTINGS[category]?.settings || {});
}

async function handleConfigSetModal(interaction, customId) {
  const { isAdmin, getStaffLevel } = require('../utils/permissions');
  if (!isAdmin(interaction.member) && getStaffLevel(interaction.member) < 4) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Access Denied').setColor(config.colors.error)],
      flags: 64,
    });
  }

  // config_set_<category>_<settingKey>
  const rest = customId.replace('config_set_', '');
  const idx = rest.indexOf('_');
  const category = rest.substring(0, idx);
  const settingKey = rest.substring(idx + 1);

  const { CATEGORY_SETTINGS } = require('../commands/config');
  const cat = CATEGORY_SETTINGS[category];
  const setting = cat?.settings[settingKey];
  if (!cat || !setting) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Unknown Setting').setColor(config.colors.error)],
      flags: 64,
    });
  }

  const rawValue = interaction.fields.getTextInputValue('value').trim();
  const { setConfig } = require('../systems/config');

  if (setting.kind === 'number') {
    const num = Number(rawValue);
    if (isNaN(num) || num < 0 || num > 10000000) {
      return safeReply(interaction, {
        embeds: [new EmbedBuilder().setTitle('Invalid Value').setDescription('Enter a number between 0 and 10,000,000.')],
        flags: 64,
      });
    }
    setConfig(interaction.guild.id, `cfg_${settingKey}`, String(num));
  } else {
    if (rawValue.length > 100) {
      return safeReply(interaction, {
        embeds: [new EmbedBuilder().setTitle('Too Long').setDescription('Max 100 characters.')],
        flags: 64,
      });
    }
    setConfig(interaction.guild.id, `cfg_${settingKey}`, rawValue);
  }

  const { log } = require('../systems/logging');
  log(interaction.guild, 'staff', 'Setting Changed', {
    actor: interaction.user.id,
    reason: `${cat.title} · ${setting.label}: ${rawValue}`,
  }).catch(() => {});

  const embed = new EmbedBuilder()
    .setTitle('Setting Saved')
    .setDescription(`**${setting.label}** is now set to \`${rawValue}\``)
    .setColor(config.colors.success)
    .setTimestamp();

  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`config_back_${category}`).setLabel('Back').setStyle(ButtonStyle.Secondary)
  );

  await safeReply(interaction, { embeds: [embed], components: [backRow] });
}

async function handleConfigHome(interaction) {
  const { isAdmin, getStaffLevel } = require('../utils/permissions');
  if (!isAdmin(interaction.member) && getStaffLevel(interaction.member) < 4) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Access Denied').setColor(config.colors.error)],
      flags: 64,
    });
  }
  const { buildHomeEmbed } = require('../commands/config');
  const { embed, select } = buildHomeEmbed(interaction.guild);
  await interaction.update({ embeds: [embed], files: [], components: [select] });
}

async function handleConfigBack(interaction, customId) {
  const category = customId.replace('config_back_', '');
  // Simulate a config_select with the category pre-chosen
  interaction.values = [category];
  return handleConfigSelect(interaction);
}

// === CREDITS MANAGER ===

async function showCreditsUserSelect(interaction) {
  const divider = '\u2501'.repeat(32);
  const embed = new EmbedBuilder()
    .setTitle('NEXAVERSE · Credits Manager')
    .setColor(config.colors.economy)
    .setDescription(`${divider}\nSelect a member, then choose to **add**, **set**, or **remove** credits.\nAll changes are logged and the target is DM'd.\n${divider}`)
    .setTimestamp();

  const userSelect = new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId('credits_user_select')
      .setPlaceholder('Select a member...')
      .setMinValues(1)
      .setMaxValues(1)
  );

  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('config_home').setLabel('Back').setStyle(ButtonStyle.Secondary)
  );

  await interaction.update({ embeds: [embed], files: [], components: [userSelect, backRow] });
}

async function handleCreditsUserSelect(interaction) {
  const { isAdmin, getStaffLevel } = require('../utils/permissions');
  const level = getStaffLevel(interaction.member);
  if (!isAdmin(interaction.member) && level < 4) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Access Denied').setColor(config.colors.error)],
      flags: 64,
    });
  }

  const targetId = interaction.values[0];
  const { getUser } = require('../systems/economy');
  const { formatCredits } = require('../utils/helpers');
  const userData = getUser(targetId, interaction.guild.id);
  const target = await interaction.guild.members.fetch(targetId).catch(() => null);
  const divider = '\u2501'.repeat(32);

  const embed = new EmbedBuilder()
    .setTitle('NEXAVERSE · Credits Manager')
    .setColor(config.colors.economy)
    .setDescription(
      `${divider}\n` +
      `**Member** ${target ? target.user.username : targetId}\n` +
      `**Current Balance** ${formatCredits(userData.credits)}\n` +
      `${divider}\n` +
      `Choose an action:`
    )
    .setTimestamp();

  const select = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`credits_action_${targetId}`)
      .setPlaceholder('Choose an action...')
      .addOptions([
        { label: 'Add Credits', value: 'add', description: 'Give credits to this member' },
        { label: 'Set Balance', value: 'set', description: 'Set exact balance' },
        { label: 'Remove Credits', value: 'remove', description: 'Take credits from this member' },
      ])
  );

  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('config_back_credits').setLabel('Back').setStyle(ButtonStyle.Secondary)
  );

  await interaction.update({ embeds: [embed], files: [], components: [select, backRow] });
}

async function handleCreditsAction(interaction, customId) {
  const targetId = customId.replace('credits_action_', '');
  const action = interaction.values[0];

  const labels = { add: 'Add Credits', set: 'Set Balance', remove: 'Remove Credits' };
  const modal = new ModalBuilder()
    .setCustomId(`credits_exec_${action}_${targetId}_${interaction.user.id}`)
    .setTitle(labels[action] || 'Credits')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('amount')
          .setLabel(action === 'set' ? 'Exact New Balance' : 'Amount')
          .setPlaceholder(action === 'set' ? 'e.g. 1000' : 'e.g. 500')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('reason')
          .setLabel('Reason')
          .setPlaceholder('Why is this adjustment happening')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
  await interaction.showModal(modal);
}

async function handleCreditsExecModal(interaction, customId) {
  // credits_exec_<action>_<targetId>_<staffId>
  const parts = customId.split('_');
  const action = parts[2];
  const targetId = parts[3];
  const staffId = parts[4];

  if (staffId !== interaction.user.id) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Not Your Panel').setDescription('This is not your panel.')],
      flags: 64,
    });
  }

  const { isAdmin, getStaffLevel } = require('../utils/permissions');
  if (!isAdmin(interaction.member) && getStaffLevel(interaction.member) < 4) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Access Denied').setColor(config.colors.error)],
      flags: 64,
    });
  }

  const amount = parseInt(interaction.fields.getTextInputValue('amount'));
  const reason = interaction.fields.getTextInputValue('reason').trim();

  if (isNaN(amount) || amount < 0 || amount > 10000000) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Invalid Amount').setDescription('Enter a number between 0 and 10,000,000.')],
      flags: 64,
    });
  }

  await interaction.deferReply();

  const { getUser, updateBalance, createTransaction } = require('../systems/economy');
  const { formatCredits } = require('../utils/helpers');
  const { log } = require('../systems/logging');

  const userData = getUser(targetId, interaction.guild.id);
  const before = userData.credits;

  if (action === 'add') {
    updateBalance(targetId, amount, interaction.guild.id);
    createTransaction(targetId, amount, 'admin_adjustment', { targetUserId: interaction.user.id, description: reason });
  } else if (action === 'set') {
    const diff = amount - before;
    updateBalance(targetId, diff, interaction.guild.id);
    createTransaction(targetId, diff, 'admin_adjustment', { targetUserId: interaction.user.id, description: `Set balance: ${reason}` });
  } else if (action === 'remove') {
    const clamped = Math.min(amount, before);
    updateBalance(targetId, -clamped, interaction.guild.id);
    createTransaction(targetId, -clamped, 'admin_adjustment', { targetUserId: interaction.user.id, description: `Removed: ${reason}` });
  }

  const after = getUser(targetId, interaction.guild.id).credits;

  await log(interaction.guild, 'economy', `Credits ${action.charAt(0).toUpperCase() + action.slice(1)}`, {
    actor: interaction.user.id,
    target: targetId,
    amount: (action === 'remove' ? -Math.min(amount, before) : action === 'set' ? after - before : amount),
    reason,
  }).catch(() => {});

  // DM the target
  try {
    const { sendDMById } = require('../utils/dm');
    const { EmbedBuilder: EB } = require('discord.js');
    const dmEmbed = new EB()
      .setAuthor({ name: 'NEXAVERSE Economy' })
      .setTitle('Balance Updated')
      .setColor(config.colors.economy)
      .setDescription(
        `${'\u2501'.repeat(32)}\n` +
        `**Server** ${interaction.guild.name}\n` +
        `**Change** ${action === 'remove' ? '-' : '+'}${formatCredits(action === 'set' ? Math.abs(after - before) : amount)}\n` +
        `**New Balance** ${formatCredits(after)}\n` +
        `**Reason** ${reason}\n` +
        `**By** <@${interaction.user.id}>\n` +
        `${'\u2501'.repeat(32)}`
      )
      .setTimestamp();
    await sendDMById(interaction.guild, targetId, dmEmbed);
  } catch (e) {}

  const divider = '\u2501'.repeat(32);
  const labels = { add: 'Credits Added', set: 'Balance Set', remove: 'Credits Removed' };
  const embed = new EmbedBuilder()
    .setTitle(`NEXAVERSE · ${labels[action] || 'Credits Updated'}`)
    .setColor(config.colors.success)
    .setDescription(
      `${divider}\n` +
      `**Member** <@${targetId}>\n` +
      `**Before** ${formatCredits(before)}\n` +
      `**After** ${formatCredits(after)}\n` +
      `**Reason** ${reason}\n` +
      `${divider}`
    )
    .setFooter({ text: `By ${interaction.user.username}` })
    .setTimestamp();

  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('config_back_credits').setLabel('Back').setStyle(ButtonStyle.Secondary)
  );

  await interaction.editReply({ embeds: [embed], components: [backRow] });
}

// === EVENT ADMIN SELECT ===

async function handleEventAdminSelect(interaction) {
  const { isStaff } = require('../utils/permissions');
  if (!isStaff(interaction.member)) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Staff Only').setColor(config.colors.error)],
      flags: 64,
    });
  }

  const action = interaction.values[0];

  if (action === 'create_deathnote') {
    const modal = new ModalBuilder()
      .setCustomId('event_deathnote_modal')
      .setTitle('Create Death Note Event')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('title').setLabel('Event Title').setPlaceholder('Death Note Game Night').setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('prize').setLabel('Prize Amount (Credits)').setPlaceholder('500').setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('max_players').setLabel('Max Players').setPlaceholder('20').setStyle(TextInputStyle.Short).setRequired(false)
        )
      );
    await interaction.showModal(modal);
    return;
  }

  if (action === 'create_trivia') {
    const divider = '\u2501'.repeat(32);
    await safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Trivia Event').setDescription(`${divider}\nTrivia event system coming soon.\n${divider}`).setColor(config.colors.primary)],
    });
    return;
  }

  if (action === 'create_tournament') {
    const divider = '\u2501'.repeat(32);
    await safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Tournament').setDescription(`${divider}\nTournament bracket system coming soon.\n${divider}`).setColor(config.colors.primary)],
    });
    return;
  }

  if (action === 'view_events') {
    const { activeEvents } = require('../commands/event');
    const divider = '\u2501'.repeat(32);
    let desc = `${divider}\n`;
    if (activeEvents.size === 0) {
      desc += 'No active events.';
    } else {
      for (const [id, game] of activeEvents) {
        desc += `**${id}** \u2014 ${game.status} (${game.players.length} players)\n`;
      }
    }
    desc += `\n${divider}`;
    await safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Active Events').setDescription(desc).setColor(config.colors.primary)],
    });
    return;
  }

  if (action === 'end_event') {
    const divider = '\u2501'.repeat(32);
    await safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('End Event').setDescription(`${divider}\nUse the event ID to end a specific event.\n${divider}`).setColor(config.colors.primary)],
    });
    return;
  }
}

// === DEATH NOTE HANDLERS ===

async function handleCreateDeathNote(interaction) {
  const { createGame, activeGames } = require('../systems/deathnote');
  const { log } = require('../systems/logging');

  const title = interaction.fields.getTextInputValue('title');
  const prize = parseInt(interaction.fields.getTextInputValue('prize')) || 500;
  const maxPlayers = parseInt(interaction.fields.getTextInputValue('max_players')) || 20;

  const game = createGame(interaction.user.id, interaction.guild.id, prize);
  game.maxPlayers = maxPlayers;
  game.title = title;
  activeGames.set(game.id, game);

  const divider = '\u2501'.repeat(32);

  const embed = new EmbedBuilder()
    .setTitle(title || 'Death Note')
    .setColor(config.colors.primary)
    .setDescription(
      `${divider}\n` +
      `A new Death Note game has been created!\n\n` +
      `**Game ID:** ${game.id}\n` +
      `**Prize:** ${prize} Credits\n` +
      `**Players:** 0/${maxPlayers}\n\n` +
      `**How to play:**\n` +
      `1. Click **Join** to participate\n` +
      `2. When started, one player is randomly chosen as **Kira** and one as **L**\n` +
      `3. Kira tries to eliminate citizens, L tries to identify Kira\n` +
      `4. Winners receive ${prize} Credits each\n\n` +
      `${divider}`
    )
    .setFooter({ text: `Event by ${interaction.user.tag}` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`dn_join_${game.id}`).setLabel('Join').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`dn_start_${game.id}`).setLabel('Start Game').setStyle(ButtonStyle.Success),
  );

  await interaction.reply({ embeds: [embed], components: [row] });
  await log(interaction.guild, 'events', 'Death Note Event Created', { actor: interaction.user.id, reason: title });
}

async function handleDeathNoteJoin(interaction, id) {
  const { joinGame } = require('../systems/deathnote');
  const gameId = id.replace('dn_join_', '');
  const result = joinGame(gameId, interaction.user.id);

  if (!result.success) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Cannot Join').setDescription(result.error).setColor(config.colors.error)],
      flags: 64,
    });
  }

  await safeReply(interaction, {
    embeds: [new EmbedBuilder().setTitle('Joined').setDescription(`You joined the Death Note game! (${result.playerCount} players)`).setColor(config.colors.success)],
    flags: 64,
  });
}

async function handleDeathNoteStart(interaction, id) {
  const { startGame, getGameEmbed } = require('../systems/deathnote');
  const { log } = require('../systems/logging');
  const gameId = id.replace('dn_start_', '');
  const result = startGame(gameId);

  if (!result.success) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Cannot Start').setDescription(result.error).setColor(config.colors.error)],
      flags: 64,
    });
  }

  const game = result.game;

  // DM each player their role
  for (const player of game.players) {
    try {
      const member = await interaction.guild.members.fetch(player.userId).catch(() => null);
      if (member) {
        const roleDesc = player.role === 'kira' ? 'You are **KIRAKill citizens secretly. You win if all citizens are eliminated.' :
          player.role === 'l' ? 'You are **L**. Identify Kira by accusing the right person. You win if you find Kira.' :
          'You are a **Citizen**. Stay alive and help L find Kira.';

        await member.send({
          embeds: [new EmbedBuilder().setTitle('Your Role').setDescription(roleDesc).setColor(config.colors.primary).setTimestamp()]
        }).catch(() => {});
      }
    } catch (e) {}
  }

  const embed = getGameEmbed(game, interaction.guild);
  await interaction.update({ embeds: [embed], components: [] });

  await log(interaction.guild, 'events', 'Death Note Game Started', { actor: interaction.user.id, reason: `${game.players.length} players` });
}

async function handleDeathNoteKill(interaction, id) {
  const { kiraKill, getGameEmbed, activeGames } = require('../systems/deathnote');
  const { log } = require('../systems/logging');

  const parts = id.split('_');
  const gameId = parts[2];
  const targetId = parts[3];

  const result = kiraKill(gameId, interaction.user.id, targetId);
  if (!result.success) {
    return safeReply(interaction, { embeds: [new EmbedBuilder().setTitle('Error').setDescription(result.error).setColor(config.colors.error)], flags: 64 });
  }

  const game = activeGames.get(gameId);
  const embed = getGameEmbed(game, interaction.guild);
  await interaction.update({ embeds: [embed], components: [] });

  if (result.winner) {
    await log(interaction.guild, 'events', 'Death Note Game Ended', { actor: interaction.user.id, reason: `Winner: ${result.winner}` });
  }
}

async function handleDeathNoteAccuse(interaction, id) {
  const { lAccuse, getGameEmbed, activeGames } = require('../systems/deathnote');
  const { log } = require('../systems/logging');
  const { formatCredits } = require('../utils/helpers');
  const { updateBalance } = require('../systems/economy');

  const parts = id.split('_');
  const gameId = parts[2];
  const suspectId = parts[3];

  const result = lAccuse(gameId, interaction.user.id, suspectId);
  if (!result.success) {
    return safeReply(interaction, { embeds: [new EmbedBuilder().setTitle('Error').setDescription(result.error).setColor(config.colors.error)], flags: 64 });
  }

  const game = activeGames.get(gameId);
  const embed = getGameEmbed(game, interaction.guild);
  await interaction.update({ embeds: [embed], components: [] });

  if (result.winner) {
    // Pay winners
    const prize = game.prize;
    const winners = game.players.filter(p => {
      if (result.winner === 'l') return p.role === 'l';
      return p.role === 'kira';
    });

    for (const w of winners) {
      try {
        updateBalance(w.userId, prize, game.guildId);
        const member = await interaction.guild.members.fetch(w.userId).catch(() => null);
        if (member) {
          await member.send({
            embeds: [new EmbedBuilder().setTitle('Event Prize').setDescription(`You won **${formatCredits(prize)}** in the Death Note event!`).setColor(config.colors.success).setTimestamp()]
          }).catch(() => {});
        }
      } catch (e) {}
    }

    await log(interaction.guild, 'events', 'Death Note Game Ended', { actor: interaction.user.id, reason: `Winner: ${result.winner}, Prize: ${prize}` });
  }
}


// ===== REPORT SYSTEM =====

let pendingReport = {};

// Staff issue categories
const STAFF_ISSUES = [
  { label: 'Abuse of Power', value: 'abuse_of_power', description: 'Using staff tools unfairly or excessively' },
  { label: 'Unfair Moderation', value: 'unfair_mod', description: 'Unjustified warns, mutes, kicks, or bans' },
  { label: 'Discrimination', value: 'discrimination', description: 'Bias based on race, gender, status, etc.' },
  { label: 'Favoritism', value: 'favoritism', description: 'Giving friends preferential treatment' },
  { label: 'Breaking Server Rules', value: 'breaking_rules', description: 'Staff violating rules they enforce' },
  { label: 'Harassment', value: 'harassment', description: 'Using position to harass or threaten members' },
  { label: 'Leaking Info', value: 'leaking', description: 'Sharing private staff information' },
  { label: 'Other (Write Your Own)', value: 'other_staff', description: 'Describe the issue manually' },
];

// Member issue categories
const MEMBER_ISSUES = [
  { label: 'Swearing / Profanity', value: 'swearing', description: 'Excessive or targeted profanity' },
  { label: 'Threats / Violence', value: 'threats', description: 'Threatening other members' },
  { label: 'Inappropriate Content', value: 'inappropriate', description: 'NSFW, gore, or disturbing content' },
  { label: 'Harassment / Bullying', value: 'harassment_member', description: 'Targeting or bullying specific members' },
  { label: 'Spam / Raid Behavior', value: 'spam', description: 'Mass messaging or raiding' },
  { label: 'Scamming / Phishing', value: 'scam', description: 'Attempting to steal accounts or credits' },
  { label: 'Impersonation', value: 'impersonation', description: 'Pretending to be staff or another member' },
  { label: 'Other (Write Your Own)', value: 'other_member', description: 'Describe the issue manually' },
];

async function handleReportUserSelect(interaction) {
  const targetId = interaction.values[0];
  
  if (targetId === interaction.user.id) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setTitle('Invalid Report').setDescription('You cannot report yourself.').setColor(config.colors.warning)],
      flags: 64,
    });
  }
  
  // Store target, show staff vs member picker
  pendingReport[interaction.user.id] = { targetId, guildId: interaction.guild.id };
  
  const embed = new EmbedBuilder()
    .setTitle('Report Type')
    .setColor(config.colors.warning)
    .setDescription(
      '\u2501'.repeat(32) + '\n' +
      '**Reporting** <@' + targetId + '>\n\n' +
      'Is this a **staff member** abusing their powers, or a **regular member** violating rules?\n\n' +
      'Choose the type below, then select the specific issue.'
    )
    .setTimestamp();
  
  const typeSelect = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('report_type_select')
      .setPlaceholder('Select report type...')
      .addOptions([
        { label: 'Staff Issue', value: 'staff', description: 'Abuse of power, unfair moderation, etc.' },
        { label: 'Member Issue', value: 'member', description: 'Swearing, threats, inappropriate content, etc.' },
      ])
  );
  
  await interaction.reply({ embeds: [embed], components: [typeSelect], flags: 64 });
}

async function handleReportTypeSelect(interaction) {
  const report = pendingReport[interaction.user.id];
  if (!report) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setTitle('Expired').setDescription('Report session expired. Use `/report` again.').setColor(config.colors.warning)],
      flags: 64,
    });
  }
  
  const type = interaction.values[0];
  report.type = type;
  
  const categories = type === 'staff' ? STAFF_ISSUES : MEMBER_ISSUES;
  const typeName = type === 'staff' ? 'Staff' : 'Member';
  
  const embed = new EmbedBuilder()
    .setTitle('Report ' + typeName + ' - Issue Type')
    .setColor(config.colors.warning)
    .setDescription(
      '\u2501'.repeat(32) + '\n' +
      '**Reporting** <@' + report.targetId + '> as a **' + typeName + '**\n\n' +
      'Select the type of violation. If none match, choose **Other** to write your own.\n' +
      '\u2501'.repeat(32)
    )
    .setTimestamp();
  
  const categorySelect = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('report_category_select')
      .setPlaceholder('Select the issue type...')
      .addOptions(categories)
  );
  
  await interaction.update({ embeds: [embed], components: [categorySelect] });
}

async function handleReportCategorySelect(interaction) {
  const report = pendingReport[interaction.user.id];
  if (!report) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setTitle('Expired').setDescription('Report session expired. Use `/report` again.').setColor(config.colors.warning)],
      flags: 64,
    });
  }
  
  const category = interaction.values[0];
  report.category = category;
  
  // Find the category label for pre-filling
  const categories = report.type === 'staff' ? STAFF_ISSUES : MEMBER_ISSUES;
  const catInfo = categories.find(c => c.value === category);
  const categoryLabel = catInfo ? catInfo.label : category;
  
  const isOther = category.startsWith('other_');
  
  const modal = new ModalBuilder()
    .setCustomId('report_reason_modal')
    .setTitle('Report Details')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('reason')
          .setLabel(isOther ? 'Describe the issue' : 'Additional details')
          .setPlaceholder(isOther ? 'What happened? Describe the issue in detail...' : 'Add any extra context about ' + categoryLabel.toLowerCase() + '...')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(1000)
          .setValue(isOther ? '' : categoryLabel + ': ')
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('evidence')
          .setLabel('Evidence (optional)')
          .setPlaceholder('Message links, screenshots, timestamps...')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setMaxLength(500)
      )
    );
  
  await interaction.showModal(modal);
}

async function handleReportReasonModal(interaction) {
  const report = pendingReport[interaction.user.id];
  if (!report) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setTitle('Error').setDescription('Report session expired. Use `/report` again.').setColor(config.colors.error)],
      flags: 64,
    });
  }
  
  const reason = interaction.fields.getTextInputValue('reason');
  const evidence = interaction.fields.getTextInputValue('evidence') || '';
  
  await interaction.deferReply({ flags: 64 });
  
  const { getDb } = require('../database/init');
  const { generateId } = require('../utils/helpers');
  const { log } = require('../systems/logging');
  
  const reportId = generateId('RPT');
  const db = getDb();
  
  const typeLabel = report.type === 'staff' ? 'Staff Issue' : 'Member Issue';
  const categories = report.type === 'staff' ? STAFF_ISSUES : MEMBER_ISSUES;
  const catInfo = categories.find(c => c.value === report.category);
  const categoryLabel = catInfo ? catInfo.label : report.category;
  
  const fullReason = '**[' + typeLabel + '] ' + categoryLabel + '**\n' + reason;
  
  db.prepare('INSERT INTO reports (id, guild_id, reporter_id, target_id, reason, evidence, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    reportId, report.guildId, interaction.user.id, report.targetId, fullReason, evidence, 'pending', Date.now()
  );
  
  delete pendingReport[interaction.user.id];
  
  // Log to reports channel
  await log(interaction.guild, 'reports', 'Report Submitted', {
    actor: interaction.user.id,
    target: report.targetId,
    reason: typeLabel + ' \u2014 ' + categoryLabel,
    footer: 'Report ID: ' + reportId,
  });
  
  // Confirmation embed (ephemeral)
  const embed = new EmbedBuilder()
    .setTitle('Report Submitted Successfully')
    .setColor(config.colors.success)
    .setDescription(
      '\u2501'.repeat(32) + '\n' +
      '**Report ID** ' + reportId + '\n' +
      '**Against** <@' + report.targetId + '>\n' +
      '**Type** ' + typeLabel + '\n' +
      '**Issue** ' + categoryLabel + '\n' +
      (evidence ? '**Evidence** ' + evidence + '\n' : '') +
      '\u2501'.repeat(32) + '\n\n' +
      'Your report has been received and logged.\n' +
      'A **higher official** will review it and take appropriate action.\n\n' +
      '*Please wait for action to be taken. Do not spam reports.*'
    )
    .setFooter({ text: 'NEXAVERSE Report System' })
    .setTimestamp();
  
  await interaction.editReply({ embeds: [embed] });
  
  // DM confirmation to reporter
  try {
    const { sendDM } = require('../utils/dm');
    const dmEmbed = new EmbedBuilder()
      .setTitle('Report Received')
      .setColor(config.colors.success)
      .setDescription(
        '\u2501'.repeat(32) + '\n' +
        'Your report has been submitted in **' + interaction.guild.name + '**.\n\n' +
        '**Report ID** ' + reportId + '\n' +
        '**Against** <@' + report.targetId + '>\n' +
        '**Type** ' + typeLabel + '\n' +
        '**Issue** ' + categoryLabel + '\n\n' +
        'A staff member will review your report and take action.\n' +
        'Please wait for action to be taken \u2014 you will be notified if further steps are needed.\n' +
        '\u2501'.repeat(32) + '\n\n' +
        '*Do not submit duplicate reports.*'
      )
      .setFooter({ text: 'NEXAVERSE Moderation' })
      .setTimestamp();
    await sendDM(interaction.user, dmEmbed);
  } catch (e) {}
  
  // DM the target that they were reported
  try {
    const { sendDMById } = require('../utils/dm');
    const targetEmbed = new EmbedBuilder()
      .setTitle('Report Filed Against You')
      .setColor(config.colors.warning)
      .setDescription(
        '\u2501'.repeat(32) + '\n' +
        'A report has been filed against you in **' + interaction.guild.name + '**.\n\n' +
        '**Type** ' + typeLabel + '\n' +
        '**Issue** ' + categoryLabel + '\n\n' +
        'Staff will review this report and take appropriate action.\n' +
        '\u2501'.repeat(32)
      )
      .setFooter({ text: 'NEXAVERSE Moderation' })
      .setTimestamp();
    await sendDMById(interaction.guild, report.targetId, targetEmbed);
  } catch (e) {}
}

async function handleReportTakeAction(interaction, id) {
  const { isHigherOfficial } = require('../utils/permissions');
  if (!isHigherOfficial(interaction.member)) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setTitle('Access Denied').setDescription('Head of Staff or higher required.').setColor(config.colors.error)],
      flags: 64,
    });
  }
  
  const reportId = id.replace('report_take_action_', '');
  const { getDb } = require('../database/init');
  const { log } = require('../systems/logging');
  const { generateId } = require('../utils/helpers');
  
  const db = getDb();
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId);
  
  if (!report) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setTitle('Report Not Found').setDescription('This report no longer exists.').setColor(config.colors.error)],
      flags: 64,
    });
  }
  
  await interaction.deferReply();
  
  // Create ticket channel
  const ticketChannelName = 'report-' + reportId.toLowerCase();
  let ticketChannel;
  try {
    ticketChannel = await interaction.guild.channels.create({
      name: ticketChannelName,
      type: 0,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: ['ViewChannel'] },
        { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
        { id: report.reporter_id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
      ],
    });
  } catch (e) {
    return interaction.editReply({
      embeds: [new EmbedBuilder().setTitle('Error').setDescription('Failed to create ticket channel. Check bot permissions.').setColor(config.colors.error)],
    });
  }
  
  db.prepare('INSERT INTO tickets (id, guild_id, channel_id, creator_id, category, subject, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    generateId('TKT'), interaction.guild.id, ticketChannel.id, interaction.user.id,
    'report', 'Report: ' + reportId + ' against <@' + report.target_id + '>', 'open', Date.now()
  );
  
  db.prepare('UPDATE reports SET status = ?, claimed_by = ? WHERE id = ?').run('in_progress', interaction.user.id, reportId);
  
  const ticketEmbed = new EmbedBuilder()
    .setTitle('NEXAVERSE Report Ticket')
    .setColor(config.colors.warning)
    .setDescription(
      '\u2501'.repeat(32) + '\n' +
      '**Report ID** ' + reportId + '\n' +
      '**Reported By** <@' + report.reporter_id + '>\n' +
      '**Against** <@' + report.target_id + '>\n' +
      '**Reason**\n' + report.reason + '\n' +
      (report.evidence ? '**Evidence** ' + report.evidence + '\n' : '') +
      '**Claimed By** <@' + interaction.user.id + '>\n' +
      '\u2501'.repeat(32) + '\n\n' +
      'Discuss the issue here. Use `-close` to close this ticket when resolved.'
    )
    .setFooter({ text: 'Report ' + reportId + ' \u00b7 NEXAVERSE' })
    .setTimestamp();
  
  await ticketChannel.send({
    content: '<@' + interaction.user.id + '> <@' + report.reporter_id + '>',
    embeds: [ticketEmbed],
  });
  
  await log(interaction.guild, 'tickets', 'Ticket Created', {
    actor: interaction.user.id,
    reason: 'Report ' + reportId,
    footer: 'Channel: ' + ticketChannel.name,
  });
  
  await interaction.editReply({
    embeds: [new EmbedBuilder()
      .setTitle('Ticket Opened')
      .setColor(config.colors.success)
      .setDescription(
        '\u2501'.repeat(32) + '\n' +
        'A ticket has been created: <#' + ticketChannel.id + '>\n' +
        '**Report ID** ' + reportId + '\n' +
        '**Target** <@' + report.target_id + '>\n' +
        '\u2501'.repeat(32)
      )
    ],
  });
}

async function handleTicketClose(interaction, id) {
  const { isHigherOfficial } = require('../utils/permissions');
  if (!isHigherOfficial(interaction.member)) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setTitle('Access Denied').setDescription('Head of Staff or higher required.').setColor(config.colors.error)],
      flags: 64,
    });
  }
  
  const ticketId = id.replace('ticket_close_', '');
  const { getDb } = require('../database/init');
  const { log } = require('../systems/logging');
  
  const db = getDb();
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
  
  if (!ticket) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setTitle('Ticket Not Found').setDescription('This ticket no longer exists.').setColor(config.colors.error)],
      flags: 64,
    });
  }
  
  db.prepare('UPDATE tickets SET status = ?, closed_at = ? WHERE id = ?').run('closed', Date.now(), ticketId);
  
  if (ticket.category === 'report') {
    const reportMatch = (ticket.subject || '').match(/Report: (RPT-[A-Z0-9]+)/);
    if (reportMatch) {
      db.prepare('UPDATE reports SET status = ? WHERE id = ?').run('resolved', reportMatch[1]);
    }
  }
  
  await log(interaction.guild, 'tickets', 'Ticket Closed', {
    actor: interaction.user.id,
    reason: 'Ticket ' + ticketId,
  });
  
  await interaction.reply({
    embeds: [new EmbedBuilder()
      .setTitle('Ticket Closed')
      .setColor(config.colors.info)
      .setDescription('This ticket has been closed by <@' + interaction.user.id + '>.')
      .setTimestamp()
    ],
  });
  
  const channel = interaction.channel;
  setTimeout(() => {
    if (channel) channel.delete().catch(() => {});
  }, 10000);
}
