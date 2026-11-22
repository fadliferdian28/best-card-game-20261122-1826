// Ember Duel — everything drawn on the canvas: table, cards, HUD and screens.
// One job: turn game state into pixels. It never changes state.

import { SUITS, KIND_LABEL, VIEW_W, VIEW_H } from './config.js';

const CARD_W = 118;
const CARD_H = 162;
const RIVAL_CARD_W = 84;
const RIVAL_CARD_H = 116;

export const layout = {
  cardW: CARD_W,
  cardH: CARD_H,
  rivalCardW: RIVAL_CARD_W,
  rivalCardH: RIVAL_CARD_H,
  rivalHandY: 86,
  tableY: 250,
  handY: 536,
  endTurn: { x: 1120, y: 300, w: 132, h: 52 },
  playButton: { x: 1120, y: 372, w: 132, h: 52 },
};

// --- small drawing helpers -------------------------------------------------

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawSuitShape(ctx, suitKey, cx, cy, r, color) {
  const c = color || SUITS[suitKey].color;
  ctx.fillStyle = c;
  ctx.beginPath();
  if (suitKey === 'flame') {
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.9, cy + r * 0.8);
    ctx.lineTo(cx - r * 0.9, cy + r * 0.8);
  } else if (suitKey === 'frost') {
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
  } else if (suitKey === 'leaf') {
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  } else {
    // bolt: five-pointed star
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + (i * Math.PI) / 5;
      const rad = i % 2 === 0 ? r : r * 0.45;
      const px = cx + Math.cos(ang) * rad;
      const py = cy + Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.fill();
}

function drawCardBack(ctx, x, y, w, h) {
  roundRect(ctx, x, y, w, h, 10);
  ctx.fillStyle = '#5b2333';
  ctx.fill();
  ctx.strokeStyle = '#e5484d';
  ctx.lineWidth = 2;
  ctx.stroke();
  roundRect(ctx, x + 6, y + 6, w - 12, h - 12, 7);
  ctx.strokeStyle = 'rgba(229,72,77,0.55)';
  ctx.stroke();
  drawSuitShape(ctx, 'flame', x + w / 2, y + h / 2, Math.min(w, h) * 0.22, '#e5484d');
}

function drawCardFace(ctx, card, x, y, w, h, opts) {
  const suit = SUITS[card.suit];
  const dimmed = opts.dimmed;
  roundRect(ctx, x, y, w, h, 10);
  ctx.fillStyle = dimmed ? '#cfc8bd' : '#f7f1e3';
  ctx.fill();
  ctx.lineWidth = opts.selected ? 4 : 2.5;
  ctx.strokeStyle = opts.selected ? '#ffd166' : suit.dark;
  ctx.stroke();

  // Cost orb, top-left.
  ctx.beginPath();
  ctx.arc(x + 20, y + 20, 15, 0, Math.PI * 2);
  ctx.fillStyle = '#2b2d42';
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 19px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(card.cost), x + 20, y + 21);

  // Suit shape, top-right, and again large behind the value.
  drawSuitShape(ctx, card.suit, x + w - 22, y + 22, 12);
  ctx.globalAlpha = 0.14;
  drawSuitShape(ctx, card.suit, x + w / 2, y + h * 0.52, 44);
  ctx.globalAlpha = 1;

  // Big value.
  ctx.fillStyle = suit.dark;
  ctx.font = 'bold 46px Georgia, serif';
  ctx.fillText(String(opts.value), x + w / 2, y + h * 0.52);

  // Name and kind.
  ctx.fillStyle = '#2b2d42';
  ctx.font = 'bold 17px Georgia, serif';
  ctx.fillText(card.name, x + w / 2, y + h - 40);
  ctx.fillStyle = suit.color;
  ctx.font = 'bold 12px Georgia, serif';
  ctx.fillText(`${suit.glyph} ${KIND_LABEL[card.kind]} ${suit.glyph}`, x + w / 2, y + h - 20);

  if (opts.resonant) {
    ctx.fillStyle = '#b5179e';
    ctx.font = 'bold 13px Georgia, serif';
    ctx.fillText('RESONANCE +2', x + w / 2, y + 44);
  }
}

// Draw one card. flip 0 = face up, 1 = face down; values between squash the
// card sideways, which reads as a flip in motion.
export function drawCard(ctx, card, x, y, w, h, opts = {}) {
  const flip = opts.flip ?? 0;
  const cx = x + w / 2;
  const squash = Math.abs(1 - flip * 2);
  const dw = Math.max(2, w * squash);
  ctx.save();
  ctx.translate(cx, y);
  if (opts.lift) ctx.translate(0, -18);
  if (opts.hovered) ctx.translate(0, -10);
  ctx.translate(-dw / 2, 0);
  if (flip >= 0.5) drawCardBack(ctx, 0, 0, dw, h);
  else drawCardFace(ctx, card, 0, 0, dw, h, opts);
  ctx.restore();
}

// --- HUD -------------------------------------------------------------------

function lifeBar(ctx, x, y, w, life, max, shield, color) {
  roundRect(ctx, x, y, w, 22, 11);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fill();
  const frac = Math.max(0, life / max);
  if (frac > 0) {
    roundRect(ctx, x + 2, y + 2, (w - 4) * frac, 18, 9);
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`♥ ${life}`, x + 8, y + 12);
  if (shield > 0) {
    ctx.fillStyle = '#7dd3fc';
    ctx.fillText(`🛡 ${shield}`, x + w - 64, y + 12);
  }
}

function manaPips(ctx, x, y, mana, maxMana) {
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('MANA', x, y);
  for (let i = 0; i < maxMana; i++) {
    const cx = x + 62 + i * 24;
    ctx.beginPath();
    ctx.arc(cx, y, 9, 0, Math.PI * 2);
    ctx.fillStyle = i < mana ? '#38bdf8' : 'rgba(255,255,255,0.18)';
    ctx.fill();
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

// --- table -----------------------------------------------------------------

export function drawTable(ctx, s) {
  // Felt table.
  ctx.fillStyle = '#14532d';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#166534';
  ctx.beginPath();
  ctx.ellipse(VIEW_W / 2, VIEW_H / 2, 560, 300, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,209,102,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(VIEW_W / 2, VIEW_H / 2, 560, 300, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Rival header.
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`⚔ ${s.rival.name}`, 28, 34);
  lifeBar(ctx, 240, 24, 300, s.rival.life, 20, s.rival.shield, '#e5484d');
  ctx.textAlign = 'right';
  ctx.font = 'bold 18px Georgia, serif';
  ctx.fillText(`SCORE ${s.score}`, VIEW_W - 28, 34);

  // Rival hand, face down, fanned.
  const rw = RIVAL_CARD_W;
  const gap = Math.min(96, (VIEW_W - 360) / Math.max(1, s.rival.hand.length));
  const startX = VIEW_W / 2 - ((s.rival.hand.length - 1) * gap) / 2 - rw / 2;
  s.rival.hand.forEach((card, i) => {
    const fx = startX + i * gap;
    const fy = layout.rivalHandY + Math.abs(i - (s.rival.hand.length - 1) / 2) * 4;
    drawCard(ctx, card, fx, fy, rw, RIVAL_CARD_H, { flip: 1 });
  });
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '14px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${s.rival.hand.length} cards`, VIEW_W / 2, layout.rivalHandY + RIVAL_CARD_H + 18);

  // Intent banner: what the rival plans to do, so it can be countered.
  if (s.intent) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(ctx, VIEW_W / 2 - 260, 224, 520, 34, 17);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 17px Georgia, serif';
    ctx.fillText(s.intent, VIEW_W / 2, 242);
  }

  // Last played cards, centre of the table.
  if (s.lastPlayed) {
    const lp = s.lastPlayed;
    drawCard(ctx, lp.card, VIEW_W / 2 - CARD_W / 2 - 70, layout.tableY + 8, CARD_W, CARD_H, {
      value: lp.value,
      resonant: lp.resonant,
    });
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(lp.text, VIEW_W / 2 + 100, layout.tableY + 90);
  }

  // Log line.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '15px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(s.logLine || '', VIEW_W / 2, 470);

  // Buttons.
  drawButton(ctx, layout.endTurn, s.phase === 'player' ? 'END TURN ⏎' : 'RIVAL…', s.phase === 'player');
  drawButton(ctx, layout.playButton, 'PLAY  ⏎', s.selected >= 0 && s.phase === 'player');

  // Player header + life + mana.
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px Georgia, serif';
  ctx.fillText('YOU', 28, 516);
  lifeBar(ctx, 240, 506, 300, s.player.life, 20, s.player.shield, '#46a758');
  manaPips(ctx, 600, 516, s.player.mana, s.player.maxMana);

  // Player hand.
  s.player.hand.forEach((card, i) => {
    const pos = handSlot(i, s.player.hand.length);
    const anim = s.dealAnim[i];
    const x = anim ? anim.x : pos.x;
    const y = anim ? anim.y : pos.y;
    drawCard(ctx, card, x, y, CARD_W, CARD_H, {
      value: cardValue(card, s),
      selected: s.selected === i,
      hovered: s.hovered === i,
      dimmed: card.cost > s.player.mana,
      resonant: s.suitsPlayed.has(card.suit),
      flip: anim ? anim.flip : 0,
    });
  });

  // Floating combat text.
  for (const f of s.floaters) {
    ctx.globalAlpha = Math.max(0, f.life);
    ctx.fillStyle = f.color;
    ctx.font = 'bold 26px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(f.text, f.x, f.y);
    ctx.globalAlpha = 1;
  }

  // Turn banner.
  if (s.banner) {
    ctx.globalAlpha = Math.min(1, s.banner.life * 2);
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 44px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.banner.text, VIEW_W / 2, 330);
    ctx.globalAlpha = 1;
  }

  // Confetti on a win.
  for (const p of s.particles) {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size * 0.6);
  }

  // Hint line.
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '13px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('Click a card or press 1–5, then Enter to play · M mute · Esc pause', VIEW_W / 2, VIEW_H - 12);
}

export function handSlot(i, count) {
  const gap = 132;
  const total = (count - 1) * gap;
  return { x: VIEW_W / 2 - total / 2 + i * gap - CARD_W / 2, y: layout.handY };
}

export function cardValue(card, s) {
  return card.value + (s.suitsPlayed.has(card.suit) ? 2 : 0);
}

function drawButton(ctx, b, label, enabled) {
  roundRect(ctx, b.x, b.y, b.w, b.h, 10);
  ctx.fillStyle = enabled ? '#ffd166' : 'rgba(255,255,255,0.16)';
  ctx.fill();
  ctx.fillStyle = enabled ? '#2b2d42' : 'rgba(255,255,255,0.55)';
  ctx.font = 'bold 16px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 + 1);
}

// --- screens ----------------------------------------------------------------

function screenShell(ctx, title, subtitle, accent) {
  ctx.fillStyle = '#14532d';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#166534';
  ctx.beginPath();
  ctx.ellipse(VIEW_W / 2, VIEW_H / 2, 560, 300, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,209,102,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(VIEW_W / 2, VIEW_H / 2, 560, 300, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = 'bold 72px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, VIEW_W / 2, 240);
  ctx.fillStyle = '#fff';
  ctx.font = '24px Georgia, serif';
  ctx.fillText(subtitle, VIEW_W / 2, 310);
}

export function drawTitle(ctx, s) {
  screenShell(ctx, 'EMBER DUEL', 'A duel of sparks — outplay the rival, card by card.', '#ffd166');
  // A fan of sample cards on the title screen.
  const sample = s.titleCards;
  sample.forEach((card, i) => {
    const x = VIEW_W / 2 - ((sample.length - 1) * 132) / 2 + i * 132 - CARD_W / 2;
    const y = 380 + (i % 2) * 14;
    drawCard(ctx, card, x, y, CARD_W, CARD_H, { value: card.value });
  });
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 26px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('▶  CLICK OR PRESS ENTER TO PLAY', VIEW_W / 2, 620);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '15px Georgia, serif';
  ctx.fillText('20 life each · mana grows every turn · match a suit twice for Resonance +2', VIEW_W / 2, 660);
}

export function drawEnd(ctx, s, won) {
  screenShell(
    ctx,
    won ? '★ VICTORY ★' : 'DEFEAT',
    won ? 'The rival is out of sparks. You win the duel!' : 'Your embers fade… the rival takes this duel.',
    won ? '#ffd166' : '#e5484d',
  );
  // Confetti falls over the end screen on a win, never under it.
  for (const p of s.particles) {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size * 0.6);
  }
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Final score: ${s.score}   ·   Turns: ${s.turn}`, VIEW_W / 2, 380);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 24px Georgia, serif';
  ctx.fillText('PRESS ENTER TO DUEL AGAIN', VIEW_W / 2, 450);
}

export function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 56px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PAUSED', VIEW_W / 2, 320);
  ctx.fillStyle = '#fff';
  ctx.font = '20px Georgia, serif';
  ctx.fillText('Press Esc or click to resume', VIEW_W / 2, 380);
}
