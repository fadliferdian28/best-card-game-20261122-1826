// Ember Duel — screenshot states: ?shot=start | play | win | loss.
// One job: put the game into a fixed, photogenic state for the screenshots.
// Seeded deals make every shot reproducible; nothing here affects normal play.

import { createGame } from './main.js';

const canvas = document.getElementById('game');
canvas.width = 1280;
canvas.height = 720;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || 7);

const game = createGame(canvas);
window.__ember = game;

if (shot === 'play') {
  game.startDuel(seed);
  game.player.life = 14;
  game.rival.life = 17;
  game.rival.shield = 3;
  game.player.mana = 5;
  game.player.maxMana = 5;
  game.turn = 4;
  game.score = 23;
  game.selected = 1;
  game.intent = 'Rival plans FLAME strike 5!';
  const played = game.player.hand[0];
  game.lastPlayed = {
    card: played,
    value: 5,
    resonant: false,
    text: `You played ${played.name} (5)`,
  };
  game.logLine = `You played ${played.name} (5). Resonance is ready on Flame.`;
  game.banner = null;
  game.dealAnim = [];
} else if (shot === 'win') {
  game.startDuel(seed);
  game.turn = 7;
  game.forceEnd(true);
  game.score = 187;
  game.dealAnim = [];
} else if (shot === 'loss') {
  game.startDuel(seed);
  game.turn = 6;
  game.forceEnd(false);
  game.score = 41;
  game.dealAnim = [];
}
// No ?shot= : the title screen, ready for a human to play.
