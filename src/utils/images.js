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
  // High resolution canvas
  const width = 1200;
  const height = 800;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // === BACKGROUND: Deep purple-black gradient ===
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#030014');
  bgGrad.addColorStop(0.4, '#0a0030');
  bgGrad.addColorStop(0.7, '#150050');
  bgGrad.addColorStop(1, '#080020');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Bottom center purple radial glow
  const glow1 = ctx.createRadialGradient(width / 2, height + 50, 0, width / 2, height + 50, 600);
  glow1.addColorStop(0, 'rgba(120, 40, 255, 0.5)');
  glow1.addColorStop(0.4, 'rgba(90, 20, 200, 0.25)');
  glow1.addColorStop(0.7, 'rgba(60, 10, 150, 0.1)');
  glow1.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, width, height);

  // Top-left subtle glow
  const glow2 = ctx.createRadialGradient(100, 100, 0, 100, 100, 400);
  glow2.addColorStop(0, 'rgba(140, 60, 255, 0.12)');
  glow2.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, width, height);

  // === MAIN GLASS CARD (matching Neon Insight Cards) ===
  const cardX = 50, cardY = 50, cardW = width - 100, cardH = height - 100;

  // Dark glass background
  const cardBg = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  cardBg.addColorStop(0, 'rgba(8, 2, 25, 0.92)');
  cardBg.addColorStop(0.5, 'rgba(12, 4, 30, 0.88)');
  cardBg.addColorStop(1, 'rgba(18, 6, 40, 0.82)');
  ctx.fillStyle = cardBg;
  roundRect(ctx, cardX, cardY, cardW, cardH, 28);
  ctx.fill();

  // Purple gradient border
  const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  borderGrad.addColorStop(0, 'rgba(140, 80, 255, 0.5)');
  borderGrad.addColorStop(0.3, 'rgba(100, 40, 200, 0.2)');
  borderGrad.addColorStop(0.7, 'rgba(80, 30, 180, 0.15)');
  borderGrad.addColorStop(1, 'rgba(140, 80, 255, 0.35)');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 2.5;
  roundRect(ctx, cardX, cardY, cardW, cardH, 28);
  ctx.stroke();

  // Glass highlight at top
  const glassTop = ctx.createLinearGradient(cardX, cardY, cardX, cardY + 150);
  glassTop.addColorStop(0, 'rgba(160, 100, 255, 0.06)');
  glassTop.addColorStop(1, 'rgba(160, 100, 255, 0)');
  ctx.fillStyle = glassTop;
  roundRect(ctx, cardX, cardY, cardW, 150, 28);
  ctx.fill();

  // Bottom purple accent glow
  const bottomGlow = ctx.createLinearGradient(cardX, cardY + cardH - 200, cardX, cardY + cardH);
  bottomGlow.addColorStop(0, 'rgba(120, 0, 255, 0)');
  bottomGlow.addColorStop(0.5, 'rgba(120, 0, 255, 0.04)');
  bottomGlow.addColorStop(1, 'rgba(140, 50, 255, 0.12)');
  ctx.fillStyle = bottomGlow;
  roundRect(ctx, cardX, cardY, cardW, cardH, 28);
  ctx.fill();

  // === BRAND HEADER ===
  ctx.fillStyle = 'rgba(160, 100, 255, 0.5)';
  ctx.font = '600 18px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('NEXAVERSE', cardX + 40, cardY + 30);

  // === AVATAR SECTION (left side) ===
  const avatarX = 220;
  const avatarY = 340;
  const avatarR = 100;

  // Outer purple glow ring
  ctx.save();
  ctx.shadowColor = '#8b5cf6';
  ctx.shadowBlur = 50;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarR + 14, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(139, 92, 246, 0.12)';
  ctx.fill();
  ctx.restore();

  // Purple gradient ring
  const ringGrad = ctx.createLinearGradient(avatarX - avatarR, avatarY - avatarR, avatarX + avatarR, avatarY + avatarR);
  ringGrad.addColorStop(0, '#a855f7');
  ringGrad.addColorStop(0.25, '#7c3aed');
  ringGrad.addColorStop(0.5, '#6d28d9');
  ringGrad.addColorStop(0.75, '#5b21b6');
  ringGrad.addColorStop(1, '#8b5cf6');
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarR + 6, 0, Math.PI * 2);
  ctx.fillStyle = ringGrad;
  ctx.fill();

  // Dark gap
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarR + 2, 0, Math.PI * 2);
  ctx.fillStyle = '#030014';
  ctx.fill();

  // Avatar image
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
    ctx.font = 'bold 80px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(user.username.charAt(0).toUpperCase(), avatarX, avatarY);
  }

  // === RIGHT SIDE: Username + Role ===
  const infoX = 400;
  let infoY = 130;

  // Username
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const displayName = user.username.length > 16 ? user.username.substring(0, 14) + '..' : user.username;
  ctx.fillText(displayName, infoX, infoY);
  infoY += 60;

  // Role badge (glass pill)
  const roleText = roleName.toUpperCase();
  ctx.font = '600 16px sans-serif';
  const roleW = Math.max(ctx.measureText(roleText).width + 32, 100);
  roundRect(ctx, infoX, infoY, roleW, 32, 8);
  ctx.fillStyle = 'rgba(120, 0, 255, 0.25)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(160, 100, 255, 0.4)';
  ctx.lineWidth = 1;
  roundRect(ctx, infoX, infoY, roleW, 32, 8);
  ctx.stroke();
  ctx.fillStyle = '#c4b5fd';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(roleText, infoX + 16, infoY + 9);
  infoY += 48;

  // Divider
  const divGrad = ctx.createLinearGradient(infoX, 0, cardX + cardW - 40, 0);
  divGrad.addColorStop(0, 'rgba(130, 60, 255, 0.35)');
  divGrad.addColorStop(0.5, 'rgba(100, 40, 200, 0.15)');
  divGrad.addColorStop(1, 'rgba(60, 20, 140, 0.03)');
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(infoX, infoY);
  ctx.lineTo(cardX + cardW - 40, infoY);
  ctx.stroke();
  infoY += 28;

  // === STAT CARDS (Neon Insight Cards style) ===
  const stats = [
    { label: 'Level', value: `${xpInfo.level}` },
    { label: 'Rank', value: rank.name },
    { label: 'Credits', value: userData.credits.toLocaleString() },
    { label: 'Reputation', value: `${repInfo.score}/100` },
    { label: 'Messages', value: userData.messages.toLocaleString() },
    { label: 'Games', value: `${userData.games_won}W / ${userData.games_played}P` },
  ];

  const scW = 220;
  const scH = 85;
  const scGap = 16;
  const scStartX = infoX;
  const scStartY = infoY;
  const cols = 3;

  for (let i = 0; i < stats.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const sx = scStartX + col * (scW + scGap);
    const sy = scStartY + row * (scH + scGap);

    // Glass card background
    const scGrad = ctx.createLinearGradient(sx, sy, sx, sy + scH);
    scGrad.addColorStop(0, 'rgba(12, 4, 30, 0.75)');
    scGrad.addColorStop(1, 'rgba(18, 6, 40, 0.55)');
    ctx.fillStyle = scGrad;
    roundRect(ctx, sx, sy, scW, scH, 14);
    ctx.fill();

    // Card border
    ctx.strokeStyle = 'rgba(130, 60, 255, 0.18)';
    ctx.lineWidth = 1;
    roundRect(ctx, sx, sy, scW, scH, 14);
    ctx.stroke();

    // Bottom purple glow
    const scGlow = ctx.createLinearGradient(sx, sy + scH - 30, sx, sy + scH);
    scGlow.addColorStop(0, 'rgba(100, 0, 255, 0)');
    scGlow.addColorStop(1, 'rgba(120, 40, 255, 0.1)');
    ctx.fillStyle = scGlow;
    roundRect(ctx, sx, sy, scW, scH, 14);
    ctx.fill();

    // Label
    ctx.fillStyle = 'rgba(196, 181, 253, 0.45)';
    ctx.font = '500 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(stats[i].label, sx + 16, sy + 14);

    // Value
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(stats[i].value, sx + 16, sy + 44);
  }

  // === XP PROGRESS BAR ===
  const barX = cardX + 40;
  const barY = height - 130;
  const barW = cardW - 80;
  const barH = 30;
  const progress = xpInfo.xpNeeded > 0 ? Math.min(xpInfo.xp / xpInfo.xpNeeded, 1) : 0;

  // Bar background
  ctx.fillStyle = 'rgba(8, 2, 25, 0.8)';
  roundRect(ctx, barX, barY, barW, barH, 15);
  ctx.fill();
  ctx.strokeStyle = 'rgba(130, 60, 255, 0.15)';
  ctx.lineWidth = 1;
  roundRect(ctx, barX, barY, barW, barH, 15);
  ctx.stroke();

  // Bar fill
  if (progress > 0) {
    const fillW = Math.max(barW * progress, 30);
    const fillGrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
    fillGrad.addColorStop(0, '#7c3aed');
    fillGrad.addColorStop(0.5, '#6d28d9');
    fillGrad.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = fillGrad;
    roundRect(ctx, barX, barY, fillW, barH, 15);
    ctx.fill();

    // Fill glow
    ctx.save();
    ctx.shadowColor = '#7c3aed';
    ctx.shadowBlur = 15;
    roundRect(ctx, barX, barY, fillW, barH, 15);
    ctx.fill();
    ctx.restore();
  }

  // Bar text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`XP  ${xpInfo.xp} / ${xpInfo.xpNeeded}  (${Math.round(progress * 100)}%)`, barX + barW / 2, barY + barH / 2);

  // XP label
  ctx.fillStyle = 'rgba(196, 181, 253, 0.4)';
  ctx.font = '500 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('EXPERIENCE', barX, barY - 18);

  // === FOOTER ===
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(160, 100, 255, 0.25)';
  ctx.font = '500 14px sans-serif';
  ctx.textBaseline = 'bottom';
  ctx.fillText('NEXAVERSE', cardX + cardW - 40, height - 70);

  return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'profile.png' });
}

function progressBar(current, max, length = 20) {
  const filled = max > 0 ? Math.round((current / max) * length) : 0;
  const empty = length - filled;
  return '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
}

module.exports = { generateProfileCard, progressBar };
