const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getItems } = require('../systems/shop');
const config = require('../config');
const { formatCredits } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Browse the NEXAVERSE Shop')
    .addStringOption(opt => opt.setName('category').setDescription('Filter by category').addChoices(
      { name: 'All', value: 'all' },
      { name: 'Roles', value: 'roles' },
      { name: 'Cosmetics', value: 'cosmetics' },
      { name: 'Perks', value: 'perks' },
      { name: 'Special', value: 'special' },
    )),

  async execute(interaction) {
    const category = interaction.options.getString('category') || 'all';
    const items = getItems(interaction.guild.id, category === 'all' ? null : category);

    if (items.length === 0) {
      return interaction.reply({ embeds: [
        new EmbedBuilder().setTitle('🛒 Shop').setDescription('No items available yet.').setColor(config.colors.info)
      ], ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('🛒 NEXAVERSE Shop')
      .setColor(config.colors.economy)
      .setDescription('Browse and purchase items with your Credits!')
      .setTimestamp();

    for (const item of items.slice(0, 10)) {
      embed.addFields({
        name: `${item.emoji} ${item.name}`,
        value: `${item.description || 'No description'}\n💰 Price: **${formatCredits(item.price)}**${item.stock > 0 ? `\n📦 Stock: ${item.stock}` : ''}`,
        inline: true,
      });
    }

    if (items.length > 0) {
      const select = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('shop_select_item')
          .setPlaceholder('Select an item to purchase...')
          .addOptions(items.slice(0, 25).map(item => ({
            label: `${item.name} - ${item.price} Credits`,
            value: item.id,
            emoji: item.emoji,
            description: item.description?.substring(0, 100) || 'Purchase this item',
          })))
      );
      await interaction.reply({ embeds: [embed], components: [select], ephemeral: true });
    } else {
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
