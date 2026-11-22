// Ember Duel — input: mouse clicks and keyboard, both play the game.
// One job: turn pointer and key events into game actions. It never draws.

import { layout, handSlot } from './render.js';
import { VIEW_W, VIEW_H } from './config.js';

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function canvasPoint(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * VIEW_W,
    y: ((clientY - rect.top) / rect.height) * VIEW_H,
  };
}

// Which player-hand card sits under the point, or -1.
export function cardAtPoint(s, px, py) {
  if (!s.player) return -1;
  const count = s.player.hand.length;
  for (let i = count - 1; i >= 0; i--) {
    const pos = handSlot(i, count);
    const lifted = s.selected === i || s.hovered === i;
    const y = pos.y - (lifted ? 18 : 0);
    if (pointInRect(px, py, { x: pos.x, y, w: layout.cardW, h: layout.cardH })) return i;
  }
  return -1;
}

export function bindInput(canvas, game) {
  canvas.addEventListener('mousemove', (e) => {
    if (game.screen !== 'playing' || game.phase !== 'player' || !game.player) return;
    const p = canvasPoint(canvas, e.clientX, e.clientY);
    game.hovered = cardAtPoint(game, p.x, p.y);
  });

  canvas.addEventListener('click', (e) => {
    const p = canvasPoint(canvas, e.clientX, e.clientY);
    game.onClick(p.x, p.y);
  });

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    game.onKey(e.key);
  });

  // Auto-pause when the player looks away.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) game.onBlur();
  });
  window.addEventListener('blur', () => game.onBlur());
}

// Shared key handling, called by the game with the pressed key.
export function keyAction(key, game) {
  const k = key.toLowerCase();
  if (k === 'm') { game.toggleMute(); return; }
  if (k === 'escape') { game.togglePause(); return; }
  if (game.screen === 'title') {
    if (k === 'enter' || k === ' ') game.startDuel();
    return;
  }
  if (game.screen === 'end') {
    if (k === 'enter' || k === ' ') game.startDuel();
    return;
  }
  if (game.screen === 'paused') {
    if (k === 'escape' || k === 'enter' || k === ' ') game.togglePause();
    return;
  }
  if (game.phase !== 'player') return;
  if (k >= '1' && k <= '7') {
    const idx = Number(k) - 1;
    if (idx < game.player.hand.length) game.selectCard(idx);
    return;
  }
  if (k === 'enter' || k === ' ') { game.playSelected(); return; }
  if (k === 'arrowleft' || k === 'arrowright') {
    const dir = k === 'arrowleft' ? -1 : 1;
    const next = game.selected < 0 ? 0 : (game.selected + dir + game.player.hand.length) % game.player.hand.length;
    game.selectCard(next);
    return;
  }
  if (k === 'e') { game.endTurn(); }
}
