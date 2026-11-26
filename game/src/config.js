// Sky Courier — shared tuning for the flight game.
// Units are metres-ish: speeds in m/s, altitudes in m, angles in radians.

export const WORLD = {
  // Island size (x and z span -SIZE/2 .. SIZE/2) and sea level.
  size: 2600,
  seaLevel: 0,
  // Fog and sky.
  fogNear: 500,
  fogFar: 2200,
  skyTop: 0x3f7ec2,
  skyBottom: 0xcfe8f5,
  seaColor: 0x1d6fb8,
  sunColor: 0xfff2d0,
  sunIntensity: 1.15,
  ambientIntensity: 0.55,
};

export const RUNWAY = {
  // A flat coastal shelf the runway sits on.
  centreX: 0,
  centreZ: -760,
  length: 520,
  width: 34,
  height: 7,
  // Heading along +X (east). Landing direction: from west to east.
  heading: Math.PI / 2,
};

export const PLANE = {
  // Arcade flight model.
  minSpeed: 0,
  cruiseSpeed: 46,
  maxSpeed: 96,
  stallSpeed: 26,
  // How fast speed chases its throttle target (per second).
  speedResponse: 0.55,
  // Pitch and roll rates (rad/s at full input).
  pitchRate: 0.85,
  rollRate: 1.7,
  maxPitchUp: 0.55,
  maxPitchDown: -0.5,
  maxRoll: 1.0,
  // Heading change while banked (rad/s per rad of roll, scaled by speed).
  turnRate: 1.3,
  // Extra sink when below stall speed (m/s per m/s short).
  stallSink: 0.55,
  // Fuel: percent per second at full throttle.
  fuelBurn: 0.55,
  fuelPerRing: 14,
  // Crash / landing tolerances.
  gearHeight: 2.2,
  landMaxSink: 4.5,
  landMaxRoll: 0.22,
  landMaxPitch: 0.2,
  landSpeedMax: 62,
};

export const RING = {
  radius: 18,
  tube: 1.6,
  // How close the plane's centre must pass to count (m).
  capture: 20,
};

// Three deliveries. Each is a route of rings then a landing back on the
// runway. Ring heights are floors: the game raises a ring above the terrain.
export const MISSIONS = [
  {
    name: 'Delivery 1 — Harbour Run',
    briefing: 'Carry the mail to the far bay. Thread the rings, then land on the runway.',
    rings: [
      { x: 320, y: 75, z: -560 },
      { x: 560, y: 95, z: -180 },
      { x: 380, y: 90, z: 260 },
      { x: -40, y: 100, z: 480 },
      { x: -420, y: 80, z: 180 },
    ],
  },
  {
    name: 'Delivery 2 — Mountain Pass',
    briefing: 'Medicine for the high village. Climb the pass, mind the peaks.',
    rings: [
      { x: 300, y: 110, z: -380 },
      { x: 560, y: 150, z: -80 },
      { x: 420, y: 180, z: 260 },
      { x: 120, y: 170, z: 560 },
      { x: -260, y: 130, z: 420 },
      { x: -520, y: 90, z: 60 },
    ],
  },
  {
    name: 'Delivery 3 — Storm Circuit',
    briefing: 'The long circuit, low fuel. Every ring tops the tank up.',
    rings: [
      { x: -480, y: 80, z: -480 },
      { x: -640, y: 120, z: 40 },
      { x: -380, y: 150, z: 480 },
      { x: 60, y: 130, z: 660 },
      { x: 520, y: 110, z: 420 },
      { x: 640, y: 90, z: -120 },
      { x: 320, y: 70, z: -560 },
    ],
  },
];

export const SCORE = {
  ring: 100,
  ringTimeBonus: 25,
  landing: 300,
  landingSoftBonus: 200,
  missionTimeBonus: 10,
};

export const SHOTS = {
  startSeconds: 4,
  playSeconds: 40,
  endLimitSeconds: 900,
};
