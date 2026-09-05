const { GlobalFonts, createCanvas, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');
const https = require('https');
const http = require('http');
const path = require('path');
const config = require('../config');

// Register Inter font for canvas text rendering
const fontPath = path.join(__dirname, '..', '..', 'fonts', 'Inter.ttf');
try {
  GlobalFonts.registerFromPath(fontPath, 'Inter');
} catch (e) {
  // Font may already be registered
}

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
  const width = 800;
  const height = 500;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // === BACKGROUND: Deep purple-black gradient (Neon Insight style) ===
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#030010');
  bgGrad.addColorStop(0.5, '#0a0028');
  bgGrad.addColorStop(1, '#050015');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Bottom center purple radial glow
  const glow1 = ctx.createRadialGradient(width / 2, height + 30, 0, width / 2, height + 30, 350);
  glow1.addColorStop(0, 'rgba(120, 40, 255, 0.45)');
  glow1.addColorStop(0.4, 'rgba(90, 20, 200, 0.2)');
  glow1.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, width, height);

  // Top-right subtle glow
  const glow2 = ctx.createRadialGradient(width - 100, 80, 0, width - 100, 80, 250);
  glow2.addColorStop(0, 'rgba(130, 60, 255, 0.1)');
  glow2.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, width, height);

  // === MAIN GLASS CARD (exact Neon Insight style) ===
  const cardX = 30, cardY = 30, cardW = width - 60, cardH = height - 60;

  // Dark glass background
  const cardBg = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  cardBg.addColorStop(0, 'rgba(10, 3, 28, 0.92)');
  cardBg.addColorStop(1, 'rgba(15, 5, 35, 0.85)');
  ctx.fillStyle = cardBg;
  roundRect(ctx, cardX, cardY, cardW, cardH, 24);
  ctx.fill();

  // Purple gradient border
  const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  borderGrad.addColorStop(0, 'rgba(140, 80, 255, 0.45)');
  borderGrad.addColorStop(0.5, 'rgba(100, 40, 200, 0.15)');
  borderGrad.addColorStop(1, 'rgba(140, 80, 255, 0.3)');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 2;
  roundRect(ctx, cardX, cardY, cardW, cardH, 24);
  ctx.stroke();

  // Glass highlight at top
  const glassTop = ctx.createLinearGradient(cardX, cardY, cardX, cardY + 80);
  glassTop.addColorStop(0, 'rgba(160, 100, 255, 0.06)');
  glassTop.addColorStop(1, 'rgba(160, 100, 255, 0)');
  ctx.fillStyle = glassTop;
  roundRect(ctx, cardX, cardY, cardW, 80, 24);
  ctx.fill();

  // Bottom purple accent glow
  const bottomGlow = ctx.createLinearGradient(cardX, cardY + cardH - 120, cardX, cardY + cardH);
  bottomGlow.addColorStop(0, 'rgba(120, 0, 255, 0)');
  bottomGlow.addColorStop(1, 'rgba(140, 50, 255, 0.1)');
  ctx.fillStyle = bottomGlow;
  roundRect(ctx, cardX, cardY, cardW, cardH, 24);
  ctx.fill();

  // === BRAND LABEL ===
  ctx.fillStyle = 'rgba(160, 100, 255, 0.5)';
  ctx.font = '600 14px Inter';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('NEXAVERSE', cardX + 24, cardY + 18);

  // === AVATAR (left side, centered vertically) ===
  const avatarX = 150;
  const avatarY = 250;
  const avatarR = 70;

  // Outer purple glow
  ctx.save();
  ctx.shadowColor = '#8b5cf6';
  ctx.shadowBlur = 40;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarR + 10, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(139, 92, 246, 0.1)';
  ctx.fill();
  ctx.restore();

  // Purple gradient ring
  const ringGrad = ctx.createLinearGradient(avatarX - avatarR, avatarY - avatarR, avatarX + avatarR, avatarY + avatarR);
  ringGrad.addColorStop(0, '#a855f7');
  ringGrad.addColorStop(0.5, '#7c3aed');
  ringGrad.addColorStop(1, '#6d28d9');
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarR + 5, 0, Math.PI * 2);
  ctx.fillStyle = ringGrad;
  ctx.fill();

  // Dark gap
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarR + 2, 0, Math.PI * 2);
  ctx.fillStyle = '#030010';
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
    ctx.font = 'bold 50px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(user.username.charAt(0).toUpperCase(), avatarX, avatarY);
  }

  // === RIGHT SIDE: Info ===
  const infoX = 280;
  let infoY = 70;

  // Username
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px Inter';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const displayName = user.username.length > 14 ? user.username.substring(0, 12) + '..' : user.username;
  ctx.fillText(displayName, infoX, infoY);
  infoY += 40;

  // Role badge (glass pill)
  const roleText = roleName.toUpperCase();
  ctx.font = '600 12px Inter';
  const roleW = Math.max(ctx.measureText(roleText).width + 24, 80);
  roundRect(ctx, infoX, infoY, roleW, 24, 6);
  ctx.fillStyle = 'rgba(120, 0, 255, 0.25)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(160, 100, 255, 0.35)';
  ctx.lineWidth = 1;
  roundRect(ctx, infoX, infoY, roleW, 24, 6);
  ctx.stroke();
  ctx.fillStyle = '#c4b5fd';
  ctx.font = 'bold 11px Inter';
  ctx.fillText(roleText, infoX + 12, infoY + 7);
  infoY += 36;

  // Divider
  const divGrad = ctx.createLinearGradient(infoX, 0, cardX + cardW - 24, 0);
  divGrad.addColorStop(0, 'rgba(130, 60, 255, 0.3)');
  divGrad.addColorStop(1, 'rgba(60, 20, 140, 0.02)');
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(infoX, infoY);
  ctx.lineTo(cardX + cardW - 24, infoY);
  ctx.stroke();
  infoY += 16;

  // === STAT CARDS (Neon Insight style - 3 glass cards) ===
  const stats = [
    { label: 'Level', value: `${xpInfo.level}` },
    { label: 'Rank', value: rank.name },
    { label: 'Credits', value: userData.credits.toLocaleString() },
  ];

  const scW = 150;
  const scH = 65;
  const scGap = 12;

  for (let i = 0; i < stats.length; i++) {
    const sx = infoX + i * (scW + scGap);
    const sy = infoY;

    // Glass card
    const scGrad = ctx.createLinearGradient(sx, sy, sx, sy + scH);
    scGrad.addColorStop(0, 'rgba(12, 4, 30, 0.7)');
    scGrad.addColorStop(1, 'rgba(18, 6, 40, 0.5)');
    ctx.fillStyle = scGrad;
    roundRect(ctx, sx, sy, scW, scH, 12);
    ctx.fill();

    ctx.strokeStyle = 'rgba(130, 60, 255, 0.15)';
    ctx.lineWidth = 1;
    roundRect(ctx, sx, sy, scW, scH, 12);
    ctx.stroke();

    // Bottom glow
    const scGlow = ctx.createLinearGradient(sx, sy + scH - 20, sx, sy + scH);
    scGlow.addColorStop(0, 'rgba(100, 0, 255, 0)');
    scGlow.addColorStop(1, 'rgba(120, 40, 255, 0.08)');
    ctx.fillStyle = scGlow;
    roundRect(ctx, sx, sy, scW, scH, 12);
    ctx.fill();

    // Label
    ctx.fillStyle = 'rgba(196, 181, 253, 0.4)';
    ctx.font = '500 10px Inter';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(stats[i].label, sx + 12, sy + 10);

    // Value
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Inter';
    ctx.fillText(stats[i].value, sx + 12, sy + 32);
  }

  infoY += scH + 12;

  // === SECOND ROW: Reputation, Messages, Games ===
  const stats2 = [
    { label: 'Reputation', value: `${repInfo.score}/100` },
    { label: 'Messages', value: userData.messages.toLocaleString() },
    { label: 'Games', value: `${userData.games_won}W` },
  ];

  for (let i = 0; i < stats2.length; i++) {
    const sx = infoX + i * (scW + scGap);
    const sy = infoY;

    const scGrad = ctx.createLinearGradient(sx, sy, sx, sy + scH);
    scGrad.addColorStop(0, 'rgba(12, 4, 30, 0.7)');
    scGrad.addColorStop(1, 'rgba(18, 6, 40, 0.5)');
    ctx.fillStyle = scGrad;
    roundRect(ctx, sx, sy, scW, scH, 12);
    ctx.fill();

    ctx.strokeStyle = 'rgba(130, 60, 255, 0.15)';
    ctx.lineWidth = 1;
    roundRect(ctx, sx, sy, scW, scH, 12);
    ctx.stroke();

    const scGlow2 = ctx.createLinearGradient(sx, sy + scH - 20, sx, sy + scH);
    scGlow2.addColorStop(0, 'rgba(100, 0, 255, 0)');
    scGlow2.addColorStop(1, 'rgba(120, 40, 255, 0.08)');
    ctx.fillStyle = scGlow2;
    roundRect(ctx, sx, sy, scW, scH, 12);
    ctx.fill();

    ctx.fillStyle = 'rgba(196, 181, 253, 0.4)';
    ctx.font = '500 10px Inter';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(stats2[i].label, sx + 12, sy + 10);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Inter';
    ctx.fillText(stats2[i].value, sx + 12, sy + 32);
  }

  infoY += scH + 20;

  // === XP PROGRESS BAR ===
  const barX = cardX + 24;
  const barY = infoY;
  const barW = cardW - 48;
  const barH = 24;
  const progress = xpInfo.xpNeeded > 0 ? Math.min(xpInfo.xp / xpInfo.xpNeeded, 1) : 0;

  // Bar background
  ctx.fillStyle = 'rgba(8, 2, 25, 0.8)';
  roundRect(ctx, barX, barY, barW, barH, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(130, 60, 255, 0.12)';
  ctx.lineWidth = 1;
  roundRect(ctx, barX, barY, barW, barH, 12);
  ctx.stroke();

  // Bar fill
  if (progress > 0) {
    const fillW = Math.max(barW * progress, 24);
    const fillGrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
    fillGrad.addColorStop(0, '#7c3aed');
    fillGrad.addColorStop(0.5, '#6d28d9');
    fillGrad.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = fillGrad;
    roundRect(ctx, barX, barY, fillW, barH, 12);
    ctx.fill();

    ctx.save();
    ctx.shadowColor = '#7c3aed';
    ctx.shadowBlur = 12;
    roundRect(ctx, barX, barY, fillW, barH, 12);
    ctx.fill();
    ctx.restore();
  }

  // Bar text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px Inter';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`XP  ${xpInfo.xp} / ${xpInfo.xpNeeded}`, barX + barW / 2, barY + barH / 2);

  // XP label
  ctx.fillStyle = 'rgba(196, 181, 253, 0.35)';
  ctx.font = '500 10px Inter';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText('EXPERIENCE', barX, barY - 4);

  // === FOOTER ===
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(160, 100, 255, 0.2)';
  ctx.font = '500 11px Inter';
  ctx.textBaseline = 'bottom';
  ctx.fillText('NEXAVERSE', cardX + cardW - 24, cardY + cardH - 10);

  return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'profile.png' });
}

function progressBar(current, max, length = 20) {
  const filled = max > 0 ? Math.round((current / max) * length) : 0;
  const empty = length - filled;
  return '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
}

module.exports = { generateProfileCard, progressBar };
