const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    try {
      // Handle slash commands
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
          await command.execute(interaction, client);
        } catch (error) {
          console.error(`[CMD] Error executing ${interaction.commandName}:`, error.message);
          await safeReply(interaction, {
            embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription('Something went wrong. Please try again.').setColor(config.colors.error)],
            ephemeral: true,
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
            await interaction.update({ embeds: [
              new EmbedBuilder().setTitle('❌ Cancelled').setDescription('Verification cancelled. Use `/verify` to start again.').setColor(config.colors.warning)
            ], components: [] });
            return;
          }

          // Back buttons
          if (id === 'nav_account_back') {
            const { backToMainMenu } = require('../utils/helpers');
            await backToMainMenu(interaction);
            return;
          }
          if (id === 'nav_wallet_back') {
            await navToAccount(interaction);
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

          // Registered component handlers
          const handler = client.buttons.get(id) || findDynamicHandler(client.buttons, id);
          if (handler) {
            await handler(interaction, client);
          } else {
            await safeReply(interaction, {
              embeds: [new EmbedBuilder().setTitle('⚠️ Expired').setDescription('This interaction is no longer active. Use the command again.').setColor(config.colors.warning)],
              ephemeral: true,
            });
          }
        } catch (error) {
          console.error(`[BTN] Error with ${interaction.customId}:`, error.message);
          await safeReply(interaction, {
            embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription('Something went wrong. Please try again.').setColor(config.colors.error)],
            ephemeral: true,
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
          if (id === 'shop_select_item') { await handleShopSelect(interaction); return; }
          if (id === 'wallet_action_select') { await handleWalletActionSelect(interaction); return; }

          await safeReply(interaction, {
            embeds: [new EmbedBuilder().setTitle('⚠️ Expired').setDescription('This menu is no longer active. Use the command again.').setColor(config.colors.warning)],
            ephemeral: true,
          });
        } catch (error) {
          console.error(`[SELECT] Error with ${id}:`, error.message);
          await safeReply(interaction, {
            embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription('Something went wrong. Please try again.').setColor(config.colors.error)],
            ephemeral: true,
          });
        }
        return;
      }

      // Handle modals
      if (interaction.isModalSubmit()) {
        const id = interaction.customId;

        try {
          // Transfer modal
          if (id.startsWith('transfer_modal_')) {
            const modalOwnerId = id.split('_')[2];
            if (modalOwnerId !== interaction.user.id) {
              return safeReply(interaction, {
                embeds: [new EmbedBuilder().setTitle('🔒 Not Your Panel').setDescription('This is not your transfer panel.').setColor(config.colors.error)],
                ephemeral: true,
              });
            }
            await handleTransferModal(interaction);
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

          // Game bet modals
          const handler = client.modals.get(id) || findDynamicHandler(client.modals, id);
          if (handler) {
            await handler(interaction, client);
          } else {
            await safeReply(interaction, {
              embeds: [new EmbedBuilder().setTitle('⚠️ Expired').setDescription('This modal is no longer active. Use the command again.').setColor(config.colors.warning)],
              ephemeral: true,
            });
          }
        } catch (error) {
          console.error(`[MODAL] Error with ${id}:`, error.message);
          await safeReply(interaction, {
            embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription('Something went wrong. Please try again.').setColor(config.colors.error)],
            ephemeral: true,
          });
        }
        return;
      }
    } catch (error) {
      console.error('[INTERACTION] Unhandled error:', error.message);
      await safeReply(interaction, {
        embeds: [new EmbedBuilder().setTitle('❌ Error').setDescription('An unexpected error occurred.').setColor(config.colors.error)],
        ephemeral: true,
      });
    }
  },
};

// Safe reply helper - prevents double-reply errors
async function safeReply(interaction, payload) {
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  } catch (e) {
    // Silently fail - interaction already handled
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
      embeds: [new EmbedBuilder().setTitle('✅ Already Verified').setDescription('Your account is already verified.').setColor(config.colors.success)],
      ephemeral: true,
    });
  }

  const can = canVerify(interaction.member, interaction.guild.id);
  if (!can.allowed) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('❌ Cannot Verify').setDescription(can.reason).setColor(config.colors.error)],
      ephemeral: true,
    });
  }

  // Generate OTP and send via DM
  const otp = createOTPChallenge(interaction.user.id);

  try {
    await interaction.user.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('🔐 NEXAVERSE Verification OTP')
          .setDescription(`Your verification code is:\n\n**\`${otp}\`**\n\nEnter this code in the server to verify.\n\n*This code expires in 5 minutes.*`)
          .setColor(config.colors.primary)
          .setTimestamp()
      ]
    });
  } catch (e) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('❌ DMs Closed').setDescription('I cannot send you a DM. Please enable DMs from server members and try again.').setColor(config.colors.error)],
      ephemeral: true,
    });
  }

  await log(interaction.guild, 'security', '🔐 Verification OTP Sent', { actor: interaction.user.id });

  await safeReply(interaction, {
    embeds: [
      new EmbedBuilder()
        .setTitle('📬 OTP Sent!')
        .setDescription(`I sent a **6-digit OTP** to your DMs.\n\nCheck your DMs and enter the code here to verify.`)
        .setColor(config.colors.primary)
        .setTimestamp()
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('verify_otp_modal').setLabel('Enter OTP').setStyle(ButtonStyle.Primary).setEmoji('✏️'),
        new ButtonBuilder().setCustomId('verify_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
      )
    ],
    ephemeral: true,
  });
}

async function showOTPModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('verify_otp_submit')
    .setTitle('🔐 Enter Verification OTP')
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

    // Assign verified role
    const verifiedRoleId = config.roleIds.verified;
    if (verifiedRoleId) {
      const role = interaction.guild.roles.cache.get(verifiedRoleId);
      if (role) {
        await interaction.member.roles.add(role).catch(() => {});
      }
    }

    // Change nickname to show role
    try {
      const staffHierarchy = config.staffHierarchy;
      let roleLabel = 'VERIFIED';
      for (const staff of staffHierarchy) {
        const roleId = config.roleIds[staff.roleIdKey];
        if (roleId && interaction.member.roles.cache.has(roleId)) {
          roleLabel = staff.name.replace(/_/g, ' ');
          break;
        }
      }
      const newNickname = `${interaction.user.username} [ ${roleLabel} ]`;
      await interaction.member.setNickname(newNickname.substring(0, 32)).catch(() => {});
    } catch (e) {}

    await log(interaction.guild, 'members', '✅ Verification Complete (OTP)', { actor: interaction.user.id });

    await safeReply(interaction, {
      embeds: [
        new EmbedBuilder()
          .setTitle('✅ Verified!')
          .setDescription(`Welcome to the server, **${interaction.user.username}**!\n\nYou have been verified and assigned the **Verified** role.\nYour nickname has been updated.`)
          .setColor(config.colors.success)
          .setTimestamp()
      ],
    });
  } else {
    await safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('❌ Verification Failed').setDescription(result.reason).setColor(config.colors.error)],
      ephemeral: true,
    });
  }
}

// === TRANSFER OTP FLOW ===

let pendingTransferData = null;

async function handleTransferModal(interaction) {
  const { getBalance } = require('../systems/economy');

  const recipientId = interaction.fields.getTextInputValue('recipient');
  const amount = parseInt(interaction.fields.getTextInputValue('amount'));

  if (isNaN(amount) || amount <= 0) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('❌ Invalid Amount').setDescription('Enter a positive number.').setColor(config.colors.error)],
      ephemeral: true,
    });
  }

  if (recipientId === interaction.user.id) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('❌ Self-Transfer').setDescription('Cannot transfer to yourself.').setColor(config.colors.error)],
      ephemeral: true,
    });
  }

  const balance = getBalance(interaction.user.id, interaction.guild.id);
  if (balance < amount) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('❌ Insufficient Funds').setDescription(`Balance: ${balance} Credits`).setColor(config.colors.error)],
      ephemeral: true,
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
            .setTitle('🔐 Transfer OTP Required')
            .setDescription(`You are transferring **${amount} Credits** to <@${recipientId}>.\n\nFor security, a **6-digit OTP** has been sent to your DMs.\nEnter it to confirm the transfer.\n\n**Code: \`${otp}\`**\n\n*Expires in 5 minutes.*`)
            .setColor(config.colors.warning)
            .setTimestamp()
        ]
      });
    } catch (e) {
      return safeReply(interaction, {
        embeds: [new EmbedBuilder().setTitle('❌ DMs Closed').setDescription('Enable DMs to receive transfer OTP.').setColor(config.colors.error)],
        ephemeral: true,
      });
    }

    // Store transfer data for OTP verification
    pendingTransferData = {
      userId: interaction.user.id,
      recipientId,
      amount,
      guildId: interaction.guild.id,
      timestamp: Date.now(),
    };

    const modal = new ModalBuilder()
      .setCustomId('transfer_otp_modal')
      .setTitle('🔐 Enter Transfer OTP')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('otp_code').setLabel('6-Digit OTP').setPlaceholder('Enter the code from your DM').setStyle(TextInputStyle.Short).setMinLength(6).setMaxLength(6).setRequired(true)
        )
      );
    await interaction.showModal(modal);
    return;
  }

  // Small transfer - no OTP needed
  await executeTransfer(interaction, recipientId, amount, interaction.guild.id);
}

async function handleTransferOTPSubmit(interaction) {
  const { verifyOTP } = require('../systems/verification');

  if (!pendingTransferData || pendingTransferData.userId !== interaction.user.id) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('❌ No Pending Transfer').setDescription('No transfer to verify. Start again.').setColor(config.colors.error)],
      ephemeral: true,
    });
  }

  if (Date.now() - pendingTransferData.timestamp > 300000) {
    pendingTransferData = null;
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('❌ Expired').setDescription('Transfer OTP expired. Start again.').setColor(config.colors.error)],
      ephemeral: true,
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
      embeds: [new EmbedBuilder().setTitle('❌ Wrong OTP').setDescription(result.reason).setColor(config.colors.error)],
      ephemeral: true,
    });
  }
}

async function executeTransfer(interaction, recipientId, amount, guildId) {
  const { getBalance, transfer } = require('../systems/economy');
  const { getDb } = require('../database/init');
  const { log } = require('../systems/logging');

  const db = getDb();
  db.prepare('INSERT OR IGNORE INTO users (user_id, guild_id, username, created_at) VALUES (?, ?, ?, ?)').run(recipientId, guildId, 'Unknown', Date.now());

  const result = transfer(interaction.user.id, recipientId, amount, guildId);
  if (result.success) {
    await log(interaction.guild, 'economy', '💸 Transfer', { actor: interaction.user.id, target: recipientId, amount, reason: result.senderTxId });
    await safeReply(interaction, {
      embeds: [
        new EmbedBuilder()
          .setTitle('💸 Transfer Complete')
          .setDescription(`Sent **${amount} Credits** to <@${recipientId}>\nFee: ${result.fee || 0} Credits\nTransaction: ${result.senderTxId}`)
          .addFields({ name: 'Your Balance', value: `${result.senderBalance || getBalance(interaction.user.id, guildId)} Credits`, inline: true })
          .setColor(config.colors.success).setTimestamp()
      ],
    });
  } else {
    await safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('❌ Transfer Failed').setDescription(result.error || 'Transfer failed').setColor(config.colors.error)],
      ephemeral: true,
    });
  }
}

// === WALLET ACTION SELECT ===

async function handleWalletActionSelect(interaction) {
  const { user, guild } = interaction;
  const guildId = guild.id;
  const value = interaction.values[0];

  switch (value) {
    case 'daily': {
      const { claimDaily } = require('../systems/economy');
      const { log } = require('../systems/logging');
      const result = claimDaily(user.id, guildId);
      if (result.success) {
        await log(guild, 'economy', '📅 Daily Claimed', { actor: user.id, amount: result.reward });
        await safeReply(interaction, {
          embeds: [new EmbedBuilder().setTitle('📅 Daily Reward').setDescription(`Claimed **${result.reward} Credits**!\nBalance: **${result.balance} Credits**`).setColor(config.colors.success).setTimestamp()],
        });
      } else {
        await safeReply(interaction, {
          embeds: [new EmbedBuilder().setTitle('❌ Daily').setDescription(result.error || 'Already claimed').setColor(config.colors.error)],
          ephemeral: true,
        });
      }
      break;
    }
    case 'weekly': {
      const { claimWeekly } = require('../systems/economy');
      const { log } = require('../systems/logging');
      const result = claimWeekly(user.id, guildId);
      if (result.success) {
        await log(guild, 'economy', '📆 Weekly Claimed', { actor: user.id, amount: result.reward });
        await safeReply(interaction, {
          embeds: [new EmbedBuilder().setTitle('📆 Weekly Reward').setDescription(`Claimed **${result.reward} Credits**!\nBalance: **${result.balance} Credits**`).setColor(config.colors.success).setTimestamp()],
        });
      } else {
        await safeReply(interaction, {
          embeds: [new EmbedBuilder().setTitle('❌ Weekly').setDescription(result.error || 'Already claimed').setColor(config.colors.error)],
          ephemeral: true,
        });
      }
      break;
    }
    case 'transfer': {
      const modal = new ModalBuilder()
        .setCustomId(`transfer_modal_${user.id}`)
        .setTitle('Transfer Credits')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('recipient').setLabel('Recipient (user ID)').setPlaceholder('Enter user ID').setStyle(TextInputStyle.Short).setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('amount').setLabel('Amount').setPlaceholder('Enter amount').setStyle(TextInputStyle.Short).setRequired(true)
          ),
        );
      await interaction.showModal(modal);
      break;
    }
    case 'transactions': {
      const { getTransactions } = require('../systems/economy');
      const { formatTimestamp: fmtTs } = require('../utils/helpers');
      const transactions = getTransactions(user.id, 10);
      if (transactions.length === 0) {
        return safeReply(interaction, {
          embeds: [new EmbedBuilder().setTitle('💳 Transactions').setDescription('No transactions yet.').setColor(config.colors.info)],
          ephemeral: true,
        });
      }
      const fields = transactions.map(t => ({
        name: t.id, value: `${t.type}\n${t.amount} Credits\n${fmtTs(t.created_at)}`, inline: true,
      }));
      await safeReply(interaction, {
        embeds: [new EmbedBuilder().setTitle('💳 Recent Transactions').setColor(config.colors.economy).addFields(fields).setTimestamp()],
        ephemeral: true,
      });
      break;
    }
    case 'leaderboard': {
      const { getDb } = require('../database/init');
      const { formatCredits: fmtC } = require('../utils/helpers');
      const db = getDb();
      const top = db.prepare('SELECT user_id, credits, level FROM users WHERE guild_id = ? ORDER BY credits DESC LIMIT 10').all(guildId);
      if (top.length === 0) {
        return safeReply(interaction, {
          embeds: [new EmbedBuilder().setTitle('🏆 Leaderboard').setDescription('No data yet.').setColor(config.colors.info)],
          ephemeral: true,
        });
      }
      const leaderboard = top.map((u, i) => `**${i + 1}.** <@${u.user_id}> — ${fmtC(u.credits)} (Lv.${u.level})`).join('\n');
      await safeReply(interaction, {
        embeds: [new EmbedBuilder().setTitle('🏆 Economy Leaderboard').setDescription(leaderboard).setColor(config.colors.economy).setTimestamp()],
        ephemeral: true,
      });
      break;
    }
  }
}

// === NAVIGATION HELPERS ===

async function navToAccount(interaction) {
  const { getUser } = require('../systems/economy');
  const { getXpInfo } = require('../systems/xp');
  const { getRepInfo } = require('../systems/reputation');
  const { getMemberRoleName, getStaffRole } = require('../utils/permissions');
  const { getRankForXp, formatCredits } = require('../utils/helpers');
  const { getAchievements, getAllAchievements } = require('../systems/achievements');

  const userData = getUser(interaction.user.id, interaction.guild.id);
  const xpInfo = getXpInfo(interaction.user.id, interaction.guild.id);
  const rank = getRankForXp(userData.total_xp);
  const repInfo = getRepInfo(interaction.user.id, interaction.guild.id);
  const roleName = getMemberRoleName(interaction.member);

  const embed = new EmbedBuilder()
    .setAuthor({ name: `${interaction.user.username}'s Account`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
    .setTitle('📋 NEXAVERSE Account')
    .setColor(rank.color)
    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: '⭐ Level', value: `${xpInfo.level}`, inline: true },
      { name: '🎖️ Rank', value: rank.name, inline: true },
      { name: '✨ XP', value: `${xpInfo.xp}/${xpInfo.xpNeeded}`, inline: true },
      { name: '💰 Credits', value: formatCredits(userData.credits), inline: true },
      { name: '🤝 Reputation', value: `${repInfo.score} · ${repInfo.level.label}`, inline: true },
      { name: '🏷️ Role', value: roleName, inline: true },
      { name: '💬 Messages', value: `${userData.messages}`, inline: true },
      { name: '🎮 Games Won', value: `${userData.games_won}/${userData.games_played}`, inline: true },
      { name: '🏆 Achievements', value: `${getAchievements(interaction.user.id, interaction.guild.id).length}/${getAllAchievements().length}`, inline: true },
    )
    .setFooter({ text: 'Select an option below' })
    .setTimestamp();

  const staffRole = getStaffRole(interaction.member);
  if (staffRole && (staffRole.name === 'PRESIDENT' || staffRole.name === 'CO_PRESIDENT')) {
    const gifs = ['https://c.tenor.com/YW9ehEp6X0kAAAAd/tenor.gif', 'https://c.tenor.com/Z31b_uCKPVEAAAAd/tenor.gif'];
    embed.setImage(gifs[Math.floor(Math.random() * gifs.length)]);
  }

  const select = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('account_select')
      .setPlaceholder('Choose an option...')
      .addOptions([
        { label: 'Profile', value: 'profile', emoji: '👤' },
        { label: 'Wallet', value: 'wallet', emoji: '💰' },
        { label: 'Economy', value: 'economy', emoji: '📊' },
        { label: 'Activity', value: 'activity', emoji: '📈' },
        { label: 'Reputation', value: 'reputation', emoji: '🤝' },
        { label: 'Achievements', value: 'achievements', emoji: '🏆' },
        { label: 'Transactions', value: 'transactions', emoji: '💳' },
        { label: 'Invites', value: 'invites', emoji: '📨' },
      ])
  );

  await interaction.update({ embeds: [embed], components: [select] });
}

async function navToGames(interaction) {
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
}

async function navToModSelect(interaction) {
  const { isStaff, getStaffRole } = require('../utils/permissions');
  if (!isStaff(interaction.member)) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('🔒 Staff Only').setColor(config.colors.error)],
      ephemeral: true,
    });
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

// === BUILT-IN SELECT MENU HANDLERS ===

async function handleStaffPanelSelect(interaction) {
  const { isStaff } = require('../utils/permissions');
  if (!isStaff(interaction.member)) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('🔒 Staff Only').setColor(config.colors.error)],
      ephemeral: true,
    });
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
  await safeReply(interaction, { embeds: [embed] });
}

async function handleHelpCategorySelect(interaction) {
  const category = interaction.values[0];
  const categories = {
    general: { title: '📖 General', desc: '`/account` — Profile & wallet\n`/wallet` — Wallet & transfers\n`/games` — Games arcade\n`/shop` — Credit shop\n`/stats` — Server stats' },
    moderation: { title: '🛡️ Moderation', desc: '`/moderation` — Mod panel (Staff)\n`/staff` — Staff panel (Staff)' },
    staff: { title: '👨‍💼 Staff', desc: '`/staff` — Staff panel\n`/moderation` — Mod tools\n`/config` — Server config (Admin)' },
    utility: { title: '⚙️ Utility', desc: '`/ping` — Bot latency\n`/botinfo` — Bot info\n`/serverinfo` — Server info\n`/verify` — Verify account\n`/poll` — Create polls' },
    social: { title: '🤝 Social', desc: '`/account` — Achievements, invites\n`/stats` — Server statistics' },
  };
  const cat = categories[category] || { title: category, desc: 'No commands listed.' };
  const embed = new EmbedBuilder().setTitle(cat.title).setDescription(cat.desc).setColor(config.colors.info).setTimestamp();
  await safeReply(interaction, { embeds: [embed] });
}

async function handleConfigSelect(interaction) {
  const { isAdmin } = require('../utils/permissions');
  if (!isAdmin(interaction.member)) {
    return safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('🔒 Admin Only').setColor(config.colors.error)],
      ephemeral: true,
    });
  }
  const category = interaction.values[0];
  const embed = new EmbedBuilder().setTitle(`⚙️ ${category}`).setDescription('Configuration panel coming soon.').setColor(config.colors.staff).setTimestamp();
  await safeReply(interaction, { embeds: [embed] });
}

async function handleShopSelect(interaction) {
  const { purchaseItem } = require('../systems/shop');
  const itemId = interaction.values[0];
  const result = purchaseItem(interaction.user.id, itemId, interaction.guild.id);
  if (result.success) {
    await safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('✅ Purchased').setDescription(`You bought **${result.item.name}**!`).setColor(config.colors.success)],
    });
  } else {
    await safeReply(interaction, {
      embeds: [new EmbedBuilder().setTitle('❌ Failed').setDescription(result.reason).setColor(config.colors.error)],
      ephemeral: true,
    });
  }
}
