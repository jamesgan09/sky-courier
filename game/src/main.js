// Sky Courier — bootstrap: build the scene, wire input and audio, run the
// loop. ?shot=start|play|end stages a deterministic screenshot scene
// instead of the live game; &seed= picks the island (seed 1 is the game).
import { buildScene, renderFrame, resetChaseCamera } from './render.js';
import { freshWorld, buildMissionRings, stepWorld, startFlying, restartWorld, SCREEN_TITLE, SCREEN_PLAY, SCREEN_COMPLETE, SCREEN_OVER, SCREEN_PAUSED } from './world.js';
import { freshInput, bindInput, clearPressed } from './input.js';
import { freshAudio, ensureAudio, toggleMute } from './audio.js';
import { initHud, showScreen, hideScreen, updateHud } from './hud.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || '1');

initHud();
const built = buildScene(canvas);
const world = freshWorld();
buildMissionRings(world, built.scene);
const input = freshInput();
const audio = freshAudio();
let view = 'chase';
let paused = false;

const TITLE_TEXT = 'Deliver cargo across the islands. Thread the rings, then land on the runway.\n\nArrows fly · W/S throttle · C camera · M mute';
showScreen('Sky Courier', TITLE_TEXT, 'Press Enter to take off');
resetChaseCamera(world.flight);

function onAction(action) {
  ensureAudio(audio);
  if (action === 'camera') {
    view = view === 'chase' ? 'cockpit' : 'chase';
  } else if (action === 'mute') {
    toggleMute(audio);
  } else if (action === 'restart') {
    restartWorld(world, built.scene);
    resetChaseCamera(world.flight);
    paused = false;
  } else if (action === 'pause') {
    if (world.screen === SCREEN_PLAY) {
      paused = !paused;
      if (paused) showScreen('Paused', 'Take a breath. The sky will wait.', 'Press P to keep flying');
      else hideScreen();
    }
  } else if (action === 'confirm') {
    if (world.screen === SCREEN_TITLE) {
      startFlying(world, built.scene);
    } else if (world.screen === SCREEN_COMPLETE || world.screen === SCREEN_OVER) {
      restartWorld(world, built.scene);
      resetChaseCamera(world.flight);
      startFlying(world, built.scene);
    }
  }
}
bindInput(input, onAction);
window.addEventListener('pointerdown', () => ensureAudio(audio), { once: true });

// Screenshot mode: stage the scene once, render one frame, stop.
if (shot) {
  const staged = stageShot(shot, world, built.scene);
  // The full-screen overlay would hide the game in the shot, so the shot
  // shows the game bare with the HUD instruments live.
  hideScreen();
  updateHud(world.flight, world);
  // Render many frames: the chase camera eases toward the plane, and one
  // frame leaves it near the runway. 120 frames settle it behind the plane.
  for (let i = 0; i < 120; i += 1) renderFrame(built, world, 'chase', 1 / 60, i / 60);
  document.title = `Sky Courier — ${shot}`;
  // Debug hook: the render script reads the staged state from here.
  window.__sky = { world, staged: staged.screen, flight: world.flight };
} else {
  // Live game loop.
  let last = performance.now();
  let time = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;
    if (!paused && world.screen === SCREEN_PLAY) {
      stepWorld(world, built.scene, input, audio, dt);
    } else if (world.screen === SCREEN_TITLE) {
      // Idle drift: the plane sits on the runway, propeller idling.
      world.flight.throttle = 0.12;
    }
    renderFrame(built, world, view, dt, time);
    clearPressed(input);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
