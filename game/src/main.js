// Ember Duel — the game itself: state, turns, rules and the animation loop.
// One job: own the match. Rendering lives in render.js, input in input.js.

import { START_LIFE, HAND_SIZE, MAX_MANA, AI_THINK_MS, AI_PLAY_MS, AI_NAMES, VIEW_W, VIEW_H } from './config.js';
import { makeRng, buildDeck, drawCards, drawOpeningHand, effectiveValue } from './deck.js';
import { chooseCard, intentText } from './ai.js';
import { drawTable, drawTitle, drawEnd, drawPaused, handSlot, layout } from './render.js';
import { sfx, unlockAudio, toggleMute } from './audio.js';
import { bindInput, cardAtPoint, keyAction } from './input.js';

const CONFETTI_COLORS = ['#ffd166', '#e5484d', '#3e9bff', '#46a758', '#f5b301', '#b5179e'];

export function createGame(canvas) {
  const ctx = canvas.getContext('2d');
  const game = {
    canvas,
    screen: 'title', // title | playing | paused | end
    phase: 'player', // player | rival | over
    won: false,
    turn: 0,
    score: 0,
    selected: -1,
    hovered: -1,
    suitsPlayed: new Set(),
    intent: '',
    lastPlayed: null,
    logLine: '',
    banner: null,
    floaters: [],
    particles: [],
    dealAnim: [],
    titleCards: [],
    aiQueue: [],
    aiToken: 0,
    player: null,
    rival: null,
    rng: Math.random,
  };

  // --- setup ---------------------------------------------------------------

  function freshSide(name) {
    return {
      name,
      life: START_LIFE,
      shield: 0,
      mana: 0,
      maxMana: 0,
      hand: [],
      deck: [],
      discard: [],
    };
  }

  game.startDuel = function startDuel(seed) {
    game.rng = seed == null ? Math.random : makeRng(seed);
    game.aiToken++;
    game.aiQueue = [];
    game.player = freshSide('You');
    game.rival = freshSide(AI_NAMES[Math.floor(game.rng() * AI_NAMES.length)]);
    game.player.deck = buildDeck(game.rng);
    game.rival.deck = buildDeck(game.rng);
    game.player.hand = drawOpeningHand(game.player);
    game.rival.hand = drawOpeningHand(game.rival);
    game.turn = 1;
    game.score = 0;
    game.selected = -1;
    game.hovered = -1;
    game.suitsPlayed = new Set();
    game.intent = '';
    game.lastPlayed = null;
    game.logLine = 'Your turn — play a card, then End Turn.';
    game.banner = { text: 'YOUR TURN', life: 1 };
    game.floaters = [];
    game.particles = [];
    game.screen = 'playing';
    game.phase = 'player';
    game.won = false;
    startPlayerTurn(true);
    dealIn(game.player.hand.length);
    sfx.turn();
  };

  function startPlayerTurn(first) {
    const p = game.player;
    p.maxMana = Math.min(game.turn, MAX_MANA);
    p.mana = p.maxMana;
    if (!first) {
      drawCards(p, p.hand, 2);
      dealIn(p.hand.length);
    }
    game.suitsPlayed = new Set();
    game.selected = -1;
    game.banner = { text: `TURN ${game.turn}`, life: 1 };
    sfx.turn();
  }

  // Cards fly in from the deck corner, one after another, flipping face-up.
  function dealIn(count) {
    game.dealAnim = [];
    const now = performance.now();
    for (let i = 0; i < count; i++) {
      const pos = handSlot(i, count);
      game.dealAnim.push({
        fromX: VIEW_W - 90, fromY: VIEW_H - 40,
        targetX: pos.x, targetY: pos.y,
        x: VIEW_W - 90, y: VIEW_H - 40,
        start: now + i * 90, flip: 1,
      });
    }
    sfx.deal();
  }

  // --- playing a card ------------------------------------------------------

  game.selectCard = function selectCard(i) {
    if (game.phase !== 'player' || game.screen !== 'playing') return;
    game.selected = game.selected === i ? -1 : i;
    sfx.select();
  };

  game.playSelected = function playSelected() {
    if (game.selected < 0) return;
    game.playCard(game.selected);
  };

  game.playCard = function playCard(index) {
    if (game.phase !== 'player' || game.screen !== 'playing') return;
    const card = game.player.hand[index];
    if (!card || card.cost > game.player.mana) {
      game.logLine = card ? 'Not enough mana for that card.' : '';
      return;
    }
    const value = effectiveValue(card, game.suitsPlayed);
    const resonant = game.suitsPlayed.has(card.suit);
    game.player.mana -= card.cost;
    game.player.hand.splice(index, 1);
    game.player.discard.push(card);
    game.suitsPlayed.add(card.suit);
    game.selected = -1;
    applyEffect(game.player, game.rival, card, value, resonant, 'You');
    game.lastPlayed = { card, value, resonant, text: lastPlayedText(card, value, resonant, 'You') };
    if (resonant) sfx.resonance(); else sfx.playCard();
    checkEnd();
  };

  function lastPlayedText(card, value, resonant, who) {
    const base = `${who} played ${card.name} (${value})`;
    return resonant ? `${base} — RESONANCE +2!` : base;
  }

  function applyEffect(actor, target, card, value, resonant, who) {
    if (card.kind === 'strike') {
      let remaining = value;
      if (target.shield > 0) {
        const blocked = Math.min(target.shield, remaining);
        target.shield -= blocked;
        remaining -= blocked;
      }
      target.life -= remaining;
      game.score += value;
      addFloater(VIEW_W / 2 + 80, 300, `-${value}`, '#ff6b6b');
      game.logLine = `${who} strike for ${value}${target.shield > 0 ? ' (shield held some)' : ''}.`;
      sfx.hit();
    } else if (card.kind === 'guard') {
      actor.shield += value;
      addFloater(VIEW_W / 2, 300, `+${value} shield`, '#7dd3fc');
      game.logLine = `${who} raise ${value} shield.`;
      sfx.shield();
    } else if (card.kind === 'mend') {
      actor.life = Math.min(START_LIFE, actor.life + value);
      addFloater(VIEW_W / 2, 300, `+${value} life`, '#4ade80');
      game.logLine = `${who} mend ${value} life.`;
      sfx.heal();
    } else {
      drawCards(actor, actor.hand, value);
      game.logLine = `${who} draw ${value} cards.`;
      sfx.draw();
    }
    if (resonant) game.logLine += ' Resonance!';
  }

  function addFloater(x, y, text, color) {
    game.floaters.push({ x, y, text, color, life: 1 });
  }

  function checkEnd() {
    if (game.rival.life <= 0) return endDuel(true);
    if (game.player.life <= 0) return endDuel(false);
  }

  function endDuel(won) {
    game.won = won;
    game.phase = 'over';
    game.screen = 'end';
    game.intent = '';
    if (won) {
      game.score += 100;
      burstConfetti();
      sfx.win();
    } else {
      sfx.lose();
    }
  }

  function burstConfetti() {
    for (let i = 0; i < 140; i++) {
      game.particles.push({
        x: Math.random() * VIEW_W,
        y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 2,
        vy: 2 + Math.random() * 3,
        size: 6 + Math.random() * 8,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      });
    }
  }

  // Screenshot states drive the game here instead of through a full match.
  game.forceEnd = function forceEnd(won) {
    endDuel(won);
  };

  // --- turns ----------------------------------------------------------------

  game.endTurn = function endTurn() {
    if (game.phase !== 'player' || game.screen !== 'playing') return;
    game.phase = 'rival';
    game.selected = -1;
    game.intent = '';
    game.banner = { text: 'RIVAL TURN', life: 1 };
    runRivalTurn();
  };

  function runRivalTurn() {
    const token = game.aiToken;
    const rival = game.rival;
    rival.maxMana = Math.min(game.turn, MAX_MANA);
    rival.mana = rival.maxMana;
    drawCards(rival, rival.hand, 2);

    // Plan the whole turn up front on a simulated hand and mana pool, so the
    // planner can never loop forever on a card it already "spent".
    const plan = [];
    const simHand = rival.hand.slice();
    let simMana = rival.mana;
    const suits = new Set();
    for (;;) {
      const pick = chooseCard({ ...rival, hand: simHand, mana: simMana }, game.player, suits);
      if (!pick) break;
      const card = simHand[pick.index];
      plan.push({ card, value: effectiveValue(card, suits), resonant: suits.has(card.suit) });
      suits.add(card.suit);
      simMana -= card.cost;
      simHand.splice(pick.index, 1);
    }

    let t = performance.now() + AI_THINK_MS;
    for (const step of plan) {
      const at = t;
      game.aiQueue.push({
        at,
        run() {
          if (token !== game.aiToken || game.screen !== 'playing') return;
          game.intent = intentText({ card: step.card }, rival, game.player, new Set(step.resonant ? [step.card.suit] : []));
        },
      });
      game.aiQueue.push({
        at: at + AI_PLAY_MS,
        run() {
          if (token !== game.aiToken || game.screen !== 'playing') return;
          const idx = rival.hand.findIndex((c) => c.uid === step.card.uid);
          if (idx < 0) return;
          const card = rival.hand[idx];
          rival.mana -= card.cost;
          rival.hand.splice(idx, 1);
          rival.discard.push(card);
          applyEffect(rival, game.player, card, step.value, step.resonant, game.rival.name);
          game.lastPlayed = { card, value: step.value, resonant: step.resonant, text: lastPlayedText(card, step.value, step.resonant, game.rival.name) };
          checkEnd();
        },
      });
      t += AI_THINK_MS + AI_PLAY_MS;
    }
    game.aiQueue.push({
      at: t + 300,
      run() {
        if (token !== game.aiToken || game.screen !== 'playing') return;
        game.intent = '';
        game.turn++;
        game.phase = 'player';
        startPlayerTurn(false);
        checkEnd();
      },
    });
  }

  // --- clicks / keys / pause -------------------------------------------------

  game.onClick = function onClick(x, y) {
    unlockAudio();
    if (game.screen === 'title' || game.screen === 'end') {
      game.startDuel();
      return;
    }
    if (game.screen === 'paused') {
      game.togglePause();
      return;
    }
    if (game.phase !== 'player') return;
    if (x >= layout.endTurn.x && x <= layout.endTurn.x + layout.endTurn.w &&
        y >= layout.endTurn.y && y <= layout.endTurn.y + layout.endTurn.h) {
      game.endTurn();
      return;
    }
    if (x >= layout.playButton.x && x <= layout.playButton.x + layout.playButton.w &&
        y >= layout.playButton.y && y <= layout.playButton.y + layout.playButton.h) {
      game.playSelected();
      return;
    }
    const i = cardAtPoint(game, x, y);
    if (i >= 0) {
      if (game.selected === i) game.playCard(i);
      else game.selectCard(i);
    }
  };

  game.onKey = function onKey(key) {
    unlockAudio();
    keyAction(key, game);
  };

  game.onBlur = function onBlur() {
    if (game.screen === 'playing' && game.phase === 'player') {
      game.screen = 'paused';
    }
  };

  game.togglePause = function togglePause() {
    if (game.screen === 'playing') game.screen = 'paused';
    else if (game.screen === 'paused') game.screen = 'playing';
  };

  game.toggleMute = function toggleMute() {
    toggleMute();
  };

  // --- loop ------------------------------------------------------------------

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(50, now - last);
    last = now;
    update(now, dt);
    render();
    requestAnimationFrame(frame);
  }

  function update(now, dt) {
    // Deal animation: cards slide in and flip face-up.
    for (const a of game.dealAnim) {
      const p = Math.min(1, Math.max(0, (now - a.start) / 380));
      const eased = 1 - Math.pow(1 - p, 3);
      a.x = a.fromX + (a.targetX - a.fromX) * eased;
      a.y = a.fromY + (a.targetY - a.fromY) * eased;
      a.flip = 1 - eased;
      if (p >= 1) a.done = true;
    }
    game.dealAnim = game.dealAnim.filter((a) => !a.done);

    // Rival's queued moves.
    while (game.aiQueue.length && game.aiQueue[0].at <= now) {
      game.aiQueue.shift().run();
    }

    if (game.banner) {
      game.banner.life -= dt / 1400;
      if (game.banner.life <= 0) game.banner = null;
    }
    for (const f of game.floaters) {
      f.y -= dt * 0.05;
      f.life -= dt / 1200;
    }
    game.floaters = game.floaters.filter((f) => f.life > 0);
    for (const p of game.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.02;
    }
    game.particles = game.particles.filter((p) => p.y < VIEW_H + 20);
  }

  function render() {
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    if (game.screen === 'title') {
      drawTitle(ctx, game);
      return;
    }
    drawTable(ctx, game);
    if (game.screen === 'end') drawEnd(ctx, game, game.won);
    else if (game.screen === 'paused') drawPaused(ctx);
  }

  // Title screen sample cards, fixed so the title always looks the same.
  game.titleCards = [
    { id: 'inferno', name: 'Inferno', suit: 'flame', kind: 'strike', cost: 4, value: 9 },
    { id: 'glacier', name: 'Glacier', suit: 'frost', kind: 'guard', cost: 2, value: 6 },
    { id: 'grove', name: 'Grove', suit: 'leaf', kind: 'mend', cost: 2, value: 5 },
    { id: 'surge', name: 'Surge', suit: 'bolt', kind: 'strike', cost: 3, value: 7 },
    { id: 'spark', name: 'Spark', suit: 'bolt', kind: 'spark', cost: 1, value: 2 },
  ];

  bindInput(canvas, game);
  requestAnimationFrame(frame);
  return game;
}
