import { AvatarConfig, Player } from '../types/game';

export const SKIN_COLORS = [
  '#f8d5b8', // light
  '#ffd39b', // peach
  '#d2a177', // tan
  '#a67c52', // brown
  '#744722', // deep brown
  '#8be9fd', // alien cyan
  '#ffb86c', // pastel orange
];

export const HAIR_COLORS = [
  '#2d3748', // black/dark slate
  '#713f12', // brown
  '#eab308', // blonde
  '#ef4444', // fiery red
  '#3b82f6', // electric blue
  '#a855f7', // purple
  '#ec4899', // pink
  '#ffffff', // silver white
];

export const SHIRT_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // yellow/orange
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#1f2937', // charcoal
  '#ffffff', // clean white
];

export const PANTS_COLORS = [
  '#1e293b', // dark navy
  '#334155', // slate
  '#475569', // denim
  '#78350f', // khaki
  '#0f172a', // midnight
];

/**
 * Draws a pixel-styled chibi avatar onto a canvas 2D context
 */
export function drawAvatar(
  ctx: CanvasRenderingContext2D,
  player: Player,
  x: number, // canvas pixel X
  y: number, // canvas pixel Y
  scale: number = 1.0,
  walkCycle: number = 0
) {
  ctx.save();
  ctx.translate(x, y - (player.jumpOffset || 0) * scale);

  const { avatar } = player;
  const isFacingLeft = player.facing === 'left';
  const flip = isFacingLeft ? -1 : 1;
  ctx.scale(flip * scale, scale);

  const bob = Math.sin(walkCycle) * 2;

  // 1. Ground Shadow (stays on floor regardless of jump)
  ctx.save();
  ctx.scale(flip, 1); // unflip shadow
  ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
  ctx.beginPath();
  const shadowY = (player.jumpOffset || 0) * scale + 18;
  const shadowRadius = Math.max(8, 16 - (player.jumpOffset || 0) * 0.3);
  ctx.ellipse(0, shadowY, shadowRadius, shadowRadius * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. Legs / Shoes
  const legOffset = Math.sin(walkCycle) * 3;
  ctx.fillStyle = avatar.pantsColor;
  // Left leg
  ctx.fillRect(-8, 8 + bob + legOffset, 6, 10);
  // Right leg
  ctx.fillRect(2, 8 + bob - legOffset, 6, 10);

  // Shoes (dark)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-9, 16 + bob + legOffset, 7, 4);
  ctx.fillRect(1, 16 + bob - legOffset, 7, 4);

  // 3. Torso / Shirt
  ctx.fillStyle = avatar.shirtColor;
  ctx.beginPath();
  ctx.roundRect(-11, -4 + bob, 22, 14, 4);
  ctx.fill();

  // Collar / tie detail
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillRect(-2, -3 + bob, 4, 6);

  // Arms
  const armSwing = Math.sin(walkCycle) * 4;
  ctx.fillStyle = avatar.shirtColor;
  // back arm
  ctx.fillRect(-14, -2 + bob - armSwing, 4, 9);
  // front arm
  ctx.fillRect(10, -2 + bob + armSwing, 4, 9);
  // hands
  ctx.fillStyle = avatar.skinColor;
  ctx.fillRect(-14, 7 + bob - armSwing, 4, 4);
  ctx.fillRect(10, 7 + bob + armSwing, 4, 4);

  // 4. Head
  ctx.fillStyle = avatar.skinColor;
  ctx.beginPath();
  ctx.roundRect(-14, -26 + bob, 28, 22, 7);
  ctx.fill();

  // Blush cheeks
  ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
  ctx.beginPath();
  ctx.arc(-8, -13 + bob, 3, 0, Math.PI * 2);
  ctx.arc(8, -13 + bob, 3, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#0f172a';
  if (player.isCorrectLastRound) {
    // Happy happy eyes ^_^
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-6, -16 + bob, 3, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(6, -16 + bob, 3, Math.PI, 0);
    ctx.stroke();
  } else if (player.isEliminated) {
    // Dizzy X eyes
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('X', -6, -14 + bob);
    ctx.fillText('X', 6, -14 + bob);
  } else {
    // Normal cute expressive eyes with white gleam
    ctx.beginPath();
    ctx.ellipse(-6, -16 + bob, 2.5, 3.5, 0, 0, Math.PI * 2);
    ctx.ellipse(6, -16 + bob, 2.5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Gleam
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-5.5, -17.5 + bob, 1, 0, Math.PI * 2);
    ctx.arc(6.5, -17.5 + bob, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mouth
  ctx.fillStyle = '#991b1b';
  ctx.beginPath();
  if (player.isCorrectLastRound) {
    // Big open smile
    ctx.arc(0, -11 + bob, 3, 0, Math.PI);
    ctx.fill();
  } else {
    ctx.arc(0, -11 + bob, 1.5, 0, Math.PI);
    ctx.fill();
  }

  // 5. Hair Styles
  ctx.fillStyle = avatar.hairColor;
  switch (avatar.hairStyle) {
    case 'spiky':
      // Spiky anime hair
      ctx.beginPath();
      ctx.moveTo(-15, -20 + bob);
      ctx.lineTo(-18, -32 + bob);
      ctx.lineTo(-9, -28 + bob);
      ctx.lineTo(-4, -36 + bob);
      ctx.lineTo(2, -28 + bob);
      ctx.lineTo(9, -35 + bob);
      ctx.lineTo(15, -28 + bob);
      ctx.lineTo(18, -19 + bob);
      ctx.lineTo(13, -24 + bob);
      ctx.lineTo(-13, -24 + bob);
      ctx.closePath();
      ctx.fill();
      break;

    case 'curly':
      // Fluffy puff curls
      ctx.beginPath();
      ctx.arc(-10, -28 + bob, 7, 0, Math.PI * 2);
      ctx.arc(0, -32 + bob, 8, 0, Math.PI * 2);
      ctx.arc(10, -28 + bob, 7, 0, Math.PI * 2);
      ctx.arc(-14, -20 + bob, 6, 0, Math.PI * 2);
      ctx.arc(14, -20 + bob, 6, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'ponytail':
      // Ponytail with cute side puff
      ctx.beginPath();
      ctx.roundRect(-15, -30 + bob, 30, 10, 4);
      ctx.fill();
      // Tail
      ctx.beginPath();
      ctx.arc(-16, -26 + bob, 8, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'bob':
      // Sleek bob cut
      ctx.beginPath();
      ctx.roundRect(-16, -30 + bob, 32, 12, [6, 6, 0, 0]);
      ctx.fill();
      ctx.fillRect(-16, -22 + bob, 5, 14);
      ctx.fillRect(11, -22 + bob, 5, 14);
      break;

    case 'cap':
      // Baseball cap
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, -24 + bob, 15, Math.PI, 0);
      ctx.fill();
      // Visor
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.ellipse(8, -23 + bob, 10, 3, 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'short':
    default:
      // Neat side sweep
      ctx.beginPath();
      ctx.roundRect(-15, -30 + bob, 30, 9, 4);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-15, -21 + bob);
      ctx.lineTo(-8, -17 + bob);
      ctx.lineTo(4, -21 + bob);
      ctx.lineTo(15, -18 + bob);
      ctx.lineTo(15, -26 + bob);
      ctx.lineTo(-15, -26 + bob);
      ctx.closePath();
      ctx.fill();
      break;
  }

  // 6. Accessories
  switch (avatar.accessory) {
    case 'glasses':
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-9, -19 + bob, 6, 5);
      ctx.strokeRect(3, -19 + bob, 6, 5);
      ctx.beginPath();
      ctx.moveTo(-3, -16 + bob);
      ctx.lineTo(3, -16 + bob);
      ctx.stroke();
      break;

    case 'crown':
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(-8, -32 + bob);
      ctx.lineTo(-11, -40 + bob);
      ctx.lineTo(-4, -36 + bob);
      ctx.lineTo(0, -42 + bob);
      ctx.lineTo(4, -36 + bob);
      ctx.lineTo(11, -40 + bob);
      ctx.lineTo(8, -32 + bob);
      ctx.closePath();
      ctx.fill();
      // Gem
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, -35 + bob, 1.5, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'headphones':
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -25 + bob, 14, Math.PI, 0);
      ctx.stroke();
      // Earcups
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(-17, -22 + bob, 4, 8);
      ctx.fillRect(13, -22 + bob, 4, 8);
      break;

    case 'flower':
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(10, -28 + bob, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(10, -28 + bob, 1.8, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'headband':
      ctx.fillStyle = '#10b981';
      ctx.fillRect(-14, -25 + bob, 28, 4);
      break;
  }

  ctx.restore();

  // 7. Player Name Tag Badge (Unflipped so text is always readable!)
  ctx.save();
  ctx.translate(x, y - (player.jumpOffset || 0) * scale);
  const badgeY = -38 * scale;

  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  const nameText = player.name + (player.isHost ? ' 👑' : '');
  const textWidth = ctx.measureText(nameText).width;
  const paddingX = 8;
  const badgeWidth = textWidth + paddingX * 2;
  const badgeHeight = 18;

  // Badge background
  ctx.fillStyle = player.isHost ? 'rgba(245, 158, 11, 0.95)' : 'rgba(15, 23, 42, 0.8)';
  ctx.beginPath();
  ctx.roundRect(-badgeWidth / 2, badgeY - badgeHeight / 2, badgeWidth, badgeHeight, 6);
  ctx.fill();

  // Badge border
  ctx.strokeStyle = player.isHost ? '#fbbf24' : 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Badge text
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(nameText, 0, badgeY);

  // 8. Floating Emote Speech Bubble
  if (player.emote && Date.now() - player.emote.timestamp < 3500) {
    const emoteY = -62 * scale;
    ctx.font = '18px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, emoteY, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Little triangle tail
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-4, emoteY + 13);
    ctx.lineTo(0, emoteY + 19);
    ctx.lineTo(4, emoteY + 13);
    ctx.closePath();
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.emote.emoji, 0, emoteY);
  }

  ctx.restore();
}
