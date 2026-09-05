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

async function generateProfileCard(user, userData, xpInfo, rank, repInfo, roleName) {
  // Bigger canvas for Discord display
  const W = 1200;
  const H = 740;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const S = W / 900; // scale factor from original 900-wide design

  // ===== STAGE BACKGROUND =====
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
  const bezelMargin = 36 * S;
  const bezelX = bezelMargin;
  const bezelY = bezelMargin;
  const bezelW = W - bezelMargin * 2;
  const bezelH = H - bezelMargin * 2;
  const bezelR = 48 * S;

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
  ctx.shadowBlur = 60 * S;
  ctx.strokeStyle = 'rgba(185, 155, 255, 0.22)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, bezelX, bezelY, bezelW, bezelH, bezelR);
  ctx.stroke();
  ctx.restore();

  // Top highlight on bezel
  const bezelHL = ctx.createLinearGradient(bezelX, bezelY, bezelX, bezelY + 30 * S);
  bezelHL.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
  bezelHL.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = bezelHL;
  roundRect(ctx, bezelX, bezelY, bezelW, 30 * S, bezelR);
  ctx.fill();

  // ===== CARD FACE =====
  const pad = 14 * S;
  const cardX = bezelX + pad;
  const cardY = bezelY + pad;
  const cardW = bezelW - pad * 2;
  const cardH = bezelH - pad * 2;
  const cardR = 36 * S;

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
  const cardInnerHL = ctx.createLinearGradient(cardX, cardY, cardX, cardY + 20 * S);
  cardInnerHL.addColorStop(0, 'rgba(255, 255, 255, 0.10)');
  cardInnerHL.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = cardInnerHL;
  roundRect(ctx, cardX, cardY, cardW, 20 * S, cardR);
  ctx.fill();

  // Big luminous bloom from bottom
  ctx.save();
  ctx.globalAlpha = 0.95;
  const bloomH = cardH * 0.72;
  const bloomGrad = ctx.createRadialGradient(cardX + cardW * 0.5, cardY + cardH, 0, cardX + cardW * 0.5, cardY + cardH, bloomH * 1.2);
  bloomGrad.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
  bloomGrad.addColorStop(0.22, 'rgba(215, 195, 255, 0.55)');
  bloomGrad.addColorStop(0.42, 'rgba(160, 120, 255, 0.40)');
  bloomGrad.addColorStop(0.58, 'rgba(124, 77, 255, 0.22)');
  bloomGrad.addColorStop(0.78, 'rgba(124, 77, 255, 0)');
  ctx.fillStyle = bloomGrad;
  ctx.fillRect(cardX - cardW * 0.12, cardY + cardH * 0.28, cardW * 1.24, bloomH);
  ctx.restore();

  // Clip card to rounded rect
  ctx.save();
  roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
  ctx.clip();

  // ===== HEADER: Avatar + Info =====
  const avatarCX = cardX + 120 * S;
  const avatarCY = cardY + 120 * S;
  const avatarR = 82 * S;

  // Avatar halo glow
  ctx.save();
  const haloGrad = ctx.createRadialGradient(avatarCX, avatarCY, avatarR * 0.5, avatarCX, avatarCY, avatarR + 28 * S);
  haloGrad.addColorStop(0, 'rgba(145, 95, 255, 0.60)');
  haloGrad.addColorStop(0.7, 'rgba(145, 95, 255, 0)');
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(avatarCX, avatarCY, avatarR + 28 * S, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Avatar conic ring
  ctx.save();
  const ringOuter = avatarR + 6 * S;
  const ringInner = avatarR + 3 * S;
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
  ctx.strokeStyle = 'rgba(185, 155, 255, 0.6)';
  ctx.lineWidth = 2.5 * S;
  ctx.stroke();
  ctx.restore();

  // Avatar glow shadow
  ctx.save();
  ctx.shadowColor = 'rgba(124, 77, 255, 0.7)';
  ctx.shadowBlur = 45 * S;
  ctx.beginPath();
  ctx.arc(avatarCX, avatarCY, avatarR, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(185, 155, 255, 0.6)';
  ctx.lineWidth = 2.5 * S;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();

  // Avatar image
  try {
    const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 512 });
    const buffer = await downloadImage(avatarUrl);
    const avatarImg = await loadImage(buffer);
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCX, avatarCY, avatarR, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatarImg, avatarCX - avatarR, avatarCY - avatarR, avatarR * 2, avatarR * 2);
    // Top sheen
    const sheen = ctx.createRadialGradient(avatarCX - avatarR * 0.3, avatarCY - avatarR * 0.4, 0, avatarCX, avatarCY, avatarR);
    sheen.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
    sheen.addColorStop(0.55, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(avatarCX - avatarR, avatarCY - avatarR, avatarR * 2, avatarR * 2);
    ctx.restore();
  } catch (e) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCX, avatarCY, avatarR, 0, Math.PI * 2);
    ctx.clip();
    const fbGrad = ctx.createLinearGradient(avatarCX - avatarR, avatarCY - avatarR, avatarCX + avatarR, avatarCY + avatarR);
    fbGrad.addColorStop(0, '#322063');
    fbGrad.addColorStop(1, '#160e36');
    ctx.fillStyle = fbGrad;
    ctx.fillRect(avatarCX - avatarR, avatarCY - avatarR, avatarR * 2, avatarR * 2);
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${68 * S}px Sora`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(user.username.charAt(0).toUpperCase(), avatarCX, avatarCY + 2 * S);
    ctx.restore();
  }

  // ===== RIGHT SIDE: Brand + Username + Badges =====
  const infoX = cardX + 240 * S;
  let infoY = cardY + 36 * S;

  // Brand "NEXAVERSE" with line
  ctx.fillStyle = '#b49aff';
  ctx.globalAlpha = 0.85;
  ctx.font = `700 ${16 * S}px Inter`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('NEXAVERSE', infoX, infoY);

  // Brand line
  const brandLineX = infoX + ctx.measureText('NEXAVERSE').width + 14 * S;
  const brandLineGrad = ctx.createLinearGradient(brandLineX, 0, brandLineX + 160 * S, 0);
  brandLineGrad.addColorStop(0, 'rgba(180, 148, 255, 0.55)');
  brandLineGrad.addColorStop(1, 'rgba(180, 148, 255, 0)');
  ctx.strokeStyle = brandLineGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(brandLineX, infoY + 10 * S);
  ctx.lineTo(brandLineX + 160 * S, infoY + 10 * S);
  ctx.stroke();
  ctx.globalAlpha = 1;

  infoY += 32 * S;

  // Username (Sora, large, white with gradient)
  const displayName = user.username.length > 14 ? user.username.substring(0, 12) + '..' : user.username;
  ctx.font = `800 ${52 * S}px Sora`;
  const nameGrad = ctx.createLinearGradient(infoX, infoY, infoX, infoY + 52 * S);
  nameGrad.addColorStop(0.55, '#ffffff');
  nameGrad.addColorStop(1, '#d9caff');
  ctx.fillStyle = nameGrad;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Name glow
  ctx.save();
  ctx.shadowColor = 'rgba(150, 110, 255, 0.5)';
  ctx.shadowBlur = 30 * S;
  ctx.fillText(displayName, infoX, infoY);
  ctx.restore();
  ctx.fillText(displayName, infoX, infoY);

  infoY += 62 * S;

  // Role badge (pill)
  ctx.font = `600 ${16 * S}px Inter`;
  const roleText = roleName;
  const roleTW = ctx.measureText(roleText).width;
  const pillH = 38 * S;
  const pillPadX = 22 * S;

  const rolePillW = roleTW + pillPadX * 2;
  const rolePillGrad = ctx.createLinearGradient(infoX, infoY, infoX, infoY + pillH);
  rolePillGrad.addColorStop(0, 'rgba(140, 90, 255, 0.34)');
  rolePillGrad.addColorStop(1, 'rgba(110, 60, 220, 0.18)');
  ctx.fillStyle = rolePillGrad;
  roundRect(ctx, infoX, infoY, rolePillW, pillH, pillH / 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(190, 160, 255, 0.42)';
  ctx.lineWidth = 1;
  roundRect(ctx, infoX, infoY, rolePillW, pillH, pillH / 2);
  ctx.stroke();

  // Role pill inner highlight
  const pillHL = ctx.createLinearGradient(infoX, infoY, infoX, infoY + 10 * S);
  pillHL.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
  pillHL.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = pillHL;
  roundRect(ctx, infoX, infoY, rolePillW, 10 * S, pillH / 2);
  ctx.fill();

  ctx.fillStyle = '#e2d7ff';
  ctx.font = `600 ${16 * S}px Inter`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(roleText, infoX + rolePillW / 2, infoY + pillH / 2);

  // Rank pill (dim)
  const rankText = rank.name;
  const rankTW = ctx.measureText(rankText).width;
  const rankPillW = rankTW + pillPadX * 2;
  const rankPillX = infoX + rolePillW + 12 * S;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  roundRect(ctx, rankPillX, infoY, rankPillW, pillH, pillH / 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  roundRect(ctx, rankPillX, infoY, rankPillW, pillH, pillH / 2);
  ctx.stroke();

  ctx.fillStyle = '#c2b2ec';
  ctx.font = `600 ${16 * S}px Inter`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(rankText, rankPillX + rankPillW / 2, infoY + pillH / 2);

  infoY += pillH + 24 * S;

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
  const scGap = 16 * S;
  const scPaddingX = 48 * S;
  const scTotalW = cardW - scPaddingX * 2;
  const scW = (scTotalW - scGap * (colCount - 1)) / colCount;
  const scH = 82 * S;

  for (let i = 0; i < stats.length; i++) {
    const col = i % colCount;
    const row = Math.floor(i / colCount);
    const sx = cardX + scPaddingX + col * (scW + scGap);
    const sy = infoY + row * (scH + scGap);

    // Stat card background
    const scBg = ctx.createLinearGradient(sx, sy, sx + scW * 0.15, sy + scH);
    scBg.addColorStop(0, 'rgba(255, 255, 255, 0.10)');
    scBg.addColorStop(1, 'rgba(255, 255, 255, 0.03)');
    ctx.fillStyle = scBg;
    roundRect(ctx, sx, sy, scW, scH, 22 * S);
    ctx.fill();

    // Stat card border
    ctx.strokeStyle = 'rgba(185, 155, 255, 0.22)';
    ctx.lineWidth = 1;
    roundRect(ctx, sx, sy, scW, scH, 22 * S);
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
    roundRect(ctx, sx, sy, scW, scH, 22 * S);
    ctx.fill();

    // Inner shadow at top
    const innerShadow = ctx.createLinearGradient(sx, sy, sx, sy + 12 * S);
    innerShadow.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
    innerShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = innerShadow;
    roundRect(ctx, sx, sy, scW, 12 * S, 22 * S);
    ctx.fill();

    // Label with dot
    const dotX = sx + 20 * S;
    const dotY = sy + 20 * S;

    // Dot
    ctx.beginPath();
    ctx.arc(dotX, dotY, 3 * S, 0, Math.PI * 2);
    ctx.fillStyle = '#b48cff';
    ctx.fill();
    ctx.save();
    ctx.shadowColor = 'rgba(180, 140, 255, 0.9)';
    ctx.shadowBlur = 10 * S;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 3 * S, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#b3a1e6';
    ctx.font = `700 ${13 * S}px Inter`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(stats[i].label.toUpperCase(), dotX + 12 * S, dotY - 6 * S);

    // Value
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${28 * S}px Sora`;
    ctx.save();
    ctx.shadowColor = 'rgba(160, 120, 255, 0.35)';
    ctx.shadowBlur = 22 * S;
    ctx.fillText(stats[i].value, sx + 20 * S, sy + 42 * S);
    ctx.restore();
    ctx.fillText(stats[i].value, sx + 20 * S, sy + 42 * S);
  }

  infoY += scH * 2 + scGap + 24 * S;

  // ===== XP PROGRESS BAR =====
  const barX = cardX + scPaddingX;
  const barW = cardW - scPaddingX * 2;
  const barH = 18 * S;
  const progress = xpInfo.xpNeeded > 0 ? Math.min(xpInfo.xp / xpInfo.xpNeeded, 1) : 0;

  // XP label row
  ctx.fillStyle = '#b3a1e6';
  ctx.font = `700 ${14 * S}px Inter`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('EXPERIENCE', barX, infoY);

  // XP value on right
  ctx.fillStyle = '#f2ecff';
  ctx.font = `700 ${17 * S}px Sora`;
  ctx.save();
  ctx.shadowColor = 'rgba(170, 130, 255, 0.5)';
  ctx.shadowBlur = 16 * S;
  ctx.textAlign = 'right';
  ctx.fillText(`XP ${xpInfo.xp} / ${xpInfo.xpNeeded}`, barX + barW, infoY);
  ctx.restore();
  ctx.textAlign = 'right';
  ctx.fillText(`XP ${xpInfo.xp} / ${xpInfo.xpNeeded}`, barX + barW, infoY);

  infoY += 28 * S;

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
  const trackShadow = ctx.createLinearGradient(barX, infoY, barX, infoY + 10 * S);
  trackShadow.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
  trackShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = trackShadow;
  roundRect(ctx, barX, infoY, barW, 10 * S, barH / 2);
  ctx.fill();
  ctx.restore();

  // Fill bar
  if (progress > 0) {
    const fillW = Math.max(barW * progress, 24 * S);

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

    // Glow
    ctx.shadowColor = 'rgba(150, 100, 255, 0.9)';
    ctx.shadowBlur = 26 * S;
    ctx.fillStyle = 'transparent';
    ctx.fillRect(barX, infoY, fillW, barH);
    ctx.shadowBlur = 0;

    // Diagonal stripe texture
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    for (let sx2 = barX - 20; sx2 < barX + fillW + 20; sx2 += 22 * S) {
      ctx.beginPath();
      ctx.moveTo(sx2, infoY + barH);
      ctx.lineTo(sx2 + 10 * S, infoY);
      ctx.lineTo(sx2 + 12 * S, infoY);
      ctx.lineTo(sx2 + 22 * S, infoY + barH);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  // ===== FOOTER =====
  ctx.fillStyle = 'rgba(200, 175, 255, 0.38)';
  ctx.font = `700 ${13 * S}px Inter`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('NEXAVERSE', cardX + cardW - 30 * S, cardY + cardH - 18 * S);

  ctx.restore(); // Unclip card

  return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'profile.png' });
}

// ===== BRAND BANNER (Aether-style) =====
async function generateBrandBanner(text = 'NEXAVERSE', subtitle = 'COMPLETE DISCORD ECOSYSTEM') {
  const W = 1600;
  const H = 500;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Deep dark background with subtle purple tint at edges
  const bg = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, W * 0.7);
  bg.addColorStop(0, '#100a20');
  bg.addColorStop(0.6, '#0a0616');
  bg.addColorStop(1, '#050308');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle corner glow bottom-right
  const corner = ctx.createRadialGradient(W * 0.92, H * 0.95, 0, W * 0.92, H * 0.95, H * 0.9);
  corner.addColorStop(0, 'rgba(124, 77, 255, 0.22)');
  corner.addColorStop(1, 'rgba(124, 77, 255, 0)');
  ctx.fillStyle = corner;
  ctx.fillRect(0, 0, W, H);

  // Fine grain texture
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let y = 0; y < H; y += 4) {
    for (let x = 0; x < W; x += 4) {
      if ((x + y) % 8 === 0) ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.globalAlpha = 1;

  // Title text — large, wide-tracked, white with slight glow
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.save();
  ctx.shadowColor = 'rgba(160, 120, 255, 0.35)';
  ctx.shadowBlur = 40;
  ctx.fillStyle = '#f2f0f7';
  ctx.font = `800 ${Math.floor(H * 0.34)}px Sora`;
  ctx.fillText(text, W / 2, H / 2 - (subtitle ? 18 : 0));
  ctx.restore();

  // Letter-spaced subtitle underneath
  if (subtitle) {
    const chars = subtitle.split('').join(' ');
    ctx.fillStyle = 'rgba(190, 170, 235, 0.55)';
    ctx.font = `700 ${22}px Inter`;
    ctx.fillText(chars, W / 2, H / 2 + H * 0.22);
  }

  // Thin accent line above title
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
