// Sky Courier — deterministic seeded randomness, so a seed always builds
// the same island and the same screenshot scenes.

/** mulberry32: a small seeded PRNG. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smoothstep between 0 and 1. */
export function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Linear interpolation. */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Clamp a value into [min, max]. */
export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

/**
 * Value noise over 2D: a grid of seeded heights, smoothly interpolated.
 * Cheap, deterministic, and good enough for rolling terrain.
 */
export function makeNoise2D(seed, cell) {
  const rand = mulberry32(seed);
  // A fixed grid of random values; wrap it so the island edges match.
  const size = 64;
  const grid = new Float32Array((size + 1) * (size + 1));
  for (let i = 0; i < grid.length; i += 1) grid[i] = rand() * 2 - 1;
  const at = (gx, gz) => grid[((gz % size) + size) % size * (size + 1) + ((gx % size) + size) % size];
  return function noise(x, z) {
    const fx = x / cell;
    const fz = z / cell;
    const gx = Math.floor(fx);
    const gz = Math.floor(fz);
    const tx = fx - gx;
    const tz = fz - gz;
    const sx = tx * tx * (3 - 2 * tx);
    const sz = tz * tz * (3 - 2 * tz);
    const a = at(gx, gz);
    const b = at(gx + 1, gz);
    const c = at(gx, gz + 1);
    const d = at(gx + 1, gz + 1);
    return lerp(lerp(a, b, sx), lerp(c, d, sx), sz);
  };
}
