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

async function generateProfileCard(user, userData, xpInfo, rank, repInfo, roleName) {
  const width = 900;
  const height = 420;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Deep dark purple gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#080012');
  bgGrad.addColorStop(0.4, '#0f0028');
  bgGrad.addColorStop(0.7, '#180040');
  bgGrad.addColorStop(1, '#0a001a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Purple radial glow bottom-center
  const radGlow = ctx.createRadialGradient(width / 2, height + 50, 10, width / 2, height + 50, 400);
  radGlow.addColorStop(0, 'rgba(120, 0, 255, 0.35)');
  radGlow.addColorStop(0.5, 'rgba(80, 0, 180, 0.15)');
  radGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = radGlow;
  ctx.fillRect(0, 0, width, height);

  // Card background - dark with rounded corners
  const cx = 16, cy = 16, cw = width - 32, ch = height - 32;
  const cardGrad = ctx.createLinearGradient(cx, cy, cx, cy + ch);
  cardGrad.addColorStop(0, 'rgba(12, 4, 28, 0.85)');
  cardGrad.addColorStop(1, 'rgba(18, 6, 40, 0.75)');
  ctx.fillStyle = cardGrad;
  ctx.beginPath();
  ctx.roundRect(cx, cy, cw, ch, 18);
  ctx.fill();

  // Subtle border glow
  ctx.strokeStyle = 'rgba(130, 50, 255, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(cx, cy, cw, ch, 18);
  ctx.stroke();

  // Bottom purple accent glow inside card
  const accentGrad = ctx.createLinearGradient(cx, cy + ch - 80, cx, cy + ch);
  accentGrad.addColorStop(0, 'rgba(120, 0, 255, 0)');
  accentGrad.addColorStop(1, 'rgba(120, 0, 255, 0.12)');
  ctx.fillStyle = accentGrad;
  ctx.beginPath();
  ctx.roundRect(cx, cy, cw, ch, 18);
  ctx.fill();

  // === AVATAR (left side) ===
  const avatarX = 145;
  const avatarY = 195;
  const avatarR = 68;

  // Glow behind avatar
  ctx.shadowColor = '#7c3aed';
  ctx.shadowBlur = 40;
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarR + 8, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(120, 0, 255, 0.2)';
  ctx.fill();
  ctx.shadowBlur = 0;

  // Purple-to-cyan gradient ring
  const ringGrad = ctx.createLinearGradient(avatarX - avatarR, avatarY - avatarR, avatarX + avatarR, avatarY + avatarR);
  ringGrad.addColorStop(0, '#7c3aed');
  ringGrad.addColorStop(0.5, '#5b21b6');
  ringGrad.addColorStop(1, '#06b6d4');
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarR + 4, 0, Math.PI * 2);
  ctx.fillStyle = ringGrad;
  ctx.fill();

  // Dark inner border
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarR + 1, 0, Math.PI * 2);
  ctx.fillStyle = '#080012';
  ctx.fill();

  // Draw user avatar
  try {
    const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 256 });
    const buffer = await downloadImage(avatarUrl);
    const avatarImg = await loadImage(buffer);
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatarImg, avatarX - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
    ctx.restore();
  } catch (e) {
    // Fallback: initial letter
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
    ctx.fillStyle = '#1a0040';
    ctx.fill();
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 52px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(user.username.charAt(0).toUpperCase(), avatarX, avatarY);
  }

  // === RIGHT SIDE: Info ===
  const infoX = 270;
  let infoY = 70;

  // Brand label
  ctx.fillStyle = 'rgba(168, 85, 247, 0.5)';
  ctx.font = '600 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('NEXAVERSE', infoX, infoY);
  infoY += 22;

  // Username
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText(user.username.length > 20 ? user.username.substring(0, 18) + '..' : user.username, infoX, infoY);
  infoY += 42;

  // Role badge
  const roleText = roleName.toUpperCase();
  ctx.font = '600 12px sans-serif';
  const roleW = ctx.measureText(roleText).width + 24;
  ctx.fillStyle = 'rgba(120, 0, 255, 0.25)';
  ctx.beginPath();
  ctx.roundRect(infoX, infoY, roleW, 24, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120, 0, 255, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(infoX, infoY, roleW, 24, 8);
  ctx.stroke();
  ctx.fillStyle = '#c4b5fd';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(roleText, infoX + 12, infoY + 7);
  infoY += 40;

  // Divider
  const divGrad = ctx.createLinearGradient(infoX, 0, width - 50, 0);
  divGrad.addColorStop(0, 'rgba(120, 0, 255, 0.4)');
  divGrad.addColorStop(1, 'rgba(6, 182, 212, 0.1)');
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(infoX, infoY);
  ctx.lineTo(width - 50, infoY);
  ctx.stroke();
  infoY += 22;

  // Stats grid
  const col1 = infoX;
  const col2 = infoX + 290;
  let sy = infoY;

  const left = [
    { label: 'Level', value: `${xpInfo.level}` },
    { label: 'Rank', value: rank.name },
    { label: 'Credits', value: userData.credits.toLocaleString() },
  ];
  const right = [
    { label: 'Reputation', value: `${repInfo.score}/100` },
    { label: 'Messages', value: userData.messages.toLocaleString() },
    { label: 'Games', value: `${userData.games_won}W / ${userData.games_played}P` },
  ];

  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    if (left[i]) {
      ctx.fillStyle = 'rgba(196, 181, 253, 0.45)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(left[i].label, col1, sy);
      ctx.fillStyle = '#e9d5ff';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(left[i].value, col1 + 100, sy);
    }
    if (right[i]) {
      ctx.fillStyle = 'rgba(196, 181, 253, 0.45)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(right[i].label, col2, sy);
      ctx.fillStyle = '#e9d5ff';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(right[i].value, col2 + 110, sy);
    }
    sy += 30;
  }

  // === XP PROGRESS BAR ===
  const barX = 270;
  const barY = 350;
  const barW = 590;
  const barH = 20;
  const progress = xpInfo.xpNeeded > 0 ? Math.min(xpInfo.xp / xpInfo.xpNeeded, 1) : 0;

  // Bar background
  ctx.fillStyle = 'rgba(15, 3, 35, 0.9)';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120, 0, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, 10);
  ctx.stroke();

  // Bar fill
  if (progress > 0) {
    const fillW = Math.max(barW * progress, 20);
    const fillGrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
    fillGrad.addColorStop(0, '#7c3aed');
    fillGrad.addColorStop(0.5, '#6d28d9');
    fillGrad.addColorStop(1, '#4c1d95');
    ctx.fillStyle = fillGrad;
    ctx.beginPath();
    ctx.roundRect(barX, barY, fillW, barH, 10);
    ctx.fill();

    // Glow
    ctx.shadowColor = '#7c3aed';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(barX, barY, fillW, barH, 10);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Bar text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`XP ${xpInfo.xp} / ${xpInfo.xpNeeded}`, barX + barW / 2, barY + 14);

  // Footer brand
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(120, 0, 255, 0.35)';
  ctx.font = '11px sans-serif';
  ctx.fillText('NEXAVERSE', width - 40, height - 32);

  return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'profile.png' });
}

function progressBar(current, max, length = 20) {
  const filled = max > 0 ? Math.round((current / max) * length) : 0;
  const empty = length - filled;
  return '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
}

module.exports = { generateProfileCard, progressBar };
