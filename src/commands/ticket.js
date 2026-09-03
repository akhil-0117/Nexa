const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { createTicket, getUserTickets } = require('../systems/tickets');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Create or view a support ticket')
    .addStringOption(opt => opt.setName('category').setDescription('Ticket category').addChoices(
      { name: 'General Support', value: 'general' },
      { name: 'Report', value: 'report' },
      { name: 'Appeal', value: 'appeal' },
      { name: 'Partnership', value: 'partnership' },
      { name: 'Economy Issue', value: 'economy' },
      { name: 'Purchase', value: 'purchase' },
      { name: 'Staff Application', value: 'staff_application' },
      { name: 'Other', value: 'other' },
    ))
    .addStringOption(opt => opt.setName('subject').setDescription('Brief subject').setRequired(false)),

  async execute(interaction) {
    const category = interaction.options.getString('category');
    const subject = interaction.options.getString('subject') || 'No subject';

    if (!category) {
      // Show ticket overview
      const tickets = getUserTickets(interaction.user.id, interaction.guild.id);
      const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'claimed');

      const embed = new EmbedBuilder()
        .setTitle('🎫 NEXAVERSE Tickets')
        .setColor(config.colors.ticket)
        .setDescription('Create a support ticket or view your existing tickets.')
        .setTimestamp();

      if (openTickets.length > 0) {
        embed.addFields(openTickets.map(t => ({
          name: `${t.id} - ${t.category}`,
          value: `Subject: ${t.subject}\nStatus: ${t.status}`,
          inline: true,
        })));
      } else {
        embed.addFields({ name: 'No Active Tickets', value: 'Use the category select below to create a ticket.' });
      }

      const select = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('ticket_create_select')
          .setPlaceholder('Select a category to create a ticket...')
          .addOptions(
            config.ticketCategories.map(cat => ({
              label: cat.label,
              value: cat.id,
              emoji: cat.emoji,
              description: cat.description,
            }))
          )
      );

      return interaction.reply({ embeds: [embed], components: [select], ephemeral: true });
    }

    // Create ticket
    const result = createTicket(interaction.guild.id, interaction.user.id, category, subject);

    const catInfo = config.ticketCategories.find(c => c.id === category);

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`🎫 Ticket Created - ${result.id}`)
          .setDescription(`Category: ${catInfo?.label || category}\nSubject: ${subject}\n\nA staff member will assist you shortly.`)
          .setColor(config.colors.ticket)
          .setTimestamp()
      ],
      ephemeral: true,
    });
  },
};
