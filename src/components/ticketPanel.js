const { EmbedBuilder } = require('discord.js');
const { claimTicket, closeTicket, reopenTicket, getUserTickets } = require('../systems/tickets');
const { isStaff } = require('../utils/permissions');
const { log } = require('../systems/logging');
const config = require('../config');

module.exports = {
  buttons: {
    ticket_claim: handleClaim,
    ticket_close: handleClose,
    ticket_reopen: handleReopen,
  },
};

async function handleClaim(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Staff Only').setColor(config.colors.error)], ephemeral: true });
  }
  claimTicket(interaction.customId.split('_').pop() || interaction.channel.name, interaction.user.id);
  await log(interaction.guild, 'tickets', '🎫 Ticket Claimed', { actor: interaction.user.id });
  await interaction.reply({ embeds: [new EmbedBuilder().setTitle('✅ Claimed').setDescription(`Ticket claimed by <@${interaction.user.id}>`).setColor(config.colors.success)], ephemeral: true });
}

async function handleClose(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Staff Only').setColor(config.colors.error)], ephemeral: true });
  }
  closeTicket(interaction.customId.split('_').pop() || interaction.channel.name);
  await log(interaction.guild, 'tickets', '🎫 Ticket Closed', { actor: interaction.user.id });
  await interaction.reply({ embeds: [new EmbedBuilder().setTitle('✅ Closed').setDescription('Ticket closed.').setColor(config.colors.warning).setTimestamp()], ephemeral: true });
}

async function handleReopen(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Staff Only').setColor(config.colors.error)], ephemeral: true });
  }
  reopenTicket(interaction.customId.split('_').pop() || interaction.channel.name);
  await log(interaction.guild, 'tickets', '🎫 Ticket Reopened', { actor: interaction.user.id });
  await interaction.reply({ embeds: [new EmbedBuilder().setTitle('✅ Reopened').setDescription('Ticket reopened.').setColor(config.colors.success).setTimestamp()], ephemeral: true });
}
