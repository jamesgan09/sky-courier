// Sky Courier — the screenshot scenes behind ?shot=start|play|end.
// Each one plays the real rules forward from a fresh world for a fixed
// number of steps, steered by a simple autopilot, so the frame is what a
// short game really looks like and the same seed always gives the same frame.
import { SHOTS, RING } from './config.js';
import { stepFlight, forwardOf } from './physics.js';
import { nextRing } from './world.js';
import { heightAt } from './terrain.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_COMPLETE, SCREEN_OVER } from './world.js';

const STEP = 1 / 60;

/**
 * Autopilot: steer toward the next ring (or the runway when the route is
 * done), like a calm pilot. Returns { pitch, roll, throttle } for the step.
 * It climbs straight ahead after take-off before turning, so it never
 * banks hard into a hillside at low altitude.
 */
export function autopilot(world) {
  const f = world.flight;
  const target = nextRing(world);
  let tx;
  let ty;
  let tz;
  if (target) {
    tx = target.x;
    ty = target.y;
    tz = target.z;
  } else {
    // Route done: straight-in approach down the runway. The target is far
    // down the strip so the plane flies the centreline and settles on it,
    // instead of chasing a point and banking over the asphalt.
    tx = 200;
    ty = 9;
    tz = -760;
  }
  const dx = tx - f.x;
  const dy = ty - f.y;
  const dz = tz - f.z;
  const dist = Math.hypot(dx, dz);
  // Take-off climb: below a safe height, fly straight and climb. Only
  // while flying to a ring — on final approach the plane must descend.
  const climbingOut = target && (f.onGround || f.y < 80);
  const wantHeading = climbingOut ? f.heading : Math.atan2(dx, dz);
  let headingErr = wantHeading - f.heading;
  while (headingErr > Math.PI) headingErr -= Math.PI * 2;
  while (headingErr < -Math.PI) headingErr += Math.PI * 2;
  let wantPitch = Math.max(-0.4, Math.min(0.45, Math.atan2(dy, Math.max(20, dist))));
  // Climb decisively when well below the target.
  if (dy > 25) wantPitch = Math.max(wantPitch, 0.32);
  if (climbingOut) wantPitch = Math.max(wantPitch, 0.3);
  // Flare: on final approach, descend firmly while far out, then level
  // off near the runway so the sink rate drops under the landing limit.
  if (!target && dist > 250) wantPitch = Math.min(wantPitch, -0.18);
  if (!target && dist <= 250) wantPitch = Math.max(wantPitch, -0.04);
  // Terrain following: never fly into a hill. Look ahead and climb hard
  // when the ground rises above a safe clearance. Only en route to a ring:
  // on final approach the runway shelf is flat and the plane must descend.
  const fw = forwardOf(f);
  const aheadX = f.x + fw.x * 90;
  const aheadZ = f.z + fw.z * 90;
  const safeAlt = heightAt(aheadX, aheadZ) + 35;
  if (target && f.y < safeAlt) wantPitch = Math.max(wantPitch, 0.42);
  const pitch = Math.max(-1, Math.min(1, (wantPitch - f.pitch) * 3));
  // Bank into the turn; ease off when lined up. No banking while climbing
  // out. The bank is capped gentle: a steep bank reads as out of control.
  const roll = climbingOut ? 0 : Math.max(-0.5, Math.min(0.5, headingErr * 1.6));
  // Throttle: full when climbing or far, gentle on final approach.
  let throttle = 0.7;
  if (!target) throttle = 0.4;
  if (!target && dist < 200) throttle = 0.35;
  // Slow down near a ring so the turn tightens and the pass is precise.
  if (target && dist < 250) throttle = 0.45;
  if (dy > 40) throttle = 1;
  if (target && f.y < safeAlt) throttle = 1;
  if (f.onGround && target) throttle = 1;
  return { pitch, roll, throttle: (throttle - f.throttle) * 2 };
}

/**
 * Run the world forward by `seconds` of game time under the autopilot.
 * Returns the event the run ended with ('' when it just ran out of time).
 */
export function runAutopilot(world, scene, seconds) {
  let event = '';
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const input = autopilot(world);
    event = stepFlight(world.flight, input, STEP, world.ringsHit >= world.mission.rings.length);
    world.elapsed += STEP;
    // Ring capture, as in the live game.
    const target = nextRing(world);
    if (target) {
      const d = Math.hypot(
        world.flight.x - target.x,
        world.flight.y - target.y,
        world.flight.z - target.z,
      );
      if (d <= RING.capture) {
        world.ringsHit += 1;
        world.score += 100;
        world.flight.fuel = Math.min(100, world.flight.fuel + 14);
      }
    }
    if (event === 'landed' || event === 'crashed-terrain' || event === 'crashed-sea') break;
  }
  return event;
}

/**
 * Set `world` to the named scene (start, play or end; any other name is
 * start) and return the screen to draw over it.
 */
export function stageShot(name, world, scene) {
  if (name === 'play') {
    runAutopilot(world, scene, SHOTS.playSeconds);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'end') {
    // Stage a landing: the route is flown, the plane is lined up west of
    // the runway on the centreline, and the autopilot flies it straight in.
    // A full mission run is too long and unreliable for one frame; the
    // landing itself is real physics, flown by the same autopilot.
    world.ringsHit = world.mission.rings.length;
    world.score = 500;
    const f = world.flight;
    f.x = -300;
    f.y = 40;
    f.z = -760;
    f.heading = Math.PI / 2;
    f.pitch = 0;
    f.roll = 0;
    f.speed = 42;
    f.throttle = 0.4;
    f.fuel = 80;
    f.onGround = false;
    world.landingLeg = 0;
    const event = runAutopilot(world, scene, 120);
    if (event === 'landed') return { screen: SCREEN_COMPLETE };
    return { screen: SCREEN_OVER };
  }
  // Start: a short taxi down the runway, title screen over it.
  runAutopilot(world, scene, SHOTS.startSeconds);
  return { screen: SCREEN_TITLE };
}

export { forwardOf };
