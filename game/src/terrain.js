// Sky Courier — the island: terrain height, sea, sky, clouds, runway and rings.
// Everything is built from a seed, so the island is the same every run.
import * as THREE from 'three';
import { RUNWAY, WORLD, RING } from './config.js';
import { makeNoise2D, smoothstep, lerp, clamp } from './random.js';

const noiseA = makeNoise2D(1337, 340);
const noiseB = makeNoise2D(9241, 140);
const noiseC = makeNoise2D(555, 58);

/** A soft mountain bump centred at (cx, cz). */
function bump(x, z, cx, cz, radius, height) {
  const dx = (x - cx) / radius;
  const dz = (z - cz) / radius;
  const d2 = dx * dx + dz * dz;
  return d2 >= 1 ? 0 : height * (1 - d2) * (1 - d2);
}

/** Distance from a point to the runway rectangle (0 inside). */
function runwayDistance(x, z) {
  const dx = Math.max(Math.abs(x - RUNWAY.centreX) - RUNWAY.length / 2, 0);
  const dz = Math.max(Math.abs(z - RUNWAY.centreZ) - RUNWAY.width / 2, 0);
  return Math.hypot(dx, dz);
}

/**
 * Ground height at (x, z). The single source of truth: the mesh, the
 * collision checks and the ring placement all read it.
 */
export function heightAt(x, z) {
  const r = Math.hypot(x, z);
  // Island mask: full height inside, sinking to the sea outside.
  const mask = 1 - smoothstep(880, 1280, r);
  if (mask <= 0) return -6;
  let h = 14;
  h += 52 * noiseA(x, z);
  h += 20 * noiseB(x, z);
  h += 7 * noiseC(x, z);
  h += bump(x, z, 520, 120, 420, 150);
  h += bump(x, z, -480, 380, 360, 115);
  h += bump(x, z, 180, -420, 300, 60);
  h = Math.max(-6, h * mask + 2 * mask);
  // Flatten a shelf for the runway so landings are fair.
  const flat = 1 - smoothstep(0, 90, runwayDistance(x, z));
  return lerp(h, RUNWAY.height, flat);
}

/** True when (x, z) is over the runway strip. */
export function overRunway(x, z) {
  return (
    Math.abs(x - RUNWAY.centreX) <= RUNWAY.length / 2 &&
    Math.abs(z - RUNWAY.centreZ) <= RUNWAY.width / 2
  );
}

function groundColor(h, slope, x, z) {
  // Sand near the water, grass on the flats, rock on the steep, snow high.
  const sand = new THREE.Color(0xd8bf8a);
  const grassA = new THREE.Color(0x5d8a48);
  const grassB = new THREE.Color(0x7aa356);
  const rock = new THREE.Color(0x8a7d6e);
  const snow = new THREE.Color(0xeef3f6);
  const grass = grassA.clone().lerp(grassB, 0.5 + 0.5 * noiseB(x * 0.7, z * 0.7));
  let c;
  if (h < 3) c = sand.clone().lerp(grass, smoothstep(1.5, 3, h));
  else if (h < 48) c = grass;
  else if (h < 95) c = grass.clone().lerp(rock, smoothstep(48, 80, h));
  else c = rock.clone().lerp(snow, smoothstep(95, 130, h));
  // Steep ground shows rock whatever its height.
  if (slope > 0.55) c.lerp(rock, smoothstep(0.55, 0.9, slope));
  return c;
}

/** The island mesh with vertex-coloured terrain. */
export function buildTerrain() {
  const size = WORLD.size;
  const segments = 110;
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i);
    const h = heightAt(v.x, v.z);
    pos.setY(i, h);
    // Slope from a small forward sample.
    const ahead = heightAt(v.x + 6, v.z + 6);
    const slope = Math.abs(ahead - h) / 8.5;
    const c = groundColor(h, slope, v.x, v.z);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = false;
  return mesh;
}

/** The sea: one big flat plane just under the beaches. */
export function buildSea() {
  const geo = new THREE.PlaneGeometry(7000, 7000);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshPhongMaterial({
    color: WORLD.seaColor,
    shininess: 90,
    specular: 0x99ccff,
    transparent: true,
    opacity: 0.96,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = WORLD.seaLevel;
  return mesh;
}

/** A gradient sky dome (BackSide sphere with a tiny shader). */
export function buildSky() {
  const geo = new THREE.SphereGeometry(4200, 24, 12);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(WORLD.skyTop) },
      bottom: { value: new THREE.Color(WORLD.skyBottom) },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec3 vPos;
      uniform vec3 top;
      uniform vec3 bottom;
      void main() {
        float t = clamp(normalize(vPos).y * 1.6 + 0.18, 0.0, 1.0);
        gl_FragColor = vec4(mix(bottom, top, t), 1.0);
      }`,
  });
  return new THREE.Mesh(geo, mat);
}

/** The sun: a bright disc far up-sun, plus the directional light. */
export function buildSun() {
  const group = new THREE.Group();
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(90, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff6d8, fog: false }),
  );
  disc.position.set(1500, 1150, -2600);
  disc.lookAt(0, 0, 0);
  group.add(disc);
  const light = new THREE.DirectionalLight(WORLD.sunColor, WORLD.sunIntensity);
  light.position.set(900, 1200, -700);
  group.add(light);
  group.add(new THREE.AmbientLight(0xffffff, WORLD.ambientIntensity));
  return group;
}

/** Puffy clouds: flattened white spheres grouped into drifts. */
export function buildClouds(seed = 77) {
  const rand = makeNoise2D(seed, 90);
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.88 });
  for (let i = 0; i < 16; i += 1) {
    const cx = (rand(i * 13.7, 3.1) * 2 - 1) * 1100;
    const cz = (rand(5.9, i * 9.3) * 2 - 1) * 1100;
    const cy = 200 + Math.abs(rand(i, i)) * 140;
    const cloud = new THREE.Group();
    const puffs = 3 + Math.floor(Math.abs(rand(i * 2, 8)) * 3);
    for (let p = 0; p < puffs; p += 1) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(26 + Math.abs(rand(p, i)) * 26, 10, 8), mat);
      s.position.set((rand(p, i * 3) * 2 - 1) * 55, (rand(i, p) * 2 - 1) * 8, (rand(p * 2, i) * 2 - 1) * 30);
      s.scale.y = 0.45;
      cloud.add(s);
    }
    cloud.position.set(cx, cy, cz);
    group.add(cloud);
  }
  return group;
}

/** The runway: asphalt strip, centre line, thresholds, edge lights, windsock. */
export function buildRunway() {
  const group = new THREE.Group();
  const y = RUNWAY.height;
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(RUNWAY.length, 1.2, RUNWAY.width),
    new THREE.MeshLambertMaterial({ color: 0x3a3f46 }),
  );
  strip.position.set(RUNWAY.centreX, y - 0.4, RUNWAY.centreZ);
  group.add(strip);
  // Centre dashes.
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf5f5f0 });
  for (let x = -RUNWAY.length / 2 + 30; x < RUNWAY.length / 2 - 20; x += 42) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(22, 0.15, 2.2), dashMat);
    dash.position.set(RUNWAY.centreX + x, y + 0.3, RUNWAY.centreZ);
    group.add(dash);
  }
  // Threshold bars at both ends.
  for (const end of [-1, 1]) {
    for (let k = -2; k <= 2; k += 1) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(3, 0.15, 5), dashMat);
      bar.position.set(RUNWAY.centreX + end * (RUNWAY.length / 2 - 14), y + 0.3, RUNWAY.centreZ + k * 6);
      group.add(bar);
    }
  }
  // Edge lights: small amber domes down both sides.
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffb020 });
  for (let x = -RUNWAY.length / 2 + 10; x <= RUNWAY.length / 2 - 10; x += 52) {
    for (const side of [-1, 1]) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6), lightMat);
      lamp.position.set(RUNWAY.centreX + x, y + 0.8, RUNWAY.centreZ + side * (RUNWAY.width / 2 + 2));
      group.add(lamp);
    }
  }
  // Windsock on a pole beside the threshold.
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 14, 8),
    new THREE.MeshLambertMaterial({ color: 0xdddddd }),
  );
  pole.position.set(RUNWAY.centreX - RUNWAY.length / 2 + 8, y + 7, RUNWAY.centreZ - RUNWAY.width / 2 - 12);
  group.add(pole);
  const sock = new THREE.Mesh(
    new THREE.ConeGeometry(2.2, 9, 10, 1, true),
    new THREE.MeshLambertMaterial({ color: 0xff7f2a, side: THREE.DoubleSide }),
  );
  sock.rotation.z = Math.PI / 2;
  sock.position.set(RUNWAY.centreX - RUNWAY.length / 2 + 13, y + 13, RUNWAY.centreZ - RUNWAY.width / 2 - 12);
  group.add(sock);
  return group;
}

/**
 * A glowing ring gate. `active` makes it bright gold; later rings are dim
 * cyan. A faint vertical beam helps the pilot spot it from far away.
 */
export function buildRing(active) {
  const group = new THREE.Group();
  const color = active ? 0xffc233 : 0x35d0e0;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(RING.radius, RING.tube, 12, 40),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: active ? 1 : 0.75 }),
  );
  group.add(ring);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 260, 8, 1, true),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: active ? 0.16 : 0.07,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  beam.position.y = 0;
  group.add(beam);
  // A small centre dot so the ring reads even head-on.
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  group.add(dot);
  group.userData.baseColor = color;
  return group;
}

/** Clamp a ring's height so it always floats above the ground. */
export function ringPosition(ring) {
  const ground = heightAt(ring.x, ring.z);
  return { x: ring.x, y: Math.max(ring.y, ground + 26), z: ring.z };
}

export { clamp };
