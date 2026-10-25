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
  flower: { x: 0.08, y: 0, z: 1.42, scale: 1.48 },
  bee: { x: 0.78, y: 1.95, z: -0.42, scale: 1.12 },
  sun: { x: 2.15, y: 2.42, z: -1.28, scale: 0.44 },
} as const;

/** Dome hut. Left of One, large enough that the doorway reads as a silhouette. */
export const HUT = { x: -2.2, y: 0, z: -1.45, rotY: 0.45, scale: 1.58 };

type Decor = { x: number; y: number; z: number; rotY: number; scale: number };

/** Trees sit on the rim so they don't cover the pad or the FIND props. */
export const TREES: Decor[] = [
  { x: -2.35, y: 0, z: -1.55, rotY: 0.5, scale: 1.08 },
  { x: -0.15, y: 0, z: -2.15, rotY: 1.1, scale: 0.92 },
  { x: 2.15, y: 0, z: -1.85, rotY: -0.4, scale: 1.02 },
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
  { x: -1.78, y: 0, z: 0.62, rotY: 0.4, scale: 1.15 },
  { x: -2.08, y: 0, z: 1.18, rotY: 1.2, scale: 1 },
  { x: -1.32, y: 0, z: 1.38, rotY: 0.6, scale: 0.9 },
  { x: -2.12, y: 0, z: -0.48, rotY: 2.0, scale: 1.05 },
  { x: -1.95, y: 0, z: -1.42, rotY: 0.8, scale: 1.1 },
  { x: 1.72, y: 0, z: 1.18, rotY: 0.5, scale: 1.05 },
  { x: 2.18, y: 0, z: 0.42, rotY: 1.4, scale: 0.85 },
  { x: 1.58, y: 0, z: -1.38, rotY: 0.3, scale: 0.95 },
  { x: 1.22, y: 0, z: 1.22, rotY: 0.2, scale: 0.82 },
  { x: -1.18, y: 0, z: 1.48, rotY: 1.1, scale: 0.92 },
  { x: 0.2, y: 0, z: -1.88, rotY: 0.7, scale: 1 },
  { x: -0.88, y: 0, z: -1.62, rotY: 2.2, scale: 0.85 },
];
