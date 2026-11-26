// Sky Courier — the heads-up display: instruments, mission panel and
// messages, all plain DOM over the 3D canvas.
import { headingDegrees, compassPoint } from './physics.js';
import { clamp } from './random.js';

let els = null;

/** Grab the HUD elements once the page exists. */
export function initHud() {
  els = {
    alt: document.getElementById('hud-alt'),
    speed: document.getElementById('hud-speed'),
    heading: document.getElementById('hud-heading'),
    compass: document.getElementById('hud-compass'),
    throttleFill: document.getElementById('hud-throttle-fill'),
    throttleVal: document.getElementById('hud-throttle-val'),
    fuelFill: document.getElementById('hud-fuel-fill'),
    fuelVal: document.getElementById('hud-fuel-val'),
    score: document.getElementById('hud-score'),
    mission: document.getElementById('hud-mission'),
    objective: document.getElementById('hud-objective'),
    rings: document.getElementById('hud-rings'),
    time: document.getElementById('hud-time'),
    message: document.getElementById('hud-message'),
    warn: document.getElementById('hud-warn'),
    horizon: document.getElementById('hud-horizon'),
    horizonBall: document.getElementById('hud-horizon-ball'),
    screen: document.getElementById('screen'),
    screenTitle: document.getElementById('screen-title'),
    screenText: document.getElementById('screen-text'),
    screenHint: document.getElementById('screen-hint'),
  };
  return els;
}

/** Per-frame instrument update from the flight state. */
export function updateHud(f, game) {
  if (!els) return;
  const alt = Math.max(0, Math.round(f.y * 3.28));
  const spd = Math.round(f.speed * 1.94);
  const deg = headingDegrees(f);
  els.alt.textContent = `${alt.toLocaleString('en-US')} ft`;
  els.speed.textContent = `${spd} kt`;
  els.heading.textContent = `${String(Math.round(deg)).padStart(3, '0')}°`;
  els.compass.textContent = compassPoint(deg);
  els.throttleFill.style.width = `${Math.round(f.throttle * 100)}%`;
  els.throttleVal.textContent = `${Math.round(f.throttle * 100)}%`;
  const fuelPct = Math.max(0, Math.round(f.fuel));
  els.fuelFill.style.width = `${fuelPct}%`;
  els.fuelVal.textContent = `${fuelPct}%`;
  els.fuelFill.classList.toggle('low', f.fuel < 25);
  els.score.textContent = game.score.toLocaleString('en-US');
  els.mission.textContent = game.mission.name;
  els.rings.textContent = `Rings ${game.ringsHit} / ${game.mission.rings.length}`;
  const t = Math.floor(game.elapsed);
  els.time.textContent = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  els.objective.textContent = game.ringsHit >= game.mission.rings.length
    ? 'Land on the runway to deliver the cargo'
    : `Fly through ring ${game.ringsHit + 1} of ${game.mission.rings.length}`;
  // Artificial horizon: the ball rolls with the plane and slides with pitch.
  const rollDeg = (-f.roll * 180) / Math.PI;
  const pitchPx = clamp(f.pitch * 90, -40, 40);
  els.horizonBall.style.transform = `translate(-50%, ${pitchPx}px) rotate(${rollDeg}deg)`;
  // Stall warning flashes when the wing is about to quit.
  const stalling = game.stallWarn;
  els.warn.style.display = stalling ? 'block' : 'none';
  if (stalling) els.warn.textContent = f.speed < 12 ? 'STALL — NOSE DOWN, THROTTLE UP' : 'LOW SPEED — ADD THROTTLE';
}

/** A centred message that fades after a couple of seconds. */
let messageTimer = 0;
export function showMessage(text, seconds = 2.4) {
  if (!els) return;
  els.message.textContent = text;
  els.message.style.opacity = '1';
  window.clearTimeout(messageTimer);
  messageTimer = window.setTimeout(() => {
    els.message.style.opacity = '0';
  }, seconds * 1000);
}

/** Full-screen overlay: title, mission complete, crash, pause. */
export function showScreen(title, text, hint) {
  if (!els) return;
  els.screenTitle.textContent = title;
  els.screenText.textContent = text;
  els.screenHint.textContent = hint;
  els.screen.style.display = 'flex';
}

/** Hide the full-screen overlay (flying). */
export function hideScreen() {
  if (!els) return;
  els.screen.style.display = 'none';
}
