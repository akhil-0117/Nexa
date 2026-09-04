const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');
const https = require('https');
const http = require('http');
const config = require('../config');

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadImage(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function generateProfileCard(user, userData, xpInfo, rank, repInfo, roleName) {
  // 1600x900 for high resolution
  const width = 1600;
  const height = 900;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // === BACKGROUND: Deep purple gradient ===
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#05000d');
  bgGrad.addColorStop(0.3, '#0a0020');
  bgGrad.addColorStop(0.6, '#120035');
  bgGrad.addColorStop(1, '#080018');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Large purple radial glow at bottom center
  const glow1 = ctx.createRadialGradient(width / 2, height + 100, 20, width / 2, height + 100, 700);
  glow1.addColorStop(0, 'rgba(100, 0, 255, 0.45)');
  glow1.addColorStop(0.3, 'rgba(80, 0, 200, 0.25)');
  glow1.addColorStop(0.6, 'rgba(60, 0, 160, 0.1)');
  glow1.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, width, height);

  // Secondary glow top-right
  const glow2 = ctx.createRadialGradient(width - 200, 100, 10, width - 200, 100, 400);
  glow2.addColorStop(0, 'rgba(120, 50, 255, 0.15)');
  glow2.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, width, height);

  // === MAIN GLASS CARD ===
  const cardX = 40, cardY = 40, cardW = width - 80, cardH = height - 80;

  // Card background - dark glass
  const cardBg = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  cardBg.addColorStop(0, 'rgba(10, 3, 25, 0.88)');
  cardBg.addColorStop(0.7, 'rgba(15, 5, 35, 0.82)');
  cardBg.addColorStop(1, 'rgba(20, 8, 45, 0.75)');
  ctx.fillStyle = cardBg;
  roundRect(ctx, cardX, cardY, cardW, cardH, 30);
  ctx.fill();

  // Card border - subtle purple glow
  const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  borderGrad.addColorStop(0, 'rgba(130, 60, 255, 0.4)');
  borderGrad.addColorStop(0.5, 'rgba(100, 40, 200, 0.2)');
  borderGrad.addColorStop(1, 'rgba(60, 20, 140, 0.3)');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 2;
  roundRect(ctx, cardX, cardY, cardW, cardH, 30);
  ctx.stroke();

  // Inner glass highlight at top
  const glassHighlight = ctx.createLinearGradient(cardX, cardY, cardX, cardY + 120);
  glassHighlight.addColorStop(0, 'rgba(160, 100, 255, 0.08)');
  glassHighlight.addColorStop(1, 'rgba(160, 100, 255, 0)');
  ctx.fillStyle = glassHighlight;
  roundRect(ctx, cardX, cardY, cardW, 120, 30);
  ctx.fill();

  // Bottom purple accent glow (like Neon Insight Cards)
  const bottomGlow = ctx.createLinearGradient(cardX, cardY + cardH - 180, cardX, cardY + cardH);
  bottomGlow.addColorStop(0, 'rgba(100, 0, 255, 0)');
  bottomGlow.addColorStop(0.5, 'rgba(100, 0, 255, 0.06)');
  bottomGlow.addColorStop(1, 'rgba(120, 40, 255, 0.15)');
  ctx.fillStyle = bottomGlow;
  roundRect(ctx, cardX, cardY, cardW, cardH, 30);
  ctx.fill();

  // === AVATAR (left side) ===
  const avatarX = 280;
  const avatarY = 420;
  const avatarR = 130;

  // Outer glow ring
  ctx.shadowColor = '#7c3aed';
  ctx.shadowBlur = 60;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarR + 12, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(120, 0, 255, 0.15)';
  ctx.fill();
  ctx.shadowBlur = 0;

  // Purple gradient ring
  const ringGrad = ctx.createLinearGradient(avatarX - avatarR, avatarY - avatarR, avatarX + avatarR, avatarY + avatarR);
  ringGrad.addColorStop(0, '#a855f7');
  ringGrad.addColorStop(0.3, '#7c3aed');
  ringGrad.addColorStop(0.7, '#5b21b6');
  ringGrad.addColorStop(1, '#6366f1');
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarR + 6, 0, Math.PI * 2);
  ctx.fillStyle = ringGrad;
  ctx.fill();

  // Dark inner ring
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarR + 2, 0, Math.PI * 2);
  ctx.fillStyle = '#080018';
  ctx.fill();

  // Draw user avatar
  try {
    const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 512 });
    const buffer = await downloadImage(avatarUrl);
    const avatarImg = await loadImage(buffer);
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatarImg, avatarX - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
    ctx.restore();
  } catch (e) {
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
    ctx.fillStyle = '#1a0040';
    ctx.fill();
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 100px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(user.username.charAt(0).toUpperCase(), avatarX, avatarY);
  }

  // === RIGHT SIDE: Info ===
  const infoX = 520;
  let infoY = 160;

  // Brand label
  ctx.fillStyle = 'rgba(168, 85, 247, 0.6)';
  ctx.font = '600 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('NEXAVERSE', infoX, infoY);
  infoY += 40;

  // Username
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 56px sans-serif';
  const displayName = user.username.length > 18 ? user.username.substring(0, 16) + '..' : user.username;
  ctx.fillText(displayName, infoX, infoY);
  infoY += 72;

  // Role badge
  const roleText = roleName.toUpperCase();
  ctx.font = '600 20px sans-serif';
  const roleW = ctx.measureText(roleText).width + 36;
  // Glass badge
  roundRect(ctx, infoX, infoY, roleW, 38, 10);
  ctx.fillStyle = 'rgba(120, 0, 255, 0.2)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(160, 100, 255, 0.4)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, infoX, infoY, roleW, 38, 10);
  ctx.stroke();
  ctx.fillStyle = '#c4b5fd';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(roleText, infoX + 18, infoY + 10);
  infoY += 60;

  // Divider line
  const divGrad = ctx.createLinearGradient(infoX, 0, width - 80, 0);
  divGrad.addColorStop(0, 'rgba(130, 60, 255, 0.4)');
  divGrad.addColorStop(0.5, 'rgba(100, 40, 200, 0.2)');
  divGrad.addColorStop(1, 'rgba(60, 20, 140, 0.05)');
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(infoX, infoY);
  ctx.lineTo(width - 80, infoY);
  ctx.stroke();
  infoY += 35;

  // === STATS CARDS (Neon Insight style) ===
  const stats = [
    { label: 'Level', value: `${xpInfo.level}` },
    { label: 'Rank', value: rank.name },
    { label: 'Credits', value: userData.credits.toLocaleString() },
    { label: 'Reputation', value: `${repInfo.score}/100` },
    { label: 'Messages', value: userData.messages.toLocaleString() },
    { label: 'Games', value: `${userData.games_won}W / ${userData.games_played}P` },
  ];

  const cardWidth = 300;
  const cardHeight = 100;
  const gap = 24;
  const startX = infoX;
  const startY = infoY;
  const cols = 3;

  for (let i = 0; i < stats.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const sx = startX + col * (cardWidth + gap);
    const sy = startY + row * (cardHeight + gap);

    // Glass stat card background
    const statCardGrad = ctx.createLinearGradient(sx, sy, sx, sy + cardHeight);
    statCardGrad.addColorStop(0, 'rgba(15, 5, 35, 0.7)');
    statCardGrad.addColorStop(1, 'rgba(20, 8, 45, 0.5)');
    ctx.fillStyle = statCardGrad;
    roundRect(ctx, sx, sy, cardWidth, cardHeight, 16);
    ctx.fill();

    // Card border
    ctx.strokeStyle = 'rgba(130, 60, 255, 0.2)';
    ctx.lineWidth = 1;
    roundRect(ctx, sx, sy, cardWidth, cardHeight, 16);
    ctx.stroke();

    // Bottom purple glow on stat card
    const statGlow = ctx.createLinearGradient(sx, sy + cardHeight - 40, sx, sy + cardHeight);
    statGlow.addColorStop(0, 'rgba(100, 0, 255, 0)');
    statGlow.addColorStop(1, 'rgba(120, 40, 255, 0.12)');
    ctx.fillStyle = statGlow;
    roundRect(ctx, sx, sy, cardWidth, cardHeight, 16);
    ctx.fill();

    // Label
    ctx.fillStyle = 'rgba(196, 181, 253, 0.5)';
    ctx.font = '500 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(stats[i].label, sx + 20, sy + 28);

    // Value
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(stats[i].value, sx + 20, sy + 68);
  }

  // === XP PROGRESS BAR ===
  const barX = infoX;
  const barY = startY + 2 * (cardHeight + gap) + 20;
  const barW = cardWidth * 3 + gap * 2;
  const barH = 36;
  const progress = xpInfo.xpNeeded > 0 ? Math.min(xpInfo.xp / xpInfo.xpNeeded, 1) : 0;

  // Bar background
  ctx.fillStyle = 'rgba(10, 3, 25, 0.8)';
  roundRect(ctx, barX, barY, barW, barH, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(130, 60, 255, 0.2)';
  ctx.lineWidth = 1;
  roundRect(ctx, barX, barY, barW, barH, 18);
  ctx.stroke();

  // Bar fill
  if (progress > 0) {
    const fillW = Math.max(barW * progress, 36);
    const fillGrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
    fillGrad.addColorStop(0, '#7c3aed');
    fillGrad.addColorStop(0.5, '#6d28d9');
    fillGrad.addColorStop(1, '#5b21b6');
    ctx.fillStyle = fillGrad;
    roundRect(ctx, barX, barY, fillW, barH, 18);
    ctx.fill();

    // Glow on fill
    ctx.shadowColor = '#7c3aed';
    ctx.shadowBlur = 20;
    roundRect(ctx, barX, barY, fillW, barH, 18);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Bar text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`XP ${xpInfo.xp} / ${xpInfo.xpNeeded}`, barX + barW / 2, barY + 24);

  // === FOOTER ===
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
  ctx.font = '500 18px sans-serif';
  ctx.fillText('NEXAVERSE', width - 80, height - 70);

  return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'profile.png' });
}

function progressBar(current, max, length = 20) {
  const filled = max > 0 ? Math.round((current / max) * length) : 0;
  const empty = length - filled;
  return '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
}

module.exports = { generateProfileCard, progressBar };
