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
          if (id === 'event_admin_select') { await handleEventAdminSelect(interaction); return; }
          if (id === 'mod_user_select') { await handleModUserSelect(interaction); return; }
          if (id.startsWith('mod_action_select_')) { await handleModActionSelect(interaction, id); return; }
          if (id.startsWith('wallet_transfer_select_')) { await handleWalletTransferSelect(interaction, id); return; }

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

        try {
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
  const { verifyOTP, verifyUser } = require('../systems/verification');
  const { log } = require('../systems/logging');

  const code = interaction.fields.getTextInputValue('otp_code');
  const result = verifyOTP(interaction.user.id, code);

  if (result.success) {
    verifyUser(interaction.user.id, interaction.guild.id);

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

    await safeReply(interaction, {
      embeds: [
        new EmbedBuilder()
          .setTitle('Verified!')
          .setDescription(`Welcome, **${interaction.user.username}**!\n\nYou have been verified and assigned the Verified role.\nYour nickname has been updated.`)
          .setColor(config.colors.success)
          .setTimestamp()
      ],
    });
  } else {
    await safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Verification Failed').setDescription(result.reason).setColor(config.colors.error)],
      flags: 64,
    });
  }
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

    // DM sender
    try {
      await interaction.user.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('Transfer Sent')
            .setDescription(`**To:** <@${recipientId}>\n**Amount:** ${formatCredits(amount)}\n**Fee:** ${formatCredits(result.fee || 0)}\n**Balance:** ${formatCredits(result.senderBalance || getBalance(interaction.user.id, guildId))}\n**TxID:** \`${result.senderTxId}\``)
            .setColor(config.colors.success)
            .setTimestamp()
        ]
      }).catch(() => {});
    } catch (e) {}

    // DM receiver
    try {
      const recipient = await interaction.guild.members.fetch(recipientId).catch(() => null);
      if (recipient) {
        await recipient.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('Transfer Received')
              .setDescription(`**From:** <@${interaction.user.id}>\n**Amount:** ${formatCredits(amount)}\n**TxID:** \`${result.senderTxId}\``)
              .setColor(config.colors.success)
              .setTimestamp()
          ]
        }).catch(() => {});
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
  const { isAdmin } = require('../utils/permissions');
  if (!isAdmin(interaction.member)) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('Admin Only').setColor(config.colors.error)],
      flags: 64,
    });
  }
  const category = interaction.values[0];
  const divider = '\u2501'.repeat(32);
  const embed = new EmbedBuilder()
    .setTitle(category)
    .setDescription(`${divider}\nConfiguration panel for ${category}.\n${divider}`)
    .setColor(config.colors.staff)
    .setTimestamp();
  await safeReply(interaction, { embeds: [embed] });
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
