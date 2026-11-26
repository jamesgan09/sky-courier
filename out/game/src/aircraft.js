// Sky Courier — the cargo plane, built from primitives so it reads as a
// built aircraft, not a drawing. Nose points along local +Z.
import * as THREE from 'three';

const ORANGE = 0xe8641b;
const CREAM = 0xf3ead8;
const DARK = 0x2e3438;
const GLASS = 0x9fd4e8;

function lambert(color) {
  return new THREE.MeshLambertMaterial({ color });
}

/** Build the plane group. Returns { group, propeller, wheels }. */
export function buildAircraft() {
  const group = new THREE.Group();

  // Fuselage: a tapered tube along Z, nose at +Z.
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.1, 7.2, 12), lambert(ORANGE));
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.z = 0.4;
  group.add(fuselage);

  // Nose cone.
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.2, 12), lambert(CREAM));
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 5.1;
  group.add(nose);

  // Cockpit canopy: a glass half-dome on top of the fuselage.
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(1.15, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhongMaterial({ color: GLASS, shininess: 120, specular: 0xffffff }),
  );
  canopy.scale.set(0.95, 0.75, 1.7);
  canopy.position.set(0, 0.9, 2.4);
  group.add(canopy);

  // Main wing: one wide slab, slightly swept, with cream tips.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(13.5, 0.28, 2.6), lambert(CREAM));
  wing.position.set(0, -0.15, 1.2);
  group.add(wing);
  for (const side of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 2.6), lambert(ORANGE));
    tip.position.set(side * 6.4, -0.15, 1.2);
    group.add(tip);
  }

  // Tail: horizontal stabiliser and a tall fin.
  const stabiliser = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.22, 1.7), lambert(CREAM));
  stabiliser.position.set(0, 0.25, -3.4);
  group.add(stabiliser);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.6, 2.2), lambert(ORANGE));
  fin.position.set(0, 1.3, -3.5);
  group.add(fin);

  // Propeller: a hub and two blades, spun by the render loop.
  const propeller = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.7, 10), lambert(DARK));
  hub.rotation.x = Math.PI / 2;
  propeller.add(hub);
  for (const a of [0, Math.PI]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.6, 0.16), lambert(DARK));
    blade.position.y = 0;
    const holder = new THREE.Group();
    holder.rotation.z = a;
    holder.add(blade);
    blade.position.y = 2.1;
    propeller.add(holder);
  }
  propeller.position.z = 6.4;
  group.add(propeller);

  // Landing gear: two wheels and a tail wheel.
  const wheels = [];
  for (const side of [-1, 1]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.6, 6), lambert(DARK));
    strut.position.set(side * 1.5, -1.3, 1.6);
    group.add(strut);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 12), lambert(0x1a1d1f));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(side * 1.5, -2.1, 1.6);
    group.add(wheel);
    wheels.push(wheel);
  }
  const tailWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.25, 10), lambert(0x1a1d1f));
  tailWheel.rotation.z = Math.PI / 2;
  tailWheel.position.set(0, -1.2, -3.4);
  group.add(tailWheel);
  wheels.push(tailWheel);

  // Navigation lights: red port, green starboard, white tail.
  const navLights = [];
  for (const [x, color] of [[-6.9, 0xff2222], [6.9, 0x22ff66]]) {
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 8, 6),
      new THREE.MeshBasicMaterial({ color }),
    );
    lamp.position.set(x, -0.15, 1.2);
    group.add(lamp);
    navLights.push(lamp);
  }

  group.traverse((obj) => {
    if (obj.isMesh) obj.castShadow = false;
  });
  return { group, propeller, wheels, navLights };
}
