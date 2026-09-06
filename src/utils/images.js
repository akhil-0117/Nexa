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

// Wallet tier based on credits
function getWalletTier(credits) {
  if (credits >= 100000) return { label: 'VIP TIER', color: '#fff4ca', bg1: 'rgba(255,215,0,0.35)', bg2: 'rgba(184,134,11,0.2)', border: 'rgba(255,223,0,0.7)' };
  if (credits >= 10000) return { label: 'TIER 2', color: '#f3e8ff', bg1: 'rgba(168,85,247,0.35)', bg2: 'rgba(109,40,217,0.25)', border: 'rgba(192,132,252,0.6)' };
  return { label: 'TIER 1', color: '#e2e8f0', bg1: 'rgba(255,255,255,0.15)', bg2: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.25)' };
}

function formatCompact(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
}

async function generateProfileCard(user, userData, xpInfo, rank, repInfo, roleName) {
  const W = 1800;
  const H = 1120;
  const S = 2;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // ===== STAGE BACKGROUND =====
  ctx.fillStyle = '#05030a';
  ctx.fillRect(0, 0, W, H);

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

  ctx.save();
  roundRect(ctx, cX, cY, cW, cH, cR);
  ctx.clip();

  // Bottom bloom
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

  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.arc(avatarCX, avatarCY, avatarR + 9 * S, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  ctx.stroke();

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
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${34 * S}px CabinetGrotesk`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(user.username.charAt(0).toUpperCase(), avatarCX, avatarCY + 2 * S);
  }

  // ===== TEXT INFO =====
  const tX = cX + 148 * S;
  let tY = cY + 36 * S;

  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = `800 ${10.5 * S}px Inter`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('NEXAVERSE', tX, tY);

  tY += 20 * S;

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

  // Badges
  const badges = [];
  badges.push({ text: badgeStyle.label, style: badgeStyle });
  if (userData.verified) badges.push({ text: 'Verified', style: BADGE_STYLES['Verified'] });

  for (const badge of badges) {
    const bStyle = badge.style;
    ctx.font = `800 ${11 * S}px Inter`;
    const tw = ctx.measureText(badge.text).width;
    const pillW = tw + 38 * S;
    const pillH = 28 * S;
    const pillR = pillH / 2;

    // Glass pill background
    ctx.save();
    ctx.globalAlpha = 0.85;
    const pillBg = ctx.createLinearGradient(tX, tY, tX + pillW, tY + pillH);
    pillBg.addColorStop(0, bStyle.bg1);
    pillBg.addColorStop(1, bStyle.bg2);
    ctx.fillStyle = pillBg;
    roundRect(ctx, tX, tY, pillW, pillH, pillR);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = bStyle.border;
    ctx.lineWidth = 1.5;
    roundRect(ctx, tX, tY, pillW, pillH, pillR);
    ctx.stroke();

    // Dot indicator
    ctx.beginPath();
    ctx.arc(tX + 14 * S, tY + pillH / 2, 4 * S, 0, Math.PI * 2);
    ctx.fillStyle = bStyle.dot;
    ctx.fill();

    // Label text (title case, NOT uppercase)
    ctx.fillStyle = bStyle.color;
    ctx.font = `700 ${11 * S}px Inter`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(badge.text, tX + 24 * S, tY + pillH / 2 + 1);
    tY += pillH + 10 * S;
  }

  // ===== STAT GRID =====
  const isTopRank = rank.position <= 2;
  const repPerfect = repInfo.score === 100;
  const repHigh = repInfo.score >= 80;

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
      bgColor = g; borderColor = 'rgba(255,215,0,0.5)'; valueColor = '#ffe680'; shadowColor = 'rgba(255,215,0,0.5)';
    } else if (stats[i].rankStat && rank.position === 2) {
      const g = ctx.createLinearGradient(sx, sy, sx + gridColW, sy + gridRowH);
      g.addColorStop(0, 'rgba(192,192,192,0.18)');
      g.addColorStop(1, 'rgba(0,0,0,0.35)');
      bgColor = g; borderColor = 'rgba(211,211,211,0.4)'; valueColor = '#e2e8f0'; shadowColor = 'rgba(255,255,255,0.4)';
    } else if (stats[i].repStat && repPerfect) {
      valueColor = '#10b981'; shadowColor = 'rgba(16,185,129,0.5)';
    } else if (stats[i].repStat && !repHigh) {
      valueColor = '#f43f5e'; shadowColor = 'rgba(244,63,94,0.5)';
    }

    ctx.fillStyle = bgColor;
    roundRect(ctx, sx, sy, gridColW, gridRowH, 16 * S);
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5;
    roundRect(ctx, sx, sy, gridColW, gridRowH, 16 * S);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = `800 ${9.5 * S}px Inter`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(stats[i].label.toUpperCase(), sx + 16 * S, sy + 12 * S);

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

  // Footer
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = `900 ${10 * S}px CabinetGrotesk`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('NEXAVERSE', cX + cW - 24 * S, cY + cH - 14 * S);

  ctx.restore();
  return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'profile.png' });
}

// ===== WALLET CARD =====
async function generateWalletCard(user, userData, transactions, roleName) {
  const W = 1800;
  const H = 1120;
  const S = 2;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#05030a';
  ctx.fillRect(0, 0, W, H);

  const bl1 = ctx.createRadialGradient(W * 0.08, H * 0.95, 0, W * 0.08, H * 0.95, H * 0.7);
  bl1.addColorStop(0, 'rgba(108,43,217,0.18)');
  bl1.addColorStop(1, 'rgba(108,43,217,0)');
  ctx.fillStyle = bl1;
  ctx.fillRect(0, 0, W, H);

  // Bezel
  const bM = 28 * S;
  const bX = bM, bY = bM, bW = W - bM * 2, bH = H - bM * 2;
  const bR = 44 * S;

  ctx.fillStyle = '#110d19';
  roundRect(ctx, bX, bY, bW, bH, bR);
  ctx.fill();

  ctx.save();
  ctx.shadowColor = 'rgba(108,43,217,0.25)';
  ctx.shadowBlur = 40 * S;
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 2;
  roundRect(ctx, bX, bY, bW, bH, bR);
  ctx.stroke();
  ctx.restore();

  // Card face
  const p = 12 * S;
  const cX = bX + p, cY = bY + p, cW = bW - p * 2, cH = bH - p * 2;
  const cR = 30 * S;

  ctx.fillStyle = '#090612';
  roundRect(ctx, cX, cY, cW, cH, cR);
  ctx.fill();

  ctx.save();
  roundRect(ctx, cX, cY, cW, cH, cR);
  ctx.clip();

  // Bottom bloom
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

  // Avatar wrap
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.arc(avatarCX, avatarCY, avatarR + 9 * S, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  ctx.stroke();

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
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${34 * S}px CabinetGrotesk`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(user.username.charAt(0).toUpperCase(), avatarCX, avatarCY + 2 * S);
  }

  // Text info
  const tX = cX + 148 * S;
  let tY = cY + 36 * S;

  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = `800 ${10.5 * S}px Inter`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('NEXAVERSE WALLET', tX, tY);

  tY += 20 * S;

  const displayName = user.username.length > 16 ? user.username.substring(0, 14) + '..' : user.username;
  ctx.font = `900 ${36 * S}px CabinetGrotesk`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(displayName, tX, tY);

  // Wallet tier badge (right side)
  const tier = getWalletTier(userData.credits);
  ctx.font = `800 ${10.5 * S}px Inter`;
  const tierTW = ctx.measureText(tier.label).width;
  const tierPillW = tierTW + 36 * S;
  const tierPillH = 26 * S;
  const tierPillX = cX + cW - tierPillW - 24 * S;
  const tierPillY = cY + 50 * S;

  const tierBg = ctx.createLinearGradient(tierPillX, tierPillY, tierPillX + tierPillW, tierPillY + tierPillH);
  tierBg.addColorStop(0, tier.bg1);
  tierBg.addColorStop(1, tier.bg2);
  ctx.fillStyle = tierBg;
  roundRect(ctx, tierPillX, tierPillY, tierPillW, tierPillH, tierPillH / 2);
  ctx.fill();
  ctx.strokeStyle = tier.border;
  ctx.lineWidth = 1.5;
  roundRect(ctx, tierPillX, tierPillY, tierPillW, tierPillH, tierPillH / 2);
  ctx.stroke();

  ctx.fillStyle = tier.color;
  ctx.font = `800 ${10.5 * S}px Inter`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tier.label, tierPillX + tierPillW / 2, tierPillY + tierPillH / 2);

  tY += 56 * S;

  // ===== HERO BALANCE =====
  const heroX = cX + 24 * S;
  const heroW = cW - 48 * S;
  const heroH = 80 * S;
  const heroR = 20 * S;

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(ctx, heroX, tY, heroW, heroH, heroR);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, heroX, tY, heroW, heroH, heroR);
  ctx.stroke();

  // Label
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = `800 ${9.5 * S}px Inter`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('TOTAL CREDITS', heroX + 24 * S, tY + 16 * S);

  // Value
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${38 * S}px CabinetGrotesk`;
  ctx.save();
  ctx.shadowColor = 'rgba(160,120,255,0.35)';
  ctx.shadowBlur = 20 * S;
  ctx.fillText(userData.credits.toLocaleString(), heroX + 24 * S, tY + 32 * S);
  ctx.restore();
  ctx.fillText(userData.credits.toLocaleString(), heroX + 24 * S, tY + 32 * S);

  // CR suffix
  const crX = heroX + 24 * S + ctx.measureText(userData.credits.toLocaleString()).width + 6 * S;
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = `600 ${18 * S}px CabinetGrotesk`;
  ctx.fillText('CR', crX, tY + 44 * S);

  // Delta (right side) — calculate from recent transactions
  let delta24h = 0;
  const now = Date.now();
  const h24 = 24 * 60 * 60 * 1000;
  if (transactions && transactions.length > 0) {
    for (const tx of transactions) {
      if (tx.created_at && (now - tx.created_at) < h24) {
        delta24h += tx.amount;
      }
    }
  }

  const deltaStr = delta24h >= 0 ? `+${formatCompact(delta24h)}` : formatCompact(delta24h);
  ctx.fillStyle = delta24h >= 0 ? '#34d399' : '#f43f5e';
  ctx.font = `700 ${15 * S}px CabinetGrotesk`;
  ctx.textAlign = 'right';
  ctx.save();
  ctx.shadowColor = delta24h >= 0 ? 'rgba(52,211,153,0.4)' : 'rgba(244,63,94,0.4)';
  ctx.shadowBlur = 10 * S;
  ctx.fillText(`${deltaStr} CR`, heroX + heroW - 24 * S, tY + 36 * S);
  ctx.restore();

  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = `800 ${9.5 * S}px Inter`;
  ctx.fillText('LAST 24H', heroX + heroW - 24 * S, tY + 56 * S);
  ctx.textAlign = 'left';

  tY += heroH + 14 * S;

  // ===== STATS GRID (4 cols) =====
  const statsTotal = userData.credits + (userData.transfers_sent || 0) + (userData.transfers_received || 0);
  const walletStats = [
    { label: 'Credits', value: userData.credits.toLocaleString() },
    { label: 'Sent', value: (userData.transfers_sent || 0).toLocaleString() },
    { label: 'Received', value: (userData.transfers_received || 0).toLocaleString() },
    { label: 'Reputation', value: `${userData.reputation}/100` },
  ];

  const gridGap = 10 * S;
  const gridColW = (cW - 48 * S - gridGap * 3) / 4;
  const gridRowH = 52 * S;

  for (let i = 0; i < walletStats.length; i++) {
    const sx = cX + 24 * S + i * (gridColW + gridGap);
    const sy = tY;

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    roundRect(ctx, sx, sy, gridColW, gridRowH, 16 * S);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, sx, sy, gridColW, gridRowH, 16 * S);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = `800 ${9 * S}px Inter`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(walletStats[i].label.toUpperCase(), sx + 14 * S, sy + 10 * S);

    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${16 * S}px CabinetGrotesk`;
    ctx.fillText(walletStats[i].value, sx + 14 * S, sy + 26 * S);
  }

  tY += gridRowH + 16 * S;

  // ===== RECENT TRANSACTIONS =====
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = `800 ${9.5 * S}px Inter`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('RECENT ACTIVITY', cX + 24 * S, tY);
  tY += 18 * S;

  const recentTx = (transactions || []).slice(0, 3);
  const txRowH = 44 * S;
  const txGap = 8 * S;

  for (const tx of recentTx) {
    const isPositive = tx.amount > 0;
    const txColor = isPositive ? 'rgba(52,211,153,0.12)' : 'rgba(244,63,94,0.12)';
    const txBorder = isPositive ? 'rgba(52,211,153,0.3)' : 'rgba(244,63,94,0.3)';
    const txIconColor = isPositive ? '#34d399' : '#f43f5e';
    const txLabel = { transfer: 'Transfer', daily_reward: 'Daily Claim', weekly_reward: 'Weekly Claim', game_payout: 'Game Win', admin_adjustment: 'Adjustment', event_payout: 'Event Prize' }[tx.type] || tx.type;

    // Row bg
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    roundRect(ctx, cX + 24 * S, tY, cW - 48 * S, txRowH, 12 * S);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    roundRect(ctx, cX + 24 * S, tY, cW - 48 * S, txRowH, 12 * S);
    ctx.stroke();

    // Icon badge
    const iconX = cX + 38 * S;
    const iconY = tY + 6 * S;
    const iconSize = 32 * S;
    ctx.fillStyle = txColor;
    roundRect(ctx, iconX, iconY, iconSize, iconSize, 10 * S);
    ctx.fill();
    ctx.strokeStyle = txBorder;
    ctx.lineWidth = 1;
    roundRect(ctx, iconX, iconY, iconSize, iconSize, 10 * S);
    ctx.stroke();

    // + or - icon
    ctx.fillStyle = txIconColor;
    ctx.font = `800 ${16 * S}px CabinetGrotesk`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isPositive ? '+' : '-', iconX + iconSize / 2, iconY + iconSize / 2);
    ctx.textAlign = 'left';

    // Label
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${12.5 * S}px Inter`;
    ctx.textBaseline = 'top';
    ctx.fillText(txLabel, cX + 82 * S, tY + 8 * S);

    // Time
    const timeAgo = tx.created_at ? formatTimeAgo(tx.created_at) : '';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = `400 ${10 * S}px Inter`;
    ctx.fillText(timeAgo, cX + 82 * S, tY + 24 * S);

    // Amount
    ctx.fillStyle = isPositive ? '#34d399' : '#f43f5e';
    ctx.font = `700 ${13 * S}px CabinetGrotesk`;
    ctx.textAlign = 'right';
    ctx.fillText(`${isPositive ? '+' : ''}${tx.amount.toLocaleString()} CR`, cX + cW - 38 * S, tY + 12 * S);
    ctx.textAlign = 'left';

    tY += txRowH + txGap;
  }

  if (recentTx.length === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = `400 ${12 * S}px Inter`;
    ctx.fillText('No recent activity', cX + 24 * S, tY);
    tY += 30 * S;
  }

  // ===== VAULT BAR =====
  tY += 10 * S;
  const vaultMax = 1000000;
  const vaultPct = Math.min(userData.credits / vaultMax, 1);
  const vaultLabel = `${Math.round(vaultPct * 100)}% FULL`;

  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = `800 ${9 * S}px Inter`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('VAULT STORAGE LIMIT', cX + 24 * S, tY);

  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${11 * S}px CabinetGrotesk`;
  ctx.textAlign = 'right';
  ctx.fillText(vaultLabel, cX + cW - 24 * S, tY);
  ctx.textAlign = 'left';

  tY += 18 * S;
  const vaultBarW = cW - 48 * S;
  const vaultBarH = 6 * S;

  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  roundRect(ctx, cX + 24 * S, tY, vaultBarW, vaultBarH, vaultBarH / 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  roundRect(ctx, cX + 24 * S, tY, vaultBarW, vaultBarH, vaultBarH / 2);
  ctx.stroke();

  if (vaultPct > 0) {
    const fillW = Math.max(vaultBarW * vaultPct, 12 * S);
    ctx.save();
    roundRect(ctx, cX + 24 * S, tY, vaultBarW, vaultBarH, vaultBarH / 2);
    ctx.clip();
    const fillGrad = ctx.createLinearGradient(cX + 24 * S, 0, cX + 24 * S + fillW, 0);
    fillGrad.addColorStop(0, '#5b31df');
    fillGrad.addColorStop(0.3, '#9b72ff');
    fillGrad.addColorStop(0.5, '#ffffff');
    fillGrad.addColorStop(0.7, '#9b72ff');
    fillGrad.addColorStop(1, '#5b31df');
    ctx.fillStyle = fillGrad;
    ctx.fillRect(cX + 24 * S, tY, fillW, vaultBarH);
    ctx.shadowColor = 'rgba(255,255,255,0.6)';
    ctx.shadowBlur = 12 * S;
    ctx.fillStyle = 'transparent';
    ctx.fillRect(cX + 24 * S, tY, fillW, vaultBarH);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Footer
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = `900 ${10 * S}px CabinetGrotesk`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('NEXAVERSE FINANCIAL', cX + cW - 24 * S, cY + cH - 14 * S);

  ctx.restore();
  return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'wallet.png' });
}

function formatTimeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ===== BRAND BANNER =====
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

// ===== DARK ANIME BANNER (Itachi/Sharingan style) =====
async function generateDarkBanner(title = 'NEXAVERSE', subtitle = '') {
  const W = 1600;
  const H = 500;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Dark background with subtle radial
  ctx.fillStyle = '#08060c';
  ctx.fillRect(0, 0, W, H);

  // Deep red/purple ambient glow
  const g1 = ctx.createRadialGradient(W * 0.15, H * 0.5, 0, W * 0.15, H * 0.5, W * 0.4);
  g1.addColorStop(0, 'rgba(120,20,20,0.18)');
  g1.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, H);

  const g2 = ctx.createRadialGradient(W * 0.85, H * 0.4, 0, W * 0.85, H * 0.4, W * 0.35);
  g2.addColorStop(0, 'rgba(80,15,30,0.15)');
  g2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, W, H);

  // Center glow behind text
  const gCenter = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.3);
  gCenter.addColorStop(0, 'rgba(160,120,180,0.08)');
  gCenter.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gCenter;
  ctx.fillRect(0, 0, W, H);

  // Sharingan-style red circles (decorative)
  function drawSharingan(cx, cy, radius, opacity) {
    ctx.save();
    ctx.globalAlpha = opacity;
    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(200,30,30,0.7)';
    ctx.lineWidth = 3;
    ctx.stroke();
    // Inner glow
    const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    sg.addColorStop(0, 'rgba(200,30,30,0.15)');
    sg.addColorStop(0.7, 'rgba(200,30,30,0.05)');
    sg.addColorStop(1, 'rgba(200,30,30,0)');
    ctx.fillStyle = sg;
    ctx.fill();
    // Tomoe dots
    for (let i = 0; i < 3; i++) {
      const angle = (i * 120 - 90) * Math.PI / 180;
      const tx = cx + Math.cos(angle) * radius * 0.55;
      const ty = cy + Math.sin(angle) * radius * 0.55;
      ctx.beginPath();
      ctx.arc(tx, ty, radius * 0.12, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(200,20,20,0.8)';
      ctx.fill();
    }
    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(200,20,20,0.9)';
    ctx.fill();
    ctx.restore();
  }

  // Scattered sharingan symbols
  drawSharingan(W * 0.12, H * 0.3, 22, 0.3);
  drawSharingan(W * 0.22, H * 0.7, 16, 0.2);
  drawSharingan(W * 0.78, H * 0.25, 20, 0.25);
  drawSharingan(W * 0.88, H * 0.65, 18, 0.2);
  drawSharingan(W * 0.5, H * 0.15, 12, 0.15);
  drawSharingan(W * 0.6, H * 0.85, 14, 0.15);

  // Smoky/misty horizontal streaks
  ctx.save();
  ctx.globalAlpha = 0.04;
  for (let i = 0; i < 6; i++) {
    const sy = H * 0.2 + i * H * 0.12;
    const sg = ctx.createLinearGradient(0, sy, W, sy);
    sg.addColorStop(0, 'rgba(200,180,220,0)');
    sg.addColorStop(0.3, 'rgba(200,180,220,1)');
    sg.addColorStop(0.7, 'rgba(200,180,220,1)');
    sg.addColorStop(1, 'rgba(200,180,220,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, sy, W, 3);
  }
  ctx.restore();

  // Subtle dot texture
  ctx.save();
  ctx.globalAlpha = 0.025;
  for (let y = 0; y < H; y += 3) {
    for (let x = 0; x < W; x += 3) {
      if ((x + y) % 6 === 0) ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.restore();

  // ===== MAIN TEXT =====
  const fontSize = Math.floor(H * 0.38);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Text glow (red-tinted shadow)
  ctx.save();
  ctx.shadowColor = 'rgba(180,40,40,0.4)';
  ctx.shadowBlur = 60;
  ctx.fillStyle = '#e8e0f0';
  ctx.font = `900 ${fontSize}px CabinetGrotesk`;
  ctx.fillText(title, W / 2, H / 2 - (subtitle ? 15 : 0));
  ctx.restore();

  // Text again without shadow for crispness
  ctx.fillStyle = '#ddd8e8';
  ctx.font = `900 ${fontSize}px CabinetGrotesk`;
  ctx.fillText(title, W / 2, H / 2 - (subtitle ? 15 : 0));

  // Subtitle
  if (subtitle) {
    ctx.fillStyle = 'rgba(180,160,200,0.5)';
    ctx.font = '600 20px Inter';
    const spaced = subtitle.split('').join(' ');
    ctx.fillText(spaced, W / 2, H / 2 + fontSize * 0.45);
  }

  // Thin accent lines
  const lineGrad = ctx.createLinearGradient(W * 0.25, 0, W * 0.75, 0);
  lineGrad.addColorStop(0, 'rgba(200,30,30,0)');
  lineGrad.addColorStop(0.5, 'rgba(200,30,30,0.5)');
  lineGrad.addColorStop(1, 'rgba(200,30,30,0)');
  ctx.fillStyle = lineGrad;
  ctx.fillRect(W * 0.25, H * 0.18, W * 0.5, 1.5);

  const lineGrad2 = ctx.createLinearGradient(W * 0.25, 0, W * 0.75, 0);
  lineGrad2.addColorStop(0, 'rgba(160,120,200,0)');
  lineGrad2.addColorStop(0.5, 'rgba(160,120,200,0.3)');
  lineGrad2.addColorStop(1, 'rgba(160,120,200,0)');
  ctx.fillStyle = lineGrad2;
  ctx.fillRect(W * 0.25, H * 0.82, W * 0.5, 1);

  return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'banner.png' });
}

module.exports = { generateProfileCard, generateWalletCard, generateBrandBanner, generateDarkBanner, progressBar };
