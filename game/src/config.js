// Ember Duel — shared constants, suits and the card catalogue.
// One job: every number and name the rest of the game agrees on lives here.

export const VIEW_W = 1280;
export const VIEW_H = 720;

export const START_LIFE = 20;
export const HAND_SIZE = 5;
export const MAX_MANA = 10;
export const MAX_HAND = 7;

// A suit is always colour AND shape: the table never relies on text alone.
export const SUITS = {
  flame: { name: 'Flame', color: '#e5484d', dark: '#8f1d22', shape: 'triangle', glyph: '▲' },
  frost: { name: 'Frost', color: '#3e9bff', dark: '#174a80', shape: 'diamond', glyph: '◆' },
  leaf:  { name: 'Leaf',  color: '#46a758', dark: '#1d5c2e', shape: 'circle',   glyph: '●' },
  bolt:  { name: 'Bolt',  color: '#f5b301', dark: '#8a6400', shape: 'star',     glyph: '★' },
};

// kind: strike hits, guard shields, mend heals, spark draws.
// value is the base effect; cost is the mana price.
export const CARD_DEFS = [
  { id: 'ember',   name: 'Ember',    suit: 'flame', kind: 'strike', cost: 1, value: 3 },
  { id: 'cinder',  name: 'Cinder',   suit: 'flame', kind: 'strike', cost: 2, value: 5 },
  { id: 'inferno', name: 'Inferno',  suit: 'flame', kind: 'strike', cost: 4, value: 9 },
  { id: 'shard',   name: 'Shard',    suit: 'frost', kind: 'strike', cost: 2, value: 4 },
  { id: 'glacier', name: 'Glacier',  suit: 'frost', kind: 'guard',  cost: 2, value: 6 },
  { id: 'rime',    name: 'Rime',     suit: 'frost', kind: 'guard',  cost: 1, value: 3 },
  { id: 'thorn',   name: 'Thorn',    suit: 'leaf',  kind: 'strike', cost: 1, value: 2 },
  { id: 'grove',   name: 'Grove',    suit: 'leaf',  kind: 'mend',   cost: 2, value: 5 },
  { id: 'bloom',   name: 'Bloom',    suit: 'leaf',  kind: 'mend',   cost: 1, value: 3 },
  { id: 'spark',   name: 'Spark',    suit: 'bolt',  kind: 'spark',  cost: 1, value: 2 },
  { id: 'surge',   name: 'Surge',    suit: 'bolt',  kind: 'strike', cost: 3, value: 7 },
  { id: 'volt',    name: 'Volt',     suit: 'bolt',  kind: 'spark',  cost: 2, value: 3 },
];

export const KIND_LABEL = {
  strike: 'STRIKE',
  guard: 'GUARD',
  mend: 'MEND',
  spark: 'DRAW',
};

export const KIND_VERB = {
  strike: 'hits',
  guard: 'shields',
  mend: 'heals',
  spark: 'draws',
};

// Resonance: a second card of a suit already played this turn gains +2.
export const RESONANCE_BONUS = 2;

// How long the AI waits between its moves, in milliseconds.
export const AI_THINK_MS = 650;
export const AI_PLAY_MS = 520;

// Animation timings, in milliseconds.
export const DEAL_STAGGER_MS = 90;
export const CARD_FLY_MS = 380;
export const FLIP_MS = 260;

export const AI_NAMES = ['Rival Ember', 'Cinder Fox', 'Storm Wren'];
