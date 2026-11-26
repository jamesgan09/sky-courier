// Sky Courier — the arcade flight model. One step per frame: throttle,
// pitch and roll from the pilot, then speed, heading, lift and sink.
import { PLANE, RUNWAY } from './config.js';
import { heightAt, overRunway } from './terrain.js';
import { clamp, lerp } from './random.js';

/** Fresh flight state, parked on the runway threshold, facing east. */
export function freshFlight() {
  return {
    x: RUNWAY.centreX - RUNWAY.length / 2 + 40,
    y: RUNWAY.height + PLANE.gearHeight,
    z: RUNWAY.centreZ,
    heading: RUNWAY.heading,
    pitch: 0,
    roll: 0,
    speed: 0,
    throttle: 0,
    fuel: 100,
    onGround: true,
    verticalSpeed: 0,
  };
}

/** Forward direction from heading and pitch (nose along local +Z). */
export function forwardOf(f) {
  return {
    x: Math.sin(f.heading) * Math.cos(f.pitch),
    y: Math.sin(f.pitch),
    z: Math.cos(f.heading) * Math.cos(f.pitch),
  };
}

/**
 * Step the flight model by dt seconds.
 * input: { pitch: -1..1 (up positive), roll: -1..1, throttle: -1..1 delta }
 * Returns an event string: '' | 'stall' | 'crashed-terrain' | 'crashed-sea'
 *   | 'landed' | 'touchdown' (a refuel stop before the route is done).
 * `routeDone` tells the model a landing now counts as a delivery.
 */
export function stepFlight(f, input, dt, routeDone) {
  // Throttle: W/S move it, it stays where the pilot leaves it.
  f.throttle = clamp(f.throttle + input.throttle * dt * 0.9, 0, 1);

  // Pitch and roll chase the pilot's input.
  const pitchTarget = clamp(input.pitch * PLANE.maxPitchUp, PLANE.maxPitchDown, PLANE.maxPitchUp);
  const rollTarget = input.roll * PLANE.maxRoll;
  f.pitch += clamp(pitchTarget - f.pitch, -PLANE.pitchRate * dt, PLANE.pitchRate * dt);
  f.roll += clamp(rollTarget - f.roll, -PLANE.rollRate * dt, PLANE.rollRate * dt);

  // Banking turns the heading; the turn tightens with speed. Positive roll
  // is a bank to the right (left wing up), which turns the nose right.
  f.heading += f.roll * PLANE.turnRate * (0.35 + 0.65 * (f.speed / PLANE.maxSpeed)) * dt;

  // Speed chases the throttle target; climbing bleeds speed, diving gains it.
  const target = PLANE.minSpeed + f.throttle * (PLANE.maxSpeed - PLANE.minSpeed);
  let speed = f.speed + (target - f.speed) * Math.min(1, PLANE.speedResponse * dt);
  speed -= Math.sin(f.pitch) * 14 * dt;
  speed = Math.max(0, speed);
  f.speed = speed;

  // Move along the nose.
  const fw = forwardOf(f);
  const prevY = f.y;
  f.x += fw.x * speed * dt;
  f.y += fw.y * speed * dt;
  f.z += fw.z * speed * dt;

  // Below stall speed the wing stops flying and the plane sinks.
  if (speed < PLANE.stallSpeed && !f.onGround) {
    f.y -= (PLANE.stallSpeed - speed) * PLANE.stallSink * dt;
  }
  f.verticalSpeed = (f.y - prevY) / Math.max(dt, 1e-6);

  // Fuel burns with throttle; empty tanks mean no thrust.
  if (f.throttle > 0 && f.fuel > 0) {
    f.fuel = Math.max(0, f.fuel - PLANE.fuelBurn * (0.25 + 0.75 * f.throttle) * dt);
    if (f.fuel <= 0) f.throttle = 0;
  }

  // Ditching in the sea.
  if (f.y <= 0.4) return 'crashed-sea';

  // Ground contact. The epsilon keeps a parked plane (clearance exactly
  // gearHeight) from reading as airborne for one frame and then "arriving"
  // with a stall sink it never had.
  const ground = heightAt(f.x, f.z);
  const clearance = f.y - ground;
  if (clearance <= PLANE.gearHeight + 0.1) {
    if (!f.onGround) {
      // Arriving from the air: a landing, a rough stop, or a crash.
      const sink = -f.verticalSpeed;
      const gentle = sink <= PLANE.landMaxSink;
      const level = Math.abs(f.roll) <= PLANE.landMaxRoll && Math.abs(f.pitch) <= PLANE.landMaxPitch;
      const slowEnough = speed <= PLANE.landSpeedMax;
      if (overRunway(f.x, f.z) && gentle && level && slowEnough) {
        f.y = RUNWAY.height + PLANE.gearHeight;
        f.onGround = true;
        f.pitch = 0;
        f.roll = 0;
        return routeDone ? 'landed' : 'touchdown';
      }
      // A slow, gentle arrival on rough ground is a rough stop, not a crash.
      if (speed <= 8 && sink <= PLANE.landMaxSink) {
        f.y = ground + PLANE.gearHeight;
        f.onGround = true;
        return '';
      }
      return 'crashed-terrain';
    }
    // Already on the ground: taxiing. Rotation at speed lifts off.
    if (speed > PLANE.stallSpeed && f.pitch > 0.12) {
      f.onGround = false;
      return '';
    }
    f.y = ground + PLANE.gearHeight;
    return '';
  }
  f.onGround = false;
  return speed < PLANE.stallSpeed && f.y < ground + 12 ? 'stall' : '';
}

/** Heading in degrees, 0 = north (+Z), 90 = east (+X). */
export function headingDegrees(f) {
  const deg = (f.heading * 180) / Math.PI;
  return ((deg % 360) + 360) % 360;
}

/** Compass point for a heading in degrees. */
export function compassPoint(deg) {
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return points[Math.round(deg / 45) % 8];
}

export { lerp };
