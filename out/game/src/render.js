// Sky Courier — the 3D view: scene, chase and cockpit cameras, and the
// per-frame render. The camera never fights the pilot: it trails the plane
// smoothly and levels with the horizon, not with the bank.
import * as THREE from 'three';
import { WORLD } from './config.js';
import { buildTerrain, buildSea, buildSky, buildSun, buildClouds, buildRunway } from './terrain.js';
import { buildAircraft } from './aircraft.js';
import { forwardOf } from './physics.js';
import { SCREEN_TITLE, SCREEN_PLAY } from './world.js';

/** Build the whole scene once. Returns { scene, camera, renderer, plane }. */
export function buildScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfe0ea, WORLD.fogNear, WORLD.fogFar);
  scene.add(buildSky());
  scene.add(buildSun());
  scene.add(buildTerrain());
  scene.add(buildSea());
  scene.add(buildClouds());
  scene.add(buildRunway());

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 9000);
  camera.position.set(-40, 40, -820);

  const plane = buildAircraft();
  scene.add(plane.group);

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', onResize);

  return { scene, camera, renderer, plane, onResize };
}

/** Chase camera: behind and above the plane, eased toward its spot. */
const chasePos = new THREE.Vector3(-40, 40, -820);
const chaseLook = new THREE.Vector3(0, 10, -760);

function updateChaseCamera(camera, f, dt) {
  const fw = forwardOf(f);
  // Desired spot: 20 m behind, 7 m above the plane's line of flight.
  const want = new THREE.Vector3(
    f.x - fw.x * 20,
    f.y - fw.y * 20 + 7,
    f.z - fw.z * 20,
  );
  // Never let the camera sink into the ground.
  const ground = 12;
  if (want.y < ground) want.y = ground;
  const k = 1 - Math.exp(-dt * 3.2);
  chasePos.lerp(want, k);
  camera.position.copy(chasePos);
  const lookWant = new THREE.Vector3(f.x + fw.x * 14, f.y + fw.y * 14 + 1, f.z + fw.z * 14);
  chaseLook.lerp(lookWant, 1 - Math.exp(-dt * 5));
  camera.lookAt(chaseLook);
  // A touch of the bank, so the horizon tilts but never spins. rotateZ
  // spins the camera around its own view axis (after lookAt), which is
  // what tilts the horizon without moving the plane out of frame.
  camera.rotateZ(f.roll * 0.12);
}

/** Cockpit camera: at the canopy, looking down the nose. */
function updateCockpitCamera(camera, f) {
  const fw = forwardOf(f);
  camera.position.set(f.x + fw.x * 1.5, f.y + 1.1, f.z + fw.z * 1.5);
  camera.lookAt(f.x + fw.x * 60, f.y + fw.y * 60, f.z + fw.z * 60);
  camera.rotateZ(f.roll * 0.35);
}

/**
 * Render one frame. `view` is 'chase' or 'cockpit'. The propeller spins
 * with throttle, and the plane group follows the flight state.
 */
export function renderFrame(built, world, view, dt, time) {
  const { scene, camera, renderer, plane } = built;
  const f = world.flight;
  plane.group.position.set(f.x, f.y, f.z);
  plane.group.rotation.order = 'YXZ';
  plane.group.rotation.y = f.heading;
  plane.group.rotation.x = f.pitch;
  plane.group.rotation.z = f.roll;
  // Propeller spin follows throttle; it idles slowly on the ground.
  const spin = (2 + f.throttle * 38) * dt;
  plane.propeller.rotation.z += spin;
  // Navigation lights blink.
  const blink = Math.sin(time * 4) > 0;
  plane.navLights.forEach((lamp) => {
    lamp.visible = blink;
  });
  // Rings slowly turn so their glow catches the eye.
  for (const g of world.ringGroups) {
    g.rotation.z += dt * 0.15;
  }
  if (view === 'cockpit') updateCockpitCamera(camera, f);
  else updateChaseCamera(camera, f, dt);
  renderer.render(scene, camera);
}

/** Park the chase camera for the title screen (plane on the runway). */
export function resetChaseCamera(f) {
  const fw = forwardOf(f);
  chasePos.set(f.x - fw.x * 20, f.y + 7, f.z - fw.z * 20);
  chaseLook.set(f.x + fw.x * 14, f.y + 1, f.z + fw.z * 14);
}

export { SCREEN_TITLE, SCREEN_PLAY };
