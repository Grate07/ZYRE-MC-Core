const { createCanvas, loadImage } = require('canvas');
const { config, resolveConfigPath } = require('./config');
const { requiredXpForLevel } = require('../database');

const COLORS = {
  onyx: '#0F0F0F',
  charcoal: '#1A1A1A',
  card: '#1E1E1E',
  purple: '#8B5CF6',
  purpleDark: '#32134A',
  blue: '#31B9F1',
  white: '#F8F7FB',
  muted: '#A8A3B2',
  gold: '#FFD700',
  silver: '#C5CBD3',
  bronze: '#C98855',
};

let cachedLogo;

async function getLogo() {
  if (!cachedLogo) cachedLogo = loadImage(resolveConfigPath(config.assets.logo));
  return cachedLogo;
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function fitText(ctx, value, maxWidth, startSize, weight = 'bold') {
  let size = startSize;
  do {
    ctx.font = `${weight} ${size}px sans-serif`;
    if (ctx.measureText(value).width <= maxWidth || size <= 14) break;
    size -= 1;
  } while (size > 14);
  return size;
}

async function safeLoadImage(url) {
  try {
    return await loadImage(url);
  } catch (error) {
    console.warn('Could not load a Discord avatar for an image:', error.message);
    return null;
  }
}

async function drawLogo(ctx, x, y, size) {
  const logo = await getLogo();
  ctx.save();
  ctx.shadowColor = 'rgba(139, 92, 246, 0.55)';
  ctx.shadowBlur = 18;
  ctx.drawImage(logo, x, y, size, size);
  ctx.restore();
}

function drawGlow(ctx, x, y, radius, color) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

async function generateWelcomeBanner() {
  const width = 1024;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#080710');
  background.addColorStop(0.48, '#150D20');
  background.addColorStop(1, '#07121A');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  drawGlow(ctx, 210, 190, 330, 'rgba(139, 92, 246, 0.40)');
  drawGlow(ctx, 835, 195, 330, 'rgba(49, 185, 241, 0.29)');

  // A subtle block grid supports the Minecraft theme without competing with the logo.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.045)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const logo = await getLogo();
  const logoSize = height - 8;
  const logoCanvas = createCanvas(logo.width, logo.height);
  const logoContext = logoCanvas.getContext('2d');
  logoContext.drawImage(logo, 0, 0);
  const logoPixels = logoContext.getImageData(0, 0, logo.width, logo.height);
  for (let index = 0; index < logoPixels.data.length; index += 4) {
    const luminance =
      logoPixels.data[index] * 0.2126 +
      logoPixels.data[index + 1] * 0.7152 +
      logoPixels.data[index + 2] * 0.0722;
    const opacity = Math.max(0, Math.min(1, (luminance - 12) / 28));
    logoPixels.data[index + 3] = Math.round(logoPixels.data[index + 3] * opacity);
  }
  logoContext.putImageData(logoPixels, 0, 0);

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowColor = 'rgba(139, 92, 246, 0.55)';
  ctx.shadowBlur = 30;
  ctx.drawImage(logoCanvas, (width - logoSize) / 2, 4, logoSize, logoSize);
  ctx.restore();

  return canvas.toBuffer('image/png');
}

async function generateRankCard({ user, username, record, rank }) {
  const width = 800;
  const height = 250;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, COLORS.onyx);
  background.addColorStop(1, COLORS.charcoal);
  ctx.fillStyle = background;
  roundedRect(ctx, 0, 0, width, height, 30);
  ctx.fill();
  drawGlow(ctx, 470, 155, 310, 'rgba(139, 92, 246, 0.21)');

  ctx.save();
  roundedRect(ctx, 0, 0, width, height, 30);
  ctx.clip();
  ctx.fillStyle = 'rgba(139, 92, 246, 0.95)';
  ctx.fillRect(0, 0, 8, height);
  ctx.restore();

  const avatar = await safeLoadImage(user.displayAvatarURL({ extension: 'png', size: 256 }));
  const avatarX = 48;
  const avatarY = 52;
  const avatarSize = 146;
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.charcoal;
  ctx.fill();
  ctx.clip();
  if (avatar) ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
  else {
    ctx.fillStyle = '#352342';
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    ctx.fillStyle = COLORS.white;
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(username.slice(0, 1).toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2);
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 5, 0, Math.PI * 2);
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 6;
  ctx.stroke();

  const nameX = 240;
  const maxNameWidth = 420;
  const nameSize = fitText(ctx, username, maxNameWidth, 28);
  ctx.font = `bold ${nameSize}px sans-serif`;
  ctx.fillStyle = COLORS.white;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(username, nameX, 79);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = COLORS.muted;
  ctx.fillText(`LEVEL ${record.level}`, nameX, 111);

  const barX = nameX;
  const barY = 137;
  const barWidth = 400;
  const barHeight = 20;
  const needed = requiredXpForLevel(record.level);
  const progress = Math.max(0, Math.min(1, record.xp / needed));
  roundedRect(ctx, barX, barY, barWidth, barHeight, 10);
  ctx.fillStyle = 'rgba(139, 92, 246, 0.25)';
  ctx.fill();
  roundedRect(ctx, barX, barY, Math.max(barHeight, barWidth * progress), barHeight, 10);
  const progressFill = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
  progressFill.addColorStop(0, '#8B5CF6');
  progressFill.addColorStop(1, '#C084FC');
  ctx.fillStyle = progressFill;
  ctx.fill();

  ctx.font = '16px monospace';
  ctx.fillStyle = COLORS.white;
  ctx.fillText(`${record.xp} / ${needed} XP`, barX, 181);
  ctx.textAlign = 'right';
  ctx.fillText(`Total: ${record.totalXp} XP`, width - 48, 224);

  ctx.textAlign = 'center';
  ctx.font = '14px sans-serif';
  ctx.fillStyle = COLORS.muted;
  ctx.fillText('RANK', 718, 66);
  ctx.font = 'bold 36px sans-serif';
  ctx.fillStyle = COLORS.gold;
  ctx.fillText(`#${rank}`, 718, 106);
  await drawLogo(ctx, 750, 15, 40);

  return canvas.toBuffer('image/png');
}

async function generateLeaderboard({ entries, page, pageCount, totalUsers }) {
  const width = 900;
  const height = 950;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, COLORS.onyx);
  background.addColorStop(1, '#17111D');
  ctx.fillStyle = background;
  roundedRect(ctx, 0, 0, width, height, 34);
  ctx.fill();
  drawGlow(ctx, 735, 560, 360, 'rgba(139, 92, 246, 0.14)');

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = COLORS.white;
  ctx.font = 'bold 38px sans-serif';
  ctx.fillText('XP LEADERBOARD', 48, 70);
  ctx.font = '17px sans-serif';
  ctx.fillStyle = COLORS.muted;
  ctx.fillText(`${config.serverInfo.name}  •  Earn XP by chatting`, 48, 102);
  await drawLogo(ctx, 778, 26, 66);
  ctx.textAlign = 'right';
  ctx.font = '15px sans-serif';
  ctx.fillStyle = COLORS.muted;
  ctx.fillText(`Page ${page + 1} / ${pageCount}`, 852, 111);

  const rowX = 34;
  const rowY = 140;
  const rowWidth = 832;
  const rowHeight = 62;
  const rowGap = 10;

  for (let index = 0; index < 10; index += 1) {
    const record = entries[index];
    const y = rowY + index * (rowHeight + rowGap);
    roundedRect(ctx, rowX, y, rowWidth, rowHeight, 14);
    ctx.fillStyle = COLORS.card;
    ctx.fill();

    const colors = [COLORS.gold, COLORS.silver, COLORS.bronze];
    const rankColor = colors[index] || COLORS.muted;
    ctx.save();
    roundedRect(ctx, rowX, y, rowWidth, rowHeight, 14);
    ctx.clip();
    ctx.fillStyle = 'rgba(139, 92, 246, 0.95)';
    ctx.fillRect(rowX, y, 7, rowHeight);
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = rankColor;
    ctx.fillText(`#${page * 10 + index + 1}`, rowX + 18, y + 26);

    if (!record) {
      ctx.font = '16px sans-serif';
      ctx.fillStyle = COLORS.muted;
      ctx.fillText(totalUsers === 0 ? 'No XP records yet — start chatting to earn XP.' : 'No more players on this page.', rowX + 92, y + 35);
      continue;
    }

    const username = record.username || 'Unknown explorer';
    const nameSize = fitText(ctx, username, 258, 17);
    ctx.font = `bold ${nameSize}px sans-serif`;
    ctx.fillStyle = COLORS.white;
    ctx.fillText(username, rowX + 92, y + 24);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(`Level ${record.level}`, rowX + 92, y + 49);

    const progressX = rowX + 382;
    const progressY = y + 26;
    const progressWidth = 250;
    const progressHeight = 15;
    const required = requiredXpForLevel(record.level);
    const progress = Math.max(0, Math.min(1, record.xp / required));
    roundedRect(ctx, progressX, progressY, progressWidth, progressHeight, 8);
    ctx.fillStyle = '#321C40';
    ctx.fill();
    roundedRect(ctx, progressX, progressY, Math.max(progressHeight, progressWidth * progress), progressHeight, 8);
    const bar = ctx.createLinearGradient(progressX, progressY, progressX + progressWidth, progressY);
    bar.addColorStop(0, '#8B5CF6');
    bar.addColorStop(1, '#C084FC');
    ctx.fillStyle = bar;
    ctx.fill();
    ctx.font = '12px monospace';
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(`${record.xp}/${required} XP`, progressX, y + 55);

    ctx.textAlign = 'right';
    ctx.font = 'bold 15px monospace';
    ctx.fillStyle = COLORS.white;
    ctx.fillText(`${record.totalXp} total XP`, rowX + rowWidth - 18, y + 38);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '13px monospace';
  ctx.fillStyle = COLORS.muted;
  ctx.fillText(`Generated live by ${config.serverInfo.name}`, 45, 912);
  ctx.textAlign = 'right';
  ctx.fillText(`Players tracked: ${totalUsers}`, 855, 912);

  return canvas.toBuffer('image/png');
}

module.exports = { generateWelcomeBanner, generateRankCard, generateLeaderboard };
