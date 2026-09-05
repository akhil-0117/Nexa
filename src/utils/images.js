const { GlobalFonts, createCanvas, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');
const https = require('https');
const http = require('http');
const path = require('path');

// Register Inter font
const fontPath = path.join(__dirname, '..', '..', 'fonts', 'Inter.ttf');
try {
  GlobalFonts.registerFromPath(fontPath, 'Inter');
} catch (e) {}

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

function drawGlassCard(ctx, x, y, w, h, radius, glowColor = 'rgba(100, 50, 255, 0.12)') {
  // Card background - frosted glass
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, 'rgba(18, 8, 42, 0.85)');
  grad.addColorStop(0.5, 'rgba(12, 4, 30, 0.75)');
  grad.addColorStop(1, 'rgba(20, 8, 48, 0.8)');
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, w, h, radius);
  ctx.fill();

  // Border - subtle purple
  ctx.strokeStyle = 'rgba(120, 60, 220, 0.2)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, radius);
  ctx.stroke();

  // Top glass highlight
  const highlight = ctx.createLinearGradient(x, y, x, y + h * 0.3);
  highlight.addColorStop(0, 'rgba(160, 100, 255, 0.08)');
  highlight.addColorStop(1, 'rgba(160, 100, 255, 0)');
  ctx.fillStyle = highlight;
  roundRect(ctx, x, y, w, h * 0.3, radius);
  ctx.fill();

  // Bottom glow
  const glow = ctx.createLinearGradient(x, y + h - 25, x, y + h);
  glow.addColorStop(0, 'rgba(0, 0, 0, 0)');
  glow.addColorStop(1, glowColor);
  ctx.fillStyle = glow;
  roundRect(ctx, x, y, w, h, radius);
  ctx.fill();
}

async function generateProfileCard(user, userData, xpInfo, rank, repInfo, roleName) {
  const width = 900;
  const height = 560;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // === BACKGROUND ===
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#020008');
  bgGrad.addColorStop(0.3, '#080020');
  bgGrad.addColorStop(0.7, '#0a0028');
  bgGrad.addColorStop(1, '#030010');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Main purple radial glow at bottom center
  const mainGlow = ctx.createRadialGradient(width / 2, height + 50, 10, width / 2, height + 50, 400);
  mainGlow.addColorStop(0, 'rgba(100, 30, 255, 0.5)');
  mainGlow.addColorStop(0.3, 'rgba(80, 20, 200, 0.25)');
  mainGlow.addColorStop(0.7, 'rgba(50, 10, 150, 0.08)');
  mainGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = mainGlow;
  ctx.fillRect(0, 0, width, height);

  // Subtle top-right glow
  const topGlow = ctx.createRadialGradient(width - 120, 60, 0, width - 120, 60, 200);
  topGlow.addColorStop(0, 'rgba(120, 50, 255, 0.1)');
  topGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, width, height);

  // === MAIN CARD ===
  const cardMargin = 32;
  const cardX = cardMargin;
  const cardY = cardMargin;
  const cardW = width - cardMargin * 2;
  const cardH = height - cardMargin * 2;
  const cardRadius = 20;

  drawGlassCard(ctx, cardX, cardY, cardW, cardH, cardRadius, 'rgba(90, 30, 200, 0.15)');

  // === TOP SECTION: Brand + Username + Role ===
  // Brand label
  ctx.fillStyle = 'rgba(160, 110, 255, 0.45)';
  ctx.font = '600 13px Inter';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('NEXAVERSE', cardX + 28, cardY + 20);

  // Divider line under brand
  const topDivGrad = ctx.createLinearGradient(cardX + 28, 0, cardX + cardW - 28, 0);
  topDivGrad.addColorStop(0, 'rgba(120, 60, 220, 0.3)');
  topDivGrad.addColorStop(1, 'rgba(60, 30, 140, 0.02)');
  ctx.strokeStyle = topDivGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 28, cardY + 40);
  ctx.lineTo(cardX + cardW - 28, cardY + 40);
  ctx.stroke();

  // === AVATAR SECTION (left side) ===
  const avatarCenterX = 165;
  const avatarCenterY = 240;
  const avatarR = 80;

  // Outer glow ring
  ctx.save();
  ctx.shadowColor = '#7c3aed';
  ctx.shadowBlur = 50;
  ctx.beginPath();
  ctx.arc(avatarCenterX, avatarCenterY, avatarR + 15, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(124, 58, 237, 0.08)';
  ctx.fill();
  ctx.restore();

  // Purple gradient border ring
  const ringGrad = ctx.createLinearGradient(avatarCenterX - avatarR, avatarCenterY - avatarR, avatarCenterX + avatarR, avatarCenterY + avatarR);
  ringGrad.addColorStop(0, '#a855f7');
  ringGrad.addColorStop(0.33, '#8b5cf6');
  ringGrad.addColorStop(0.66, '#7c3aed');
  ringGrad.addColorStop(1, '#6d28d9');

  ctx.beginPath();
  ctx.arc(avatarCenterX, avatarCenterY, avatarR + 6, 0, Math.PI * 2);
  ctx.fillStyle = ringGrad;
  ctx.fill();

  // Dark gap between ring and image
  ctx.beginPath();
  ctx.arc(avatarCenterX, avatarCenterY, avatarR + 2, 0, Math.PI * 2);
  ctx.fillStyle = '#030010';
  ctx.fill();

  // Avatar image
  try {
    const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 512 });
    const buffer = await downloadImage(avatarUrl);
    const avatarImg = await loadImage(buffer);
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY, avatarR, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatarImg, avatarCenterX - avatarR, avatarCenterY - avatarR, avatarR * 2, avatarR * 2);
    ctx.restore();
  } catch (e) {
    // Fallback circle with initial
    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY, avatarR, 0, Math.PI * 2);
    ctx.fillStyle = '#1a0040';
    ctx.fill();
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 56px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(user.username.charAt(0).toUpperCase(), avatarCenterX, avatarCenterY);
  }

  // === RIGHT SECTION: Info ===
  const infoX = 310;
  let infoY = 60;

  // Username (large, clean)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px Inter';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const displayName = user.username.length > 16 ? user.username.substring(0, 14) + '..' : user.username;
  ctx.fillText(displayName, infoX, infoY);
  infoY += 46;

  // Role badge (glass pill with icon)
  const roleText = roleName.toUpperCase();
  ctx.font = '700 11px Inter';
  const roleW = Math.max(ctx.measureText(roleText).width + 28, 90);
  const roleH = 26;
  roundRect(ctx, infoX, infoY, roleW, roleH, 8);
  const roleBg = ctx.createLinearGradient(infoX, infoY, infoX + roleW, infoY);
  roleBg.addColorStop(0, 'rgba(120, 40, 255, 0.3)');
  roleBg.addColorStop(1, 'rgba(80, 20, 180, 0.15)');
  ctx.fillStyle = roleBg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(140, 80, 255, 0.3)';
  ctx.lineWidth = 1;
  roundRect(ctx, infoX, infoY, roleW, roleH, 8);
  ctx.stroke();
  // Role text
  ctx.fillStyle = '#c4b5fd';
  ctx.font = '700 11px Inter';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(roleText, infoX + roleW / 2, infoY + roleH / 2);
  ctx.textAlign = 'left';
  infoY += roleH + 20;

  // === STAT CARDS ROW 1 (3 glass cards) ===
  const stats1 = [
    { icon: '', label: 'Level', value: `${xpInfo.level}` },
    { icon: '', label: 'Rank', value: rank.name },
    { icon: '', label: 'Credits', value: userData.credits.toLocaleString() },
  ];

  const scW = 160;
  const scH = 72;
  const scGap = 14;
  const scStartX = infoX;
  const scStartY = infoY;

  for (let i = 0; i < stats1.length; i++) {
    const sx = scStartX + i * (scW + scGap);
    const sy = scStartY;

    drawGlassCard(ctx, sx, sy, scW, scH, 14, 'rgba(100, 40, 255, 0.1)');

    // Label
    ctx.fillStyle = 'rgba(180, 160, 240, 0.45)';
    ctx.font = '500 10px Inter';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(stats1[i].label, sx + 14, sy + 12);

    // Value
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Inter';
    ctx.fillText(stats1[i].value, sx + 14, sy + 38);
  }

  infoY = scStartY + scH + 14;

  // === STAT CARDS ROW 2 ===
  const stats2 = [
    { icon: '', label: 'Reputation', value: `${repInfo.score}/100` },
    { icon: '', label: 'Messages', value: userData.messages.toLocaleString() },
    { icon: '', label: 'Games', value: `${userData.games_won}W` },
  ];

  const scStartY2 = infoY;

  for (let i = 0; i < stats2.length; i++) {
    const sx = scStartX + i * (scW + scGap);
    const sy = scStartY2;

    drawGlassCard(ctx, sx, sy, scW, scH, 14, 'rgba(100, 40, 255, 0.1)');

    // Label
    ctx.fillStyle = 'rgba(180, 160, 240, 0.45)';
    ctx.font = '500 10px Inter';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(stats2[i].label, sx + 14, sy + 12);

    // Value
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Inter';
    ctx.fillText(stats2[i].value, sx + 14, sy + 38);
  }

  infoY = scStartY2 + scH + 24;

  // === XP PROGRESS BAR ===
  const barX = cardX + 28;
  const barW = cardW - 56;
  const barH = 28;
  const progress = xpInfo.xpNeeded > 0 ? Math.min(xpInfo.xp / xpInfo.xpNeeded, 1) : 0;

  // XP Label
  ctx.fillStyle = 'rgba(180, 160, 240, 0.4)';
  ctx.font = '600 10px Inter';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText('EXPERIENCE', barX, infoY - 6);

  // Bar background
  ctx.fillStyle = 'rgba(8, 2, 25, 0.85)';
  roundRect(ctx, barX, infoY, barW, barH, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120, 60, 220, 0.15)';
  ctx.lineWidth = 1;
  roundRect(ctx, barX, infoY, barW, barH, 14);
  ctx.stroke();

  // Bar fill with glow
  if (progress > 0) {
    const fillW = Math.max(barW * progress, 28);
    const fillGrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
    fillGrad.addColorStop(0, '#7c3aed');
    fillGrad.addColorStop(0.4, '#8b5cf6');
    fillGrad.addColorStop(0.7, '#a855f7');
    fillGrad.addColorStop(1, '#7c3aed');

    ctx.save();
    ctx.shadowColor = '#7c3aed';
    ctx.shadowBlur = 16;
    ctx.fillStyle = fillGrad;
    roundRect(ctx, barX, infoY, fillW, barH, 14);
    ctx.fill();
    ctx.restore();
  }

  // Bar text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px Inter';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`XP ${xpInfo.xp} / ${xpInfo.xpNeeded}`, barX + barW / 2, infoY + barH / 2);

  // === FOOTER ===
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(140, 100, 220, 0.2)';
  ctx.font = '500 11px Inter';
  ctx.textBaseline = 'bottom';
  ctx.fillText('NEXAVERSE', cardX + cardW - 28, cardY + cardH - 14);

  return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'profile.png' });
}

function progressBar(current, max, length = 20) {
  const filled = max > 0 ? Math.round((current / max) * length) : 0;
  const empty = length - filled;
  return '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
}

module.exports = { generateProfileCard, progressBar };
