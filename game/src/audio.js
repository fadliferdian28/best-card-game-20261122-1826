// Ember Duel — sound, synthesized live with WebAudio. No audio files.
// One job: turn game events into short synth notes and whooshes.

let ctx = null;
let muted = false;

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

// Call once from any user gesture; browsers block audio before that.
export function unlockAudio() {
  const c = ensureCtx();
  if (c && c.state === 'suspended') c.resume();
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(freq, dur, type, gain, when = 0, slideTo = null) {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  click() { tone(660, 0.07, 'triangle', 0.12); },
  select() { tone(520, 0.08, 'sine', 0.14); tone(780, 0.09, 'sine', 0.10, 0.05); },
  deal() { tone(300, 0.12, 'triangle', 0.12, 0, 520); },
  playCard() { tone(440, 0.10, 'square', 0.10); tone(880, 0.14, 'triangle', 0.12, 0.07); },
  hit() { tone(180, 0.22, 'sawtooth', 0.16, 0, 70); },
  shield() { tone(320, 0.18, 'sine', 0.14, 0, 480); },
  heal() { tone(520, 0.16, 'sine', 0.12); tone(780, 0.22, 'sine', 0.12, 0.10); },
  draw() { tone(700, 0.09, 'triangle', 0.10, 0, 980); },
  resonance() { tone(880, 0.10, 'triangle', 0.14); tone(1174, 0.16, 'triangle', 0.14, 0.08); },
  turn() { tone(392, 0.12, 'triangle', 0.12); tone(523, 0.14, 'triangle', 0.12, 0.09); },
  win() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.28, 'triangle', 0.16, i * 0.13));
    tone(1318, 0.5, 'sine', 0.12, 0.55);
  },
  lose() {
    [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'sine', 0.14, i * 0.16));
  },
};
