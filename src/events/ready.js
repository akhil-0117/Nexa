const { Events, ActivityType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`[NEXAVERSE] Logged in as ${client.user.tag}`);
    console.log(`[NEXAVERSE] Serving ${client.guilds.cache.size} server(s)`);
    console.log(`[NEXAVERSE] ${client.commands.size} commands loaded`);

    client.user.setPresence({
      activities: [{ name: 'NEXAVERSE | /help', type: ActivityType.Watching }],
      status: 'online',
    });

    // Post verification panel in the verification channel
    if (config.verificationChannelId) {
      for (const [, guild] of client.guilds.cache) {
        try {
          const channel = await guild.channels.fetch(config.verificationChannelId);
          if (!channel) continue;

          const messages = await channel.messages.fetch({ limit: 20 });
          const existingPanel = messages.find(m => m.author.id === client.user.id && m.embeds.length > 0 && m.embeds[0].title?.includes('Verification'));

          if (!existingPanel) {
            await sendVerificationPanel(channel);
            console.log(`[NEXAVERSE] Posted verification panel in #${channel.name}`);
          }
        } catch (err) {
          console.error(`[NEXAVERSE] Failed to post verification panel:`, err.message);
        }
      }
    }
  },
};

async function sendVerificationPanel(channel) {
  const embed = new EmbedBuilder()
    .setTitle('🔐 NEXAVERSE Verification')
    .setDescription(
      '**Welcome to the server!**\n\n' +
      'To gain full access, you need to verify your account.\n\n' +
      '**How it works:**\n' +
      '1. Click the **Verify** button below\n' +
      '2. Confirm in the popup that appears\n' +
      '3. You will receive the **Verified** role\n\n' +
      '*This confirms you are a real member and not a bot.*'
    )
    .setColor(config.colors.primary)
    .setFooter({ text: 'NEXAVERSE Verification System' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('verify_confirm')
      .setLabel('Begin Verification')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🔐')
  );

  await channel.send({ embeds: [embed], components: [row] });
}
