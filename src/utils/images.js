const { GlobalFonts, createCanvas, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');
const https = require('https');
const http = require('http');
const path = require('path');

// Register fonts
try { GlobalFonts.registerFromPath(path.join(__dirname, '..', '..', 'fonts', 'Inter.ttf'), 'Inter'); } catch (e) {}
try { GlobalFonts.registerFromPath(path.join(__dirname, '..', '..', 'fonts', 'Sora.ttf'), 'Sora'); } catch (e) {}
try { GlobalFonts.registerFromPath(path.join(__dirname, '..', '..', 'fonts', 'CabinetGrotesk-Black.ttf'), 'CabinetGrotesk'); } catch (e) {}
try { GlobalFonts.registerFromPath(path.join(__dirname, '..', '..', 'fonts', 'CabinetGrotesk-Extrabold.ttf'), 'CabinetGrotesk-Extrabold'); } catch (e) {}

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

// Role-specific badge colors matching the HTML template
const BADGE_STYLES = {
  'President':        { color: '#fff4ca', bg1: 'rgba(255,215,0,0.35)',   bg2: 'rgba(184,134,11,0.2)',  border: 'rgba(255,223,0,0.7)',   dot: '#ffd700' },
  'Co-President':     { color: '#f3e8ff', bg1: 'rgba(168,85,247,0.35)', bg2: 'rgba(109,40,217,0.25)', border: 'rgba(192,132,252,0.6)', dot: '#a855f7' },
  'Head of Staff':    { color: '#ffe4e6', bg1: 'rgba(244,63,94,0.3)',   bg2: 'rgba(159,18,57,0.25)',  border: 'rgba(244,63,94,0.6)',   dot: '#f43f5e' },
  'Senior Moderator': { color: '#f3e8ff', bg1: 'rgba(168,85,247,0.25)', bg2: 'rgba(109,40,217,0.15)', border: 'rgba(192,132,252,0.4)', dot: '#a855f7' },
  'Moderator':        { color: '#f3e8ff', bg1: 'rgba(168,85,247,0.2)',  bg2: 'rgba(109,40,217,0.1)',  border: 'rgba(192,132,252,0.3)', dot: '#a855f7' },
  'Trial Moderator':  { color: '#e0e7ff', bg1: 'rgba(99,102,241,0.25)', bg2: 'rgba(67,56,202,0.15)',  border: 'rgba(129,140,248,0.4)', dot: '#818cf8' },
  'Verified':         { color: '#d1fae5', bg1: 'rgba(16,185,129,0.25)', bg2: 'rgba(5,150,105,0.15)',  border: 'rgba(16,185,129,0.5)',  dot: '#10b981' },
  'Newcomer':         { color: '#d1fae5', bg1: 'rgba(16,185,129,0.25)', bg2: 'rgba(5,150,105,0.15)',  border: 'rgba(16,185,129,0.4)',  dot: '#10b981' },
  'Member':           { color: 'rgba(255,255,255,0.9)', bg1: 'rgba(255,255,255,0.12)', bg2: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.2)', dot: '#ffffff' },
};

function getBadgeStyle(roleName) {
  const lower = roleName.toLowerCase();
  for (const [key, style] of Object.entries(BADGE_STYLES)) {
    if (lower.includes(key.toLowerCase())) return { ...style, label: key };
  }
  return { ...BADGE_STYLES['Member'], label: roleName };
}

async function generateProfileCard(user, userData, xpInfo, rank, repInfo, roleName) {
  const W = 1800;
  const H = 1120;
  const S = 2; // scale factor: all original 900x560 coords × 2
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // ===== STAGE BACKGROUND (dark #05030a) =====
  ctx.fillStyle = '#05030a';
  ctx.fillRect(0, 0, W, H);

  // Subtle corner blooms
  const bl1 = ctx.createRadialGradient(W * 0.08, H * 0.95, 0, W * 0.08, H * 0.95, H * 0.7);
  bl1.addColorStop(0, 'rgba(108,43,217,0.18)');
  bl1.addColorStop(1, 'rgba(108,43,217,0)');
  ctx.fillStyle = bl1;
  ctx.fillRect(0, 0, W, H);

  const bl2 = ctx.createRadialGradient(W * 0.92, H * 0.05, 0, W * 0.92, H * 0.05, H * 0.6);
  bl2.addColorStop(0, 'rgba(108,43,217,0.12)');
  bl2.addColorStop(1, 'rgba(108,43,217,0)');
  ctx.fillStyle = bl2;
  ctx.fillRect(0, 0, W, H);

  // ===== BEZEL =====
  const bM = 28 * S;
  const bX = bM, bY = bM, bW = W - bM * 2, bH = H - bM * 2;
  const bR = 44 * S;

  ctx.fillStyle = '#110d19';
  roundRect(ctx, bX, bY, bW, bH, bR);
  ctx.fill();

  // Bezel glow
  ctx.save();
  ctx.shadowColor = 'rgba(108,43,217,0.25)';
  ctx.shadowBlur = 40 * S;
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 2;
  roundRect(ctx, bX, bY, bW, bH, bR);
  ctx.stroke();
  ctx.restore();

  // ===== CARD FACE =====
  const p = 12 * S;
  const cX = bX + p, cY = bY + p, cW = bW - p * 2, cH = bH - p * 2;
  const cR = 30 * S;

  ctx.fillStyle = '#090612';
  roundRect(ctx, cX, cY, cW, cH, cR);
  ctx.fill();

  // Clip card
  ctx.save();
  roundRect(ctx, cX, cY, cW, cH, cR);
  ctx.clip();

  // ===== BOTTOM LIGHT BLOOM =====
  ctx.save();
  ctx.globalAlpha = 0.95;
  const bloomGrad = ctx.createRadialGradient(cX + cW * 0.7, cY + cH * 1.1, 0, cX + cW * 0.7, cY + cH * 1.1, cH * 0.85);
  bloomGrad.addColorStop(0, '#ffffff');
  bloomGrad.addColorStop(0.15, '#d1ccff');
  bloomGrad.addColorStop(0.35, '#8252ff');
  bloomGrad.addColorStop(0.60, '#3b26df');
  bloomGrad.addColorStop(0.80, 'rgba(26,12,79,0)');
  ctx.fillStyle = bloomGrad;
  ctx.fillRect(cX - cW * 0.1, cY + cH * 0.15, cW * 1.2, cH * 0.85);
  ctx.restore();

  // ===== HEADER =====
  let hY = cY + 30 * S;
  const avatarCX = cX + 76 * S;
  const avatarCY = hY + 48 * S;
  const avatarR = 39 * S;

  // Avatar wrap background
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.arc(avatarCX, avatarCY, avatarR + 9 * S, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Avatar inner circle bg
  const avBg = ctx.createLinearGradient(avatarCX - avatarR, avatarCY - avatarR, avatarCX + avatarR, avatarCY + avatarR);
  avBg.addColorStop(0, '#271647');
  avBg.addColorStop(1, '#130927');
  ctx.fillStyle = avBg;
  ctx.beginPath();
  ctx.arc(avatarCX, avatarCY, avatarR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Avatar image
  let avatarFallback = false;
  try {
    const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 512 });
    const buffer = await downloadImage(avatarUrl);
    const avatarImg = await loadImage(buffer);
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCX, avatarCY, avatarR, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatarImg, avatarCX - avatarR, avatarCY - avatarR, avatarR * 2, avatarR * 2);
    ctx.restore();
  } catch (e) {
    avatarFallback = true;
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${34 * S}px CabinetGrotesk`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(user.username.charAt(0).toUpperCase(), avatarCX, avatarCY + 2 * S);
  }

  // ===== TEXT INFO =====
  const tX = cX + 148 * S;
  let tY = cY + 36 * S;

  // Brand "NEXAVERSE"
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = `800 ${10.5 * S}px Inter`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('NEXAVERSE', tX, tY);

  tY += 20 * S;

  // Username
  const displayName = user.username.length > 16 ? user.username.substring(0, 14) + '..' : user.username;
  ctx.font = `900 ${36 * S}px CabinetGrotesk`;
  ctx.fillStyle = '#ffffff';
  const badgeStyle = getBadgeStyle(roleName);
  if (badgeStyle.label === 'President') {
    ctx.save();
    ctx.shadowColor = 'rgba(255,255,255,0.4)';
    ctx.shadowBlur = 12 * S;
    ctx.fillText(displayName, tX, tY);
    ctx.restore();
    ctx.fillText(displayName, tX, tY);
  } else {
    ctx.fillText(displayName, tX, tY);
  }

  tY += 44 * S;

  // ===== BADGES (stacked vertically) =====
  const badges = [];
  badges.push({ text: badgeStyle.label, style: badgeStyle });
  if (userData.verified) {
    badges.push({ text: 'Verified', style: BADGE_STYLES['Verified'] });
  }

  for (const badge of badges) {
    const bStyle = badge.style;
    ctx.font = `800 ${10.5 * S}px Inter`;
    const tw = ctx.measureText(badge.text).width;
    const pillW = tw + 36 * S;
    const pillH = 26 * S;
    const pillR = pillH / 2;

    const pillBg = ctx.createLinearGradient(tX, tY, tX + pillW, tY + pillH);
    pillBg.addColorStop(0, bStyle.bg1);
    pillBg.addColorStop(1, bStyle.bg2);
    ctx.fillStyle = pillBg;
    roundRect(ctx, tX, tY, pillW, pillH, pillR);
    ctx.fill();

    ctx.strokeStyle = bStyle.border;
    ctx.lineWidth = 1.5;
    roundRect(ctx, tX, tY, pillW, pillH, pillR);
    ctx.stroke();

    // Inner highlight
    const pillHL = ctx.createLinearGradient(tX, tY, tX, tY + 8 * S);
    pillHL.addColorStop(0, 'rgba(255,255,255,0.4)');
    pillHL.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = pillHL;
    roundRect(ctx, tX + 2, tY + 1, pillW - 4, 8 * S, pillR);
    ctx.fill();

    // Dot
    ctx.beginPath();
    ctx.arc(tX + 14 * S, tY + pillH / 2, 3.5 * S, 0, Math.PI * 2);
    ctx.fillStyle = bStyle.dot;
    ctx.fill();

    // Text
    ctx.fillStyle = bStyle.color;
    ctx.font = `800 ${10.5 * S}px Inter`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(badge.text.toUpperCase(), tX + 24 * S, tY + pillH / 2);

    tY += pillH + 8 * S;
  }

  // ===== STAT GRID (2 rows x 3 cols) =====
  const isTopRank = rank.position <= 2;
  const repHigh = repInfo.score >= 80;
  const repPerfect = repInfo.score === 100;

  const stats = [
    { label: 'Level', value: `${xpInfo.level}` },
    { label: 'Reputation', value: `${repInfo.score}/100`, repStat: true },
    { label: 'Rank', value: isTopRank ? `#${rank.position}` : (rank.position > 0 ? `#${rank.position}` : 'Unranked'), rankStat: isTopRank },
    { label: 'Credits', value: userData.credits.toLocaleString() },
    { label: 'Messages', value: userData.messages.toLocaleString() },
    { label: 'Games', value: `${userData.games_won}W` },
  ];

  const gridX = cX + 24 * S;
  const gridY = cY + 232 * S;
  const gridGap = 10 * S;
  const gridColW = (cW - 48 * S - gridGap * 2) / 3;
  const gridRowH = 56 * S;

  for (let i = 0; i < stats.length; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const sx = gridX + col * (gridColW + gridGap);
    const sy = gridY + row * (gridRowH + gridGap);

    let bgColor = 'rgba(0,0,0,0.25)';
    let borderColor = 'rgba(255,255,255,0.08)';
    let valueColor = '#ffffff';
    let shadowColor = null;

    if (stats[i].rankStat && rank.position === 1) {
      const g = ctx.createLinearGradient(sx, sy, sx + gridColW, sy + gridRowH);
      g.addColorStop(0, 'rgba(255,215,0,0.18)');
      g.addColorStop(1, 'rgba(0,0,0,0.35)');
      bgColor = g;
      borderColor = 'rgba(255,215,0,0.5)';
      valueColor = '#ffe680';
      shadowColor = 'rgba(255,215,0,0.5)';
    } else if (stats[i].rankStat && rank.position === 2) {
      const g = ctx.createLinearGradient(sx, sy, sx + gridColW, sy + gridRowH);
      g.addColorStop(0, 'rgba(192,192,192,0.18)');
      g.addColorStop(1, 'rgba(0,0,0,0.35)');
      bgColor = g;
      borderColor = 'rgba(211,211,211,0.4)';
      valueColor = '#e2e8f0';
      shadowColor = 'rgba(255,255,255,0.4)';
    } else if (stats[i].repStat && repPerfect) {
      valueColor = '#10b981';
      shadowColor = 'rgba(16,185,129,0.5)';
    } else if (stats[i].repStat && !repHigh) {
      valueColor = '#f43f5e';
      shadowColor = 'rgba(244,63,94,0.5)';
    }

    ctx.fillStyle = bgColor;
    roundRect(ctx, sx, sy, gridColW, gridRowH, 16 * S);
    ctx.fill();

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5;
    roundRect(ctx, sx, sy, gridColW, gridRowH, 16 * S);
    ctx.stroke();

    // Label
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = `800 ${9.5 * S}px Inter`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(stats[i].label.toUpperCase(), sx + 16 * S, sy + 12 * S);

    // Value
    ctx.fillStyle = valueColor;
    ctx.font = `800 ${22 * S}px CabinetGrotesk`;
    ctx.textBaseline = 'top';
    if (shadowColor) {
      ctx.save();
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = 10 * S;
      ctx.fillText(stats[i].value, sx + 16 * S, sy + 28 * S);
      ctx.restore();
      ctx.fillText(stats[i].value, sx + 16 * S, sy + 28 * S);
    } else {
      ctx.fillText(stats[i].value, sx + 16 * S, sy + 28 * S);
    }
  }

  // ===== XP BAR =====
  const xpY = gridY + 2 * (gridRowH + gridGap) + 18 * S;
  const barX = cX + 24 * S;
  const barW = cW - 48 * S;
  const barH = 9 * S;
  const progress = xpInfo.xpNeeded > 0 ? Math.min(xpInfo.xp / xpInfo.xpNeeded, 1) : 0;

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `800 ${9.5 * S}px Inter`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('EXPERIENCE', barX, xpY);

  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${13 * S}px CabinetGrotesk`;
  ctx.textAlign = 'right';
  ctx.fillText(`XP ${xpInfo.xp.toLocaleString()} / ${xpInfo.xpNeeded.toLocaleString()}`, barX + barW, xpY);

  const trackY = xpY + 18 * S;

  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  roundRect(ctx, barX, trackY, barW, barH, barH / 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, barX, trackY, barW, barH, barH / 2);
  ctx.stroke();

  if (progress > 0) {
    const fillW = Math.max(barW * progress, 12 * S);

    ctx.save();
    roundRect(ctx, barX, trackY, barW, barH, barH / 2);
    ctx.clip();

    const fillGrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
    fillGrad.addColorStop(0, '#5b31df');
    fillGrad.addColorStop(0.3, '#9b72ff');
    fillGrad.addColorStop(0.5, '#ffffff');
    fillGrad.addColorStop(0.7, '#9b72ff');
    fillGrad.addColorStop(1, '#5b31df');
    ctx.fillStyle = fillGrad;
    ctx.fillRect(barX, trackY, fillW, barH);

    ctx.shadowColor = 'rgba(255,255,255,0.6)';
    ctx.shadowBlur = 12 * S;
    ctx.fillStyle = 'transparent';
    ctx.fillRect(barX, trackY, fillW, barH);
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  // ===== FOOTER =====
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = `900 ${10 * S}px CabinetGrotesk`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('NEXAVERSE', cX + cW - 24 * S, cY + cH - 14 * S);

  ctx.restore(); // unclip

  return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'profile.png' });
}

// ===== BRAND BANNER (Aether-style) =====
async function generateBrandBanner(text = 'NEXAVERSE', subtitle = 'COMPLETE DISCORD ECOSYSTEM') {
  const W = 1600;
  const H = 500;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const bg = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, W * 0.7);
  bg.addColorStop(0, '#100a20');
  bg.addColorStop(0.6, '#0a0616');
  bg.addColorStop(1, '#050308');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const corner = ctx.createRadialGradient(W * 0.92, H * 0.95, 0, W * 0.92, H * 0.95, H * 0.9);
  corner.addColorStop(0, 'rgba(124, 77, 255, 0.22)');
  corner.addColorStop(1, 'rgba(124, 77, 255, 0)');
  ctx.fillStyle = corner;
  ctx.fillRect(0, 0, W, H);

  ctx.globalAlpha = 0.35;
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let y = 0; y < H; y += 4) {
    for (let x = 0; x < W; x += 4) {
      if ((x + y) % 8 === 0) ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.save();
  ctx.shadowColor = 'rgba(160, 120, 255, 0.35)';
  ctx.shadowBlur = 40;
  ctx.fillStyle = '#f2f0f7';
  ctx.font = `900 ${Math.floor(H * 0.34)}px CabinetGrotesk`;
  ctx.fillText(text, W / 2, H / 2 - (subtitle ? 18 : 0));
  ctx.restore();

  if (subtitle) {
    const chars = subtitle.split('').join(' ');
    ctx.fillStyle = 'rgba(190, 170, 235, 0.55)';
    ctx.font = '700 22px Inter';
    ctx.fillText(chars, W / 2, H / 2 + H * 0.22);
  }

  const lineGrad = ctx.createLinearGradient(W * 0.3, 0, W * 0.7, 0);
  lineGrad.addColorStop(0, 'rgba(160, 120, 255, 0)');
  lineGrad.addColorStop(0.5, 'rgba(190, 160, 255, 0.8)');
  lineGrad.addColorStop(1, 'rgba(160, 120, 255, 0)');
  ctx.fillStyle = lineGrad;
  ctx.fillRect(W * 0.3, H * 0.17, W * 0.4, 2);

  return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'banner.png' });
}

function progressBar(current, max, length = 20) {
  const filled = max > 0 ? Math.round((current / max) * length) : 0;
  const empty = length - filled;
  return '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
}

module.exports = { generateProfileCard, generateBrandBanner, progressBar };
