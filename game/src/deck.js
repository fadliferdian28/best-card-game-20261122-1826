// Ember Duel — the deck: building, shuffling and drawing cards.
// One job: everything about the pile of cards and the hands drawn from it.

import { CARD_DEFS, HAND_SIZE, MAX_HAND, RESONANCE_BONUS } from './config.js';

// A tiny seeded generator so screenshot states deal the same hands every run.
// Gameplay uses Math.random through the same interface; only the seed differs.
export function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return function next() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function buildDeck(rng) {
  const deck = [];
  for (const def of CARD_DEFS) {
    for (let copies = 0; copies < 3; copies++) deck.push({ ...def, uid: `${def.id}-${copies}` });
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// Draw up to n cards into hand, reshuffling the discard pile when the deck runs dry.
export function drawCards(state, hand, n) {
  for (let i = 0; i < n && hand.length < MAX_HAND; i++) {
    if (state.deck.length === 0) {
      if (state.discard.length === 0) return;
      state.deck = state.discard.splice(0);
      for (let k = state.deck.length - 1; k > 0; k--) {
        const j = Math.floor(state.rng() * (k + 1));
        [state.deck[k], state.deck[j]] = [state.deck[j], state.deck[k]];
      }
    }
    hand.push(state.deck.pop());
  }
}

export function drawOpeningHand(state) {
  const hand = [];
  drawCards(state, hand, HAND_SIZE);
  return hand;
}

// The value a card shows when played: base value, plus the resonance bonus
// when its suit was already played this turn.
export function effectiveValue(card, suitsPlayedThisTurn) {
  return card.value + (suitsPlayedThisTurn.has(card.suit) ? RESONANCE_BONUS : 0);
}
