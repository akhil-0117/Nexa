const { GlobalFonts, createCanvas, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');
const https = require('https');
const http = require('http');
const path = require('path');

// Register fonts
const interPath = path.join(__dirname, '..', '..', 'fonts', 'Inter.ttf');
const soraPath = path.join(__dirname, '..', '..', 'fonts', 'Sora.ttf');
try { GlobalFonts.registerFromPath(interPath, 'Inter'); } catch (e) {}
try { GlobalFonts.registerFromPath(soraPath, 'Sora'); } catch (e) {}

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

function clipCircle(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
}

async function generateProfileCard(user, userData, xpInfo, rank, repInfo, roleName) {
  const W = 900;
  const H = 560;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // ===== STAGE BACKGROUND =====
  // Base dark gradient
  const baseBg = ctx.createRadialGradient(W * 0.5, H * 0.5, 10, W * 0.5, H * 0.5, W * 0.7);
  baseBg.addColorStop(0, '#1c1040');
  baseBg.addColorStop(0.55, '#0d0724');
  baseBg.addColorStop(1, '#050410');
  ctx.fillStyle = baseBg;
  ctx.fillRect(0, 0, W, H);

  // Bottom-left purple nebula
  const nebula1 = ctx.createRadialGradient(0, H, 0, 0, H, H * 0.95);
  nebula1.addColorStop(0, 'rgba(160, 115, 255, 0.60)');
  nebula1.addColorStop(0.4, 'rgba(95, 50, 195, 0.22)');
  nebula1.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = nebula1;
  ctx.fillRect(0, 0, W, H);

  // Top-right purple nebula
  const nebula2 = ctx.createRadialGradient(W, 0, 0, W, 0, W * 0.85);
  nebula2.addColorStop(0, 'rgba(128, 72, 255, 0.48)');
  nebula2.addColorStop(0.46, 'rgba(62, 26, 145, 0.18)');
  nebula2.addColorStop(0.74, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = nebula2;
  ctx.fillRect(0, 0, W, H);

  // Bottom-right soft bloom
  const nebula3 = ctx.createRadialGradient(W * 0.7, H * 1.08, 0, W * 0.7, H * 1.08, H * 0.45);
  nebula3.addColorStop(0, 'rgba(230, 215, 255, 0.28)');
  nebula3.addColorStop(0.45, 'rgba(150, 110, 255, 0.12)');
  nebula3.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = nebula3;
  ctx.fillRect(0, 0, W, H);

  // ===== BEZEL =====
  const bezelX = 28;
  const bezelY = 28;
  const bezelW = W - 56;
  const bezelH = H - 56;
  const bezelR = 48;

  // Bezel gradient background
  const bezelGrad = ctx.createLinearGradient(bezelX, bezelY, bezelX + bezelW * 0.42, bezelY + bezelH);
  bezelGrad.addColorStop(0, '#352a55');
  bezelGrad.addColorStop(0.42, '#141028');
  bezelGrad.addColorStop(1, '#090614');
  ctx.fillStyle = bezelGrad;
  roundRect(ctx, bezelX, bezelY, bezelW, bezelH, bezelR);
  ctx.fill();

  // Bezel outer glow
  ctx.save();
  ctx.shadowColor = 'rgba(110, 60, 230, 0.85)';
  ctx.shadowBlur = 50;
  ctx.strokeStyle = 'rgba(185, 155, 255, 0.22)';
  ctx.lineWidth = 1;
  roundRect(ctx, bezelX, bezelY, bezelW, bezelH, bezelR);
  ctx.stroke();
  ctx.restore();

  // Top highlight on bezel
  const bezelHighlight = ctx.createLinearGradient(bezelX, bezelY, bezelX, bezelY + 30);
  bezelHighlight.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
  bezelHighlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = bezelHighlight;
  roundRect(ctx, bezelX, bezelY, bezelW, 30, bezelR);
  ctx.fill();

  // ===== CARD FACE =====
  const pad = 13;
  const cardX = bezelX + pad;
  const cardY = bezelY + pad;
  const cardW = bezelW - pad * 2;
  const cardH = bezelH - pad * 2;
  const cardR = 36;

  // Card background
  const cardBg = ctx.createLinearGradient(cardX, cardY, cardX + cardW * 0.17, cardY + cardH);
  cardBg.addColorStop(0, '#171033');
  cardBg.addColorStop(0.46, '#0e0a22');
  cardBg.addColorStop(1, '#090618');
  ctx.fillStyle = cardBg;
  roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
  ctx.fill();

  // Card top radial glow
  const cardTopGlow = ctx.createRadialGradient(cardX + cardW * 0.5, cardY, 0, cardX + cardW * 0.5, cardY, cardH * 0.7);
  cardTopGlow.addColorStop(0, 'rgba(124, 77, 255, 0.16)');
  cardTopGlow.addColorStop(0.55, 'rgba(124, 77, 255, 0)');
  ctx.fillStyle = cardTopGlow;
  roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
  ctx.fill();

  // Card top inner highlight
  const cardInnerHL = ctx.createLinearGradient(cardX, cardY, cardX, cardY + 20);
  cardInnerHL.addColorStop(0, 'rgba(255, 255, 255, 0.10)');
  cardInnerHL.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = cardInnerHL;
  roundRect(ctx, cardX, cardY, cardW, 20, cardR);
  ctx.fill();

  // Big luminous bloom from bottom (the HTML card::before)
  ctx.save();
  ctx.globalAlpha = 0.95;
  const bloomY = cardY + cardH * 0.28;
  const bloomH = cardH * 0.72;
  const bloomGrad = ctx.createRadialGradient(cardX + cardW * 0.5, cardY + cardH, 0, cardX + cardW * 0.5, cardY + cardH, bloomH * 1.2);
  bloomGrad.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
  bloomGrad.addColorStop(0.22, 'rgba(215, 195, 255, 0.55)');
  bloomGrad.addColorStop(0.42, 'rgba(160, 120, 255, 0.40)');
  bloomGrad.addColorStop(0.58, 'rgba(124, 77, 255, 0.22)');
  bloomGrad.addColorStop(0.78, 'rgba(124, 77, 255, 0)');
  ctx.fillStyle = bloomGrad;
  ctx.fillRect(cardX - cardW * 0.12, bloomY, cardW * 1.24, bloomH);
  ctx.restore();

  // Clip card to rounded rect
  ctx.save();
  roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
  ctx.clip();

  // ===== HEADER: Avatar + Info =====
  const avatarCX = cardX + 95;
  const avatarCY = cardY + 95;
  const avatarR = 63;

  // Avatar halo glow
  ctx.save();
  const haloGrad = ctx.createRadialGradient(avatarCX, avatarCY, avatarR * 0.5, avatarCX, avatarCY, avatarR + 20);
  haloGrad.addColorStop(0, 'rgba(145, 95, 255, 0.60)');
  haloGrad.addColorStop(0.7, 'rgba(145, 95, 255, 0)');
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(avatarCX, avatarCY, avatarR + 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Avatar conic ring (simplified as gradient ring)
  ctx.save();
  const ringOuter = avatarR + 5;
  const ringInner = avatarR + 2;
  const conicGrad = ctx.createLinearGradient(avatarCX - ringOuter, avatarCY - ringOuter, avatarCX + ringOuter, avatarCY + ringOuter);
  conicGrad.addColorStop(0, 'rgba(216, 195, 255, 0.9)');
  conicGrad.addColorStop(0.12, 'rgba(124, 77, 255, 0.15)');
  conicGrad.addColorStop(0.3, 'rgba(124, 77, 255, 0)');
  conicGrad.addColorStop(0.6, 'rgba(180, 145, 255, 0.65)');
  conicGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.beginPath();
  ctx.arc(avatarCX, avatarCY, ringOuter, 0, Math.PI * 2);
  ctx.arc(avatarCX, avatarCY, ringInner, 0, Math.PI * 2, true);
  ctx.fillStyle = conicGrad;
  ctx.fill();
  ctx.restore();

  // Avatar background
  ctx.save();
  const avatarBg = ctx.createLinearGradient(avatarCX - avatarR, avatarCY - avatarR, avatarCX + avatarR, avatarCY + avatarR);
  avatarBg.addColorStop(0, '#322063');
  avatarBg.addColorStop(1, '#160e36');
  ctx.beginPath();
  ctx.arc(avatarCX, avatarCY, avatarR, 0, Math.PI * 2);
  ctx.fillStyle = avatarBg;
  ctx.fill();

  // Avatar border
  ctx.strokeStyle = 'rgba(185, 155, 255, 0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Avatar glow shadow
  ctx.shadowColor = 'rgba(124, 77, 255, 0.7)';
  ctx.shadowBlur = 38;
  ctx.beginPath();
  ctx.arc(avatarCX, avatarCY, avatarR, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(185, 155, 255, 0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();

  // Avatar image
  try {
    const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 512 });
    const buffer = await downloadImage(avatarUrl);
    const avatarImg = await loadImage(buffer);
    ctx.save();
    clipCircle(ctx, avatarCX, avatarCY, avatarR);
    ctx.drawImage(avatarImg, avatarCX - avatarR, avatarCY - avatarR, avatarR * 2, avatarR * 2);
    // Top sheen on avatar
    const sheen = ctx.createRadialGradient(avatarCX - avatarR * 0.3, avatarCY - avatarR * 0.4, 0, avatarCX, avatarCY, avatarR);
    sheen.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
    sheen.addColorStop(0.55, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(avatarCX - avatarR, avatarCY - avatarR, avatarR * 2, avatarR * 2);
    ctx.restore();
  } catch (e) {
    // Fallback
    ctx.save();
    clipCircle(ctx, avatarCX, avatarCY, avatarR);
    const fbGrad = ctx.createLinearGradient(avatarCX - avatarR, avatarCY - avatarR, avatarCX + avatarR, avatarCY + avatarR);
    fbGrad.addColorStop(0, '#322063');
    fbGrad.addColorStop(1, '#160e36');
    ctx.fillStyle = fbGrad;
    ctx.fillRect(avatarCX - avatarR, avatarCY - avatarR, avatarR * 2, avatarR * 2);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 52px Sora';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(user.username.charAt(0).toUpperCase(), avatarCX, avatarCY + 2);
    ctx.restore();
  }

  // ===== RIGHT SIDE: Brand + Username + Badges =====
  const infoX = cardX + 185;
  let infoY = cardY + 28;

  // Brand "NEXAVERSE" with line
  ctx.fillStyle = '#b49aff';
  ctx.globalAlpha = 0.85;
  ctx.font = '700 12px Inter';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('NEXAVERSE', infoX, infoY + 2);

  // Brand line
  const brandLineX = infoX + ctx.measureText('NEXAVERSE').width + 10;
  const brandLineGrad = ctx.createLinearGradient(brandLineX, 0, brandLineX + 120, 0);
  brandLineGrad.addColorStop(0, 'rgba(180, 148, 255, 0.55)');
  brandLineGrad.addColorStop(1, 'rgba(180, 148, 255, 0)');
  ctx.strokeStyle = brandLineGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(brandLineX, infoY + 8);
  ctx.lineTo(brandLineX + 120, infoY + 8);
  ctx.stroke();
  ctx.globalAlpha = 1;

  infoY += 24;

  // Username (Sora, large, white with subtle gradient)
  const displayName = user.username.length > 14 ? user.username.substring(0, 12) + '..' : user.username;
  ctx.font = '800 40px Sora';
  const nameGrad = ctx.createLinearGradient(infoX, infoY, infoX, infoY + 40);
  nameGrad.addColorStop(0.55, '#ffffff');
  nameGrad.addColorStop(1, '#d9caff');
  ctx.fillStyle = nameGrad;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Name glow
  ctx.save();
  ctx.shadowColor = 'rgba(150, 110, 255, 0.5)';
  ctx.shadowBlur = 24;
  ctx.fillText(displayName, infoX, infoY);
  ctx.restore();
  // Name text
  ctx.fillText(displayName, infoX, infoY);

  infoY += 50;

  // Role badge (pill)
  ctx.font = '600 12.5px Inter';
  const roleText = roleName;
  const roleTW = ctx.measureText(roleText).width;
  const pillH = 32;
  const pillPadX = 17;

  // Role pill
  const rolePillW = roleTW + pillPadX * 2;
  const rolePillGrad = ctx.createLinearGradient(infoX, infoY, infoX, infoY + pillH);
  rolePillGrad.addColorStop(0, 'rgba(140, 90, 255, 0.34)');
  rolePillGrad.addColorStop(1, 'rgba(110, 60, 220, 0.18)');
  ctx.fillStyle = rolePillGrad;
  roundRect(ctx, infoX, infoY, rolePillW, pillH, pillH / 2);
  ctx.fill();

  // Role pill border
  ctx.strokeStyle = 'rgba(190, 160, 255, 0.42)';
  ctx.lineWidth = 1;
  roundRect(ctx, infoX, infoY, rolePillW, pillH, pillH / 2);
  ctx.stroke();

  // Role pill inner highlight
  const pillHL = ctx.createLinearGradient(infoX, infoY, infoX, infoY + 8);
  pillHL.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
  pillHL.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = pillHL;
  roundRect(ctx, infoX, infoY, rolePillW, 8, pillH / 2);
  ctx.fill();

  // Role pill glow
  ctx.save();
  ctx.shadowColor = 'rgba(124, 77, 255, 0.5)';
  ctx.shadowBlur = 16;
  ctx.fillStyle = 'transparent';
  roundRect(ctx, infoX, infoY, rolePillW, pillH, pillH / 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#e2d7ff';
  ctx.font = '600 12.5px Inter';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(roleText, infoX + rolePillW / 2, infoY + pillH / 2);

  // Rank pill (dim)
  const rankText = rank.name;
  const rankTW = ctx.measureText(rankText).width;
  const rankPillW = rankTW + pillPadX * 2;
  const rankPillX = infoX + rolePillW + 10;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  roundRect(ctx, rankPillX, infoY, rankPillW, pillH, pillH / 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  roundRect(ctx, rankPillX, infoY, rankPillW, pillH, pillH / 2);
  ctx.stroke();

  ctx.fillStyle = '#c2b2ec';
  ctx.font = '600 12.5px Inter';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(rankText, rankPillX + rankPillW / 2, infoY + pillH / 2);

  infoY += pillH + 18;

  // ===== STAT CARDS =====
  const stats = [
    { label: 'Level', value: `${xpInfo.level}` },
    { label: 'Rank', value: rank.name },
    { label: 'Credits', value: userData.credits.toLocaleString() },
    { label: 'Reputation', value: `${repInfo.score}/100` },
    { label: 'Messages', value: userData.messages.toLocaleString() },
    { label: 'Games', value: `${userData.games_won}W` },
  ];

  const colCount = 3;
  const scGap = 14;
  const scTotalW = cardW - 38 * 2;
  const scW = (scTotalW - scGap * (colCount - 1)) / colCount;
  const scH = 65;
  const scPaddingX = 18;

  for (let i = 0; i < stats.length; i++) {
    const col = i % colCount;
    const row = Math.floor(i / colCount);
    const sx = cardX + 38 + col * (scW + scGap);
    const sy = infoY + row * (scH + scGap);

    // Stat card background
    const scBg = ctx.createLinearGradient(sx, sy, sx + scW * 0.15, sy + scH);
    scBg.addColorStop(0, 'rgba(255, 255, 255, 0.10)');
    scBg.addColorStop(1, 'rgba(255, 255, 255, 0.03)');
    ctx.fillStyle = scBg;
    roundRect(ctx, sx, sy, scW, scH, 20);
    ctx.fill();

    // Stat card border
    ctx.strokeStyle = 'rgba(185, 155, 255, 0.22)';
    ctx.lineWidth = 1;
    roundRect(ctx, sx, sy, scW, scH, 20);
    ctx.stroke();

    // Top sheen
    const sheenGrad = ctx.createLinearGradient(sx + scW * 0.1, sy, sx + scW * 0.9, sy);
    sheenGrad.addColorStop(0, 'rgba(230, 215, 255, 0)');
    sheenGrad.addColorStop(0.5, 'rgba(230, 215, 255, 0.8)');
    sheenGrad.addColorStop(1, 'rgba(230, 215, 255, 0)');
    ctx.strokeStyle = sheenGrad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx + scW * 0.1, sy + 1);
    ctx.lineTo(sx + scW * 0.9, sy + 1);
    ctx.stroke();

    // Under-glow
    const underGlow = ctx.createRadialGradient(sx + scW / 2, sy + scH + scH * 0.75, 0, sx + scW / 2, sy + scH + scH * 0.75, scH * 1.15);
    underGlow.addColorStop(0, 'rgba(200, 175, 255, 0.6)');
    underGlow.addColorStop(0.55, 'rgba(124, 77, 255, 0.15)');
    underGlow.addColorStop(0.75, 'rgba(124, 77, 255, 0)');
    ctx.fillStyle = underGlow;
    roundRect(ctx, sx, sy, scW, scH, 20);
    ctx.fill();

    // Inner shadow at top
    const innerShadow = ctx.createLinearGradient(sx, sy, sx, sy + 10);
    innerShadow.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
    innerShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = innerShadow;
    roundRect(ctx, sx, sy, scW, 10, 20);
    ctx.fill();

    // Label with dot
    ctx.fillStyle = '#b3a1e6';
    ctx.font = '700 10.5px Inter';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Dot
    const dotX = sx + scPaddingX;
    const dotY = sy + 16;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#b48cff';
    ctx.fill();
    ctx.save();
    ctx.shadowColor = 'rgba(180, 140, 255, 0.9)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#b3a1e6';
    ctx.fillText(stats[i].label.toUpperCase(), dotX + 9, dotY - 5);

    // Value
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 22px Sora';
    ctx.save();
    ctx.shadowColor = 'rgba(160, 120, 255, 0.35)';
    ctx.shadowBlur = 18;
    ctx.fillText(stats[i].value, sx + scPaddingX, sy + 34);
    ctx.restore();
    ctx.fillText(stats[i].value, sx + scPaddingX, sy + 34);
  }

  infoY += scH * 2 + scGap + 18;

  // ===== XP PROGRESS BAR =====
  const barX = cardX + 38;
  const barW = cardW - 76;
  const barH = 15;
  const progress = xpInfo.xpNeeded > 0 ? Math.min(xpInfo.xp / xpInfo.xpNeeded, 1) : 0;

  // XP label row
  ctx.fillStyle = '#b3a1e6';
  ctx.font = '700 11px Inter';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('EXPERIENCE', barX, infoY);

  // XP value on right
  ctx.fillStyle = '#f2ecff';
  ctx.font = '700 14px Sora';
  ctx.save();
  ctx.shadowColor = 'rgba(170, 130, 255, 0.5)';
  ctx.shadowBlur = 14;
  ctx.textAlign = 'right';
  ctx.fillText(`XP ${xpInfo.xp} / ${xpInfo.xpNeeded}`, barX + barW, infoY);
  ctx.restore();
  ctx.textAlign = 'right';
  ctx.fillText(`XP ${xpInfo.xp} / ${xpInfo.xpNeeded}`, barX + barW, infoY);

  infoY += 22;

  // Track background
  ctx.save();
  ctx.fillStyle = 'rgba(10, 6, 24, 0.75)';
  roundRect(ctx, barX, infoY, barW, barH, barH / 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(185, 155, 255, 0.24)';
  ctx.lineWidth = 1;
  roundRect(ctx, barX, infoY, barW, barH, barH / 2);
  ctx.stroke();

  // Inner shadow
  const trackShadow = ctx.createLinearGradient(barX, infoY, barX, infoY + 8);
  trackShadow.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
  trackShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = trackShadow;
  roundRect(ctx, barX, infoY, barW, 8, barH / 2);
  ctx.fill();
  ctx.restore();

  // Fill bar
  if (progress > 0) {
    const fillW = Math.max(barW * progress, 20);

    // Clip to track shape
    ctx.save();
    roundRect(ctx, barX, infoY, barW, barH, barH / 2);
    ctx.clip();

    // Gradient fill
    const fillGrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
    fillGrad.addColorStop(0, '#5f32f5');
    fillGrad.addColorStop(0.55, '#8f5cff');
    fillGrad.addColorStop(0.85, '#c9b3ff');
    fillGrad.addColorStop(1, '#ffffff');
    ctx.fillStyle = fillGrad;
    ctx.fillRect(barX, infoY, fillW, barH);

    // Glow on fill
    ctx.shadowColor = 'rgba(150, 100, 255, 0.9)';
    ctx.shadowBlur = 22;
    ctx.fillStyle = 'transparent';
    ctx.fillRect(barX, infoY, fillW, barH);
    ctx.shadowBlur = 0;

    // Diagonal stripe texture
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    for (let sx = barX - 20; sx < barX + fillW + 20; sx += 18) {
      ctx.beginPath();
      ctx.moveTo(sx, infoY + barH);
      ctx.lineTo(sx + 8, infoY);
      ctx.lineTo(sx + 10, infoY);
      ctx.lineTo(sx + 18, infoY + barH);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  // ===== FOOTER =====
  ctx.fillStyle = 'rgba(200, 175, 255, 0.38)';
  ctx.font = '700 10px Inter';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('NEXAVERSE', cardX + cardW - 24, cardY + cardH - 15);

  ctx.restore(); // Unclip card

  return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'profile.png' });
}

function progressBar(current, max, length = 20) {
  const filled = max > 0 ? Math.round((current / max) * length) : 0;
  const empty = length - filled;
  return '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
}

module.exports = { generateProfileCard, progressBar };
