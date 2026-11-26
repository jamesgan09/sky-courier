// Sky Courier — the game itself: screens, missions, rings and scoring.
// One World owns the flight state, the mission state and the score.
import { MISSIONS, SCORE, PLANE, RING } from './config.js';
import { freshFlight, stepFlight, forwardOf } from './physics.js';
import { buildRing, ringPosition, heightAt } from './terrain.js';
import { readFlightInput } from './input.js';
import { showMessage, showScreen, hideScreen, updateHud } from './hud.js';
import { playRing, playThud, playCrash, playFanfare, updateEngine } from './audio.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_COMPLETE = 'complete';
export const SCREEN_OVER = 'over';
export const SCREEN_PAUSED = 'paused';

/** Fresh game: mission 1, on the runway, title screen up. */
export function freshWorld() {
  return {
    flight: freshFlight(),
    missionIndex: 0,
    mission: MISSIONS[0],
    ringsHit: 0,
    ringGroups: [],
    score: 0,
    elapsed: 0,
    screen: SCREEN_TITLE,
    stallWarn: false,
    lastEvent: '',
    deliveries: 0,
    landingLeg: 0,
    // Landing quality of the last touchdown, for the score line.
    lastLanding: null,
  };
}

/** (Re)build the ring meshes for the current mission. */
export function buildMissionRings(world, scene) {
  for (const g of world.ringGroups) scene.remove(g);
  world.ringGroups = world.mission.rings.map((ring, i) => {
    const pos = ringPosition(ring);
    const group = buildRing(i === 0);
    group.position.set(pos.x, pos.y, pos.z);
    // Face the ring along the route so the pilot flies through it, not past.
    const next = world.mission.rings[i + 1];
    if (next) {
      const np = ringPosition(next);
      group.lookAt(np.x, np.y, np.z);
    } else {
      group.lookAt(0, pos.y, -760);
    }
    scene.add(group);
    return group;
  });
}

/** The next ring the pilot must thread (null when the route is done). */
export function nextRing(world) {
  return world.ringsHit < world.mission.rings.length
    ? ringPosition(world.mission.rings[world.ringsHit])
    : null;
}

/** Distance from the plane to a point. */
function distanceTo(f, p) {
  return Math.hypot(f.x - p.x, f.y - p.y, f.z - p.z);
}

/** Start flying from the title screen. */
export function startFlying(world, scene) {
  world.screen = SCREEN_PLAY;
  hideScreen();
  showMessage(world.mission.briefing, 3.2);
}

/** Advance to the next mission, or finish the game. */
function advanceMission(world, scene) {
  world.deliveries += 1;
  world.score += SCORE.landing + (world.lastLanding?.soft ? SCORE.landingSoftBonus : 0);
  world.score += Math.max(0, Math.round((600 - world.elapsed) * SCORE.missionTimeBonus / 60));
  if (world.missionIndex + 1 >= MISSIONS.length) {
    world.screen = SCREEN_COMPLETE;
    playFanfare(world.audio);
    showScreen(
      'All deliveries complete!',
      `Three cargoes delivered. Final score ${world.score.toLocaleString('en-US')}.`,
      'Press R to fly again',
    );
    return;
  }
  world.missionIndex += 1;
  world.mission = MISSIONS[world.missionIndex];
  world.ringsHit = 0;
  world.elapsed = 0;
  buildMissionRings(world, scene);
  world.flight = freshFlight();
  showScreen(
    world.mission.name,
    world.mission.briefing,
    'Press Enter to take off',
  );
  world.screen = SCREEN_TITLE;
}

/** Crash the plane: game over screen, score kept for the retry. */
function crash(world, reason) {
  world.screen = SCREEN_OVER;
  playCrash(world.audio);
  const text = reason === 'crashed-sea'
    ? 'Ditched in the sea. The cargo is soaked, the plane is not.'
    : 'Crashed into the terrain. The cargo survived; the plane did not.';
  showScreen('Crashed', `${text} Score ${world.score.toLocaleString('en-US')}.`, 'Press R to try again');
}

/**
 * One frame of the game. `input` is the keyboard state, `audio` the sound
 * state, `dt` the frame time in seconds. Returns the screen to render.
 */
export function stepWorld(world, scene, input, audio, dt) {
  world.audio = audio;
  if (world.screen === SCREEN_PLAY) {
    world.elapsed += dt;
    const flightInput = readFlightInput(input);
    const event = stepFlight(world.flight, flightInput, dt, world.ringsHit >= world.mission.rings.length);
    world.lastEvent = event;
    const f = world.flight;

    // Ring capture: close enough to the next ring's centre.
    const target = nextRing(world);
    if (target && distanceTo(f, target) <= RING.capture) {
      world.ringsHit += 1;
      world.score += SCORE.ring;
      f.fuel = Math.min(100, f.fuel + 14);
      playRing(audio);
      showMessage(
        world.ringsHit >= world.mission.rings.length
          ? 'Route complete — land on the runway!'
          : `Ring ${world.ringsHit} of ${world.mission.rings.length} — +100`,
      );
      // Light the next ring gold, dim the one just flown.
      world.ringGroups.forEach((g, i) => {
        const active = i === world.ringsHit;
        g.children[0].material.color.setHex(active ? 0xffc233 : 0x35d0e0);
        g.children[0].material.opacity = active ? 1 : 0.6;
      });
    }

    // Stall warning when the wing is about to quit.
    world.stallWarn = !f.onGround && f.speed < 30;

    if (event === 'landed') {
      const soft = Math.abs(f.verticalSpeed) < 2.5;
      world.lastLanding = { soft };
      playThud(audio);
      showMessage(soft ? 'Butter-smooth landing! +500' : 'Delivered! +300');
      advanceMission(world, scene);
    } else if (event === 'touchdown') {
      f.fuel = 100;
      playThud(audio);
      showMessage('Refuel stop — tank full, throttle up to take off again');
    } else if (event === 'crashed-terrain' || event === 'crashed-sea') {
      crash(world, event);
    }
    updateEngine(audio, f.throttle, f.speed, f.onGround);
  }
  updateHud(world.flight, world);
  return world.screen;
}

/** Restart from scratch (mission 1, score 0). */
export function restartWorld(world, scene) {
  const fresh = freshWorld();
  Object.assign(world, fresh);
  buildMissionRings(world, scene);
  showScreen(
    'Sky Courier',
    'Deliver cargo across the islands. Thread the rings, then land on the runway.\n\nArrows fly · W/S throttle · C camera · M mute',
    'Press Enter to take off',
  );
}

/** The plane's position for the camera, and where it looks. */
export function cameraTargets(world) {
  const f = world.flight;
  const fw = forwardOf(f);
  return {
    position: { x: f.x, y: f.y, z: f.z },
    forward: fw,
    heading: f.heading,
    pitch: f.pitch,
    roll: f.roll,
  };
}

export { heightAt };
