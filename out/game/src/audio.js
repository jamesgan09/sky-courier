// Sky Courier — small synthesised sounds (WebAudio, no audio files).
// Engine hum follows the throttle; rings chime; landings thud.

/** Fresh audio state. Call `ensure` once after a user gesture. */
export function freshAudio() {
  return {
    ctx: null,
    engineOsc: null,
    engineGain: null,
    muted: false,
    started: false,
  };
}

/** Create the AudioContext and the looping engine tone (call on first input). */
export function ensureAudio(audio) {
  if (audio.ctx || typeof window === 'undefined') return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audio.ctx = new Ctx();
    audio.engineOsc = audio.ctx.createOscillator();
    audio.engineOsc.type = 'sawtooth';
    audio.engineOsc.frequency.value = 55;
    const filter = audio.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    audio.engineGain = audio.ctx.createGain();
    audio.engineGain.gain.value = 0;
    audio.engineOsc.connect(filter);
    filter.connect(audio.engineGain);
    audio.engineGain.connect(audio.ctx.destination);
    audio.engineOsc.start();
    audio.started = true;
  } catch {
    audio.ctx = null;
  }
}

/** Engine hum volume and pitch follow throttle and speed. */
export function updateEngine(audio, throttle, speed, onGround) {
  if (!audio.ctx || !audio.engineGain || !audio.engineOsc) return;
  const target = audio.muted ? 0 : onGround ? throttle * 0.02 : 0.015 + throttle * 0.05;
  audio.engineGain.gain.setTargetAtTime(target, audio.ctx.currentTime, 0.1);
  const freq = 48 + throttle * 55 + speed * 0.35;
  audio.engineOsc.frequency.setTargetAtTime(freq, audio.ctx.currentTime, 0.1);
}

/** One short tone (a chime, a thud, a warning). */
function blip(audio, freq, seconds, type, volume) {
  if (!audio.ctx || audio.muted) return;
  try {
    const osc = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, audio.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.ctx.currentTime + seconds);
    osc.connect(gain);
    gain.connect(audio.ctx.destination);
    osc.start();
    osc.stop(audio.ctx.currentTime + seconds);
  } catch {
    // Sound is garnish; never break the game.
  }
}

/** Two-note chime when the plane threads a ring. */
export function playRing(audio) {
  blip(audio, 660, 0.16, 'sine', 0.16);
  setTimeout(() => blip(audio, 990, 0.28, 'sine', 0.16), 90);
}

/** Low thud on a landing. */
export function playThud(audio) {
  blip(audio, 90, 0.25, 'triangle', 0.25);
}

/** Harsh buzz on a crash. */
export function playCrash(audio) {
  blip(audio, 70, 0.6, 'sawtooth', 0.22);
}

/** Bright arpeggio when a delivery is complete. */
export function playFanfare(audio) {
  [523, 659, 784, 1047].forEach((f, i) => {
    setTimeout(() => blip(audio, f, 0.3, 'sine', 0.15), i * 110);
  });
}

export function toggleMute(audio) {
  audio.muted = !audio.muted;
  if (audio.engineGain && audio.ctx) {
    audio.engineGain.gain.setTargetAtTime(audio.muted ? 0 : 0.03, audio.ctx.currentTime, 0.05);
  }
  return audio.muted;
}
