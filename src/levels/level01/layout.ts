/** World placement for Episode One. Y-up, One faces +Z (toward the camera). */
export const HOME = { x: -1.02, y: 0.02, z: 0.08 };
export const PAD = { x: 1.05, y: 0, z: -0.04 };
/** Suggested drop radius from the design doc, in world units. */
export const PAD_RADIUS = 0.9;

/**
 * FIND props, scaled in-engine toward the mood-board depth layers.
 * Flower sits in the foreground, the bee in the mid sky, the sun farther back.
 */
export const FIND_LAYOUT = {
  flower: { x: 0.15, y: 0, z: 1.58, scale: 1.55 },
  bee: { x: 0.62, y: 1.78, z: -0.48, scale: 1.18 },
  sun: { x: 1.92, y: 2.22, z: -1.32, scale: 0.58 },
} as const;

/** Dome hut, left and just behind One, doorway toward the camera. */
export const HUT = { x: -1.68, y: 0, z: -1.12, rotY: 0.15, scale: 1.72 };

type Decor = { x: number; y: number; z: number; rotY: number; scale: number };

/** Trees sit on the rim so they don't cover the pad or the FIND props. */
export const TREES: Decor[] = [
  { x: -3.35, y: 0, z: -1.55, rotY: 0.4, scale: 1.42 },
  { x: 3.25, y: 0, z: -1.25, rotY: -0.5, scale: 1.32 },
  { x: 0.35, y: 0, z: -3.6, rotY: 1.1, scale: 1.05 },
];

export const ROCKS: Decor[] = [
  { x: -1.72, y: 0, z: 1.12, rotY: 0.4, scale: 1.05 },
  { x: -1.85, y: 0, z: -0.72, rotY: 1.2, scale: 0.82 },
  { x: 1.78, y: 0, z: 1.28, rotY: 0.7, scale: 0.95 },
  { x: 2.2, y: 0, z: -0.48, rotY: 1.8, scale: 0.78 },
  { x: -0.72, y: 0, z: 1.48, rotY: 0.3, scale: 0.7 },
  { x: 1.42, y: 0, z: -1.48, rotY: 2.1, scale: 0.88 },
];

export const GRASS: Decor[] = [
  { x: -1.85, y: 0, z: 0.85, rotY: 0.4, scale: 1.7 },
  { x: -2.35, y: 0, z: 1.45, rotY: 1.2, scale: 1.45 },
  { x: -1.45, y: 0, z: 1.72, rotY: 0.6, scale: 1.35 },
  { x: -2.4, y: 0, z: -0.35, rotY: 2.0, scale: 1.55 },
  { x: -2.15, y: 0, z: -1.85, rotY: 0.8, scale: 1.6 },
  { x: 1.85, y: 0, z: 1.45, rotY: 0.5, scale: 1.5 },
  { x: 2.45, y: 0, z: 0.55, rotY: 1.4, scale: 1.35 },
  { x: 1.7, y: 0, z: -1.7, rotY: 0.3, scale: 1.4 },
  { x: 1.35, y: 0, z: 1.85, rotY: 0.2, scale: 1.25 },
  { x: -0.95, y: 0, z: 2.05, rotY: 1.1, scale: 1.45 },
  { x: 0.85, y: 0, z: 2.15, rotY: 0.7, scale: 1.3 },
  { x: -0.55, y: 0, z: -2.35, rotY: 2.2, scale: 1.35 },
  { x: 2.7, y: 0, z: -2.1, rotY: 0.9, scale: 1.2 },
  { x: -2.85, y: 0, z: 0.15, rotY: 1.6, scale: 1.25 },
];
