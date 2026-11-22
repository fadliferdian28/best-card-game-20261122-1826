// Ember Duel — the rival's brain: readable, counterable choices.
// One job: given the rival's hand, mana and the board, pick a card to play.
// The rival announces its pick (its "intent") before it plays, so the player
// can read it and answer with a guard or a heal.

import { effectiveValue } from './deck.js';

// Score one candidate play. Lethal wins outright; otherwise damage is worth
// the most, a guard is worth more when the rival is hurt, and a heal is worth
// more when the rival is low. Drawing is worth more with a thin hand.
export function scorePlay(card, me, foe, suitsPlayed) {
  const value = effectiveValue(card, suitsPlayed);
  if (card.kind === 'strike') {
    if (value >= foe.life + foe.shield) return 1000;
    return value * 10 - card.cost;
  }
  if (card.kind === 'guard') {
    const danger = Math.max(0, 12 - me.life);
    return value * 4 + danger - card.cost;
  }
  if (card.kind === 'mend') {
    const hurt = Math.max(0, 20 - me.life);
    return Math.min(value, hurt) * 6 - card.cost;
  }
  // spark: draw
  return handIsThin(me) ? value * 6 : value * 2 - card.cost;
}

function handIsThin(me) {
  return me.hand.length <= 2;
}

// Choose the rival's next card, or null when it should pass.
// Returns { card, index } into the rival's hand, or null.
export function chooseCard(me, foe, suitsPlayed) {
  let best = null;
  let bestScore = 0;
  me.hand.forEach((card, index) => {
    if (card.cost > me.mana) return;
    const score = scorePlay(card, me, foe, suitsPlayed);
    if (score > bestScore) {
      bestScore = score;
      best = { card, index };
    }
  });
  return best;
}

// A one-line, human-readable description of what the rival is about to do.
// Shown on the table as its intent before the card flips over.
export function intentText(pick, me, foe, suitsPlayed) {
  if (!pick) return 'Rival passes.';
  const value = effectiveValue(pick.card, suitsPlayed);
  const suitWord = pick.card.suit.toUpperCase();
  if (pick.card.kind === 'strike') return `Rival plans ${suitWord} strike ${value}!`;
  if (pick.card.kind === 'guard') return `Rival raises ${value} shield.`;
  if (pick.card.kind === 'mend') return `Rival mends ${value} life.`;
  return `Rival draws ${value} cards.`;
}
