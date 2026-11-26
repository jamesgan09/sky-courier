// Sky Courier — keyboard (and mouse) input. Arrow keys fly the plane,
// W/S work the throttle, C switches the camera, M mutes, R restarts.

/** Fresh input state: every key up, no mouse steering. */
export function freshInput() {
  return {
    keys: new Set(),
    mouseX: 0,
    mouseActive: false,
    // Edge-triggered actions, consumed by the game loop each frame.
    pressed: new Set(),
  };
}

/**
 * Wire the listeners. Returns a cleanup function. `onAction` is called for
 * one-shot keys (camera, mute, restart, pause) with the key name.
 */
export function bindInput(input, onAction) {
  const down = (e) => {
    const gameKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '];
    if (gameKeys.includes(e.key)) e.preventDefault();
    if (!input.keys.has(e.key)) input.pressed.add(e.key);
    input.keys.add(e.key);
    if (e.key === 'c' || e.key === 'C') onAction('camera');
    if (e.key === 'm' || e.key === 'M') onAction('mute');
    if (e.key === 'r' || e.key === 'R') onAction('restart');
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') onAction('pause');
    if (e.key === 'Enter') onAction('confirm');
  };
  const up = (e) => {
    input.keys.delete(e.key);
  };
  const blur = () => {
    input.keys.clear();
  };
  const mouse = (e) => {
    input.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    input.mouseActive = true;
  };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', blur);
  window.addEventListener('mousemove', mouse);
  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    window.removeEventListener('blur', blur);
    window.removeEventListener('mousemove', mouse);
  };
}

const has = (input, ...keys) => keys.some((k) => input.keys.has(k));

/**
 * Read the current flight input from the keys.
 * Pitch: ArrowDown pulls up, ArrowUp pushes down (stick convention).
 * Roll: ArrowLeft/Right bank. Throttle: W up, S down.
 */
export function readFlightInput(input) {
  let pitch = 0;
  if (has(input, 'ArrowDown')) pitch += 1;
  if (has(input, 'ArrowUp')) pitch -= 1;
  let roll = 0;
  if (has(input, 'ArrowLeft')) roll -= 1;
  if (has(input, 'ArrowRight')) roll += 1;
  // Gentle mouse steering: holding the mouse off-centre banks the plane.
  if (input.mouseActive && Math.abs(input.mouseX) > 0.25) {
    roll += input.mouseX * 0.7;
  }
  let throttle = 0;
  if (has(input, 'w', 'W')) throttle += 1;
  if (has(input, 's', 'S')) throttle -= 1;
  return { pitch, roll: Math.max(-1, Math.min(1, roll)), throttle };
}

/** Drain the edge-triggered presses after the game loop reads them. */
export function clearPressed(input) {
  input.pressed.clear();
}
