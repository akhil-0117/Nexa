const { createCanvas } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');
const config = require('../config');

// Generate a profile card image
async function generateProfileCard(user, userData, xpInfo, rank, repInfo, roleName) {
  const width = 800;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#0f0c29');
  gradient.addColorStop(0.5, '#302b63');
  gradient.addColorStop(1, '#24243e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Accent line
  const accentGradient = ctx.createLinearGradient(0, 0, width, 0);
  accentGradient.addColorStop(0, '#00d4ff');
  accentGradient.addColorStop(0.5, '#7b2ff7');
  accentGradient.addColorStop(1, '#ff6b6b');
  ctx.fillStyle = accentGradient;
  ctx.fillRect(0, 0, width, 4);

  // Avatar circle
  const avatarX = 80;
  const avatarY = 120;
  const avatarR = 55;

  // Avatar glow
  ctx.shadowColor = '#00d4ff';
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarR + 4, 0, Math.PI * 2);
  ctx.fillStyle = '#00d4ff';
  ctx.fill();
  ctx.shadowBlur = 0;

  // Avatar border
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarR + 2, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1a2e';
  ctx.fill();

  // Try to draw avatar
  try {
    const { loadImage } = require('@napi-rs/canvas');
    const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 128 });
    const response = await fetch(avatarUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    const avatarImg = loadImage(buffer);
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatarImg, avatarX - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
    ctx.restore();
  } catch (e) {
    // Fallback circle
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
    ctx.fillStyle = '#302b63';
    ctx.fill();
    ctx.fillStyle = '#00d4ff';
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(user.username.charAt(0).toUpperCase(), avatarX, avatarY);
  }

  // Username
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(user.username, 160, 80);

  // Role badge
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#00d4ff';
  ctx.fillText(roleName, 160, 105);

  // Stats section
  const statsX = 160;
  let statsY = 150;
  const lineHeight = 28;

  const stats = [
    { label: 'Level', value: `${xpInfo.level}`, color: '#f1c40f' },
    { label: 'Rank', value: rank.name, color: rank.color },
    { label: 'Credits', value: `${userData.credits.toLocaleString()}`, color: '#2ecc71' },
    { label: 'Reputation', value: `${repInfo.score}/100 · ${repInfo.level.label}`, color: repInfo.level.color },
    { label: 'Messages', value: `${userData.messages.toLocaleString()}`, color: '#3498db' },
    { label: 'Games', value: `${userData.games_won}W / ${userData.games_played}P`, color: '#9b59b6' },
  ];

  for (const stat of stats) {
    ctx.fillStyle = '#8888aa';
    ctx.font = '14px sans-serif';
    ctx.fillText(stat.label + ':', statsX, statsY);
    ctx.fillStyle = stat.color;
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(stat.value, statsX + 100, statsY);
    statsY += lineHeight;
  }

  // XP Progress bar
  const barX = 160;
  const barY = 340;
  const barWidth = 580;
  const barHeight = 20;
  const progress = xpInfo.xpNeeded > 0 ? xpInfo.xp / xpInfo.xpNeeded : 0;

  // Bar background
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, 10);
  ctx.fill();

  // Bar fill
  const barGradient = ctx.createLinearGradient(barX, 0, barX + barWidth * progress, 0);
  barGradient.addColorStop(0, '#00d4ff');
  barGradient.addColorStop(1, '#7b2ff7');
  ctx.fillStyle = barGradient;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth * progress, barHeight, 10);
  ctx.fill();

  // Bar text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`XP: ${xpInfo.xp} / ${xpInfo.xpNeeded}`, barX + barWidth / 2, barY + 14);

  // Footer
  ctx.textAlign = 'right';
  ctx.fillStyle = '#555577';
  ctx.font = '12px sans-serif';
  ctx.fillText('NEXAVERSE Profile', width - 20, height - 15);

  return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'profile.png' });
}

// Generate a leaderboard image
async function generateLeaderboard(entries, title) {
  const width = 600;
  const height = 50 + entries.length * 50 + 20;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#0f0c29');
  gradient.addColorStop(1, '#302b63');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Top accent
  ctx.fillStyle = '#00d4ff';
  ctx.fillRect(0, 0, width, 3);

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, width / 2, 35);

  // Entries
  const medals = ['🥇', '🥈', '🥉'];
  let y = 70;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const medal = i < 3 ? medals[i] : `${i + 1}.`;

    // Row background
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)';
    ctx.fillRect(10, y - 15, width - 20, 40);

    // Rank
    ctx.fillStyle = i < 3 ? '#f1c40f' : '#8888aa';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(medal, 25, y + 5);

    // Name
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px sans-serif';
    ctx.fillText(entry.name, 65, y + 5);

    // Value
    ctx.fillStyle = '#00d4ff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(entry.value, width - 25, y + 5);

    y += 50;
  }

  return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'leaderboard.png' });
}

// Generate a progress bar string (for text embeds)
function progressBar(current, max, length = 20) {
  const filled = Math.round((current / max) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

module.exports = { generateProfileCard, generateLeaderboard, progressBar };
