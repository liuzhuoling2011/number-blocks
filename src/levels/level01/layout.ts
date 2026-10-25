/** World placement for Episode One. Y-up, One faces +Z (toward the camera). */
export const HOME = { x: -1.02, y: 0.02, z: 0.08 };
export const PAD = { x: 1.05, y: 0, z: -0.04 };
/** Suggested drop radius from the design doc, in world units. */
export const PAD_RADIUS = 0.9;

/** FIND props. These match the placed flower.glb / bee.glb / sun.glb. */
export const FIND_LAYOUT = {
  flower: { x: 0.28, y: 0, z: 1.42 },
  bee: { x: 0.06, y: 0.78, z: -1.02 },
  sun: { x: 1.08, y: 1.28, z: -1.32 },
} as const;

/** Dome hut. Behind-left of One, clear of the bee and the drag corridor. */
export const HUT = { x: -2.2, y: 0, z: -1.9, rotY: 0.4 };

type Decor = { x: number; y: number; z: number; rotY: number; scale: number };

/** Trees sit on the rim so they don't cover the pad or the FIND props. */
export const TREES: Decor[] = [
  { x: -2.35, y: 0, z: 0.15, rotY: 0.4, scale: 1 },
  { x: 2.55, y: 0, z: -0.85, rotY: -0.8, scale: 1.05 },
  { x: -1.35, y: 0, z: -2.25, rotY: 1.2, scale: 0.82 },
];

export const ROCKS: Decor[] = [
  { x: -1.58, y: 0, z: 0.95, rotY: 0.3, scale: 1.05 },
  { x: 2.15, y: 0, z: 1.15, rotY: 1.1, scale: 0.9 },
  { x: 1.4, y: 0, z: -1.95, rotY: 0.6, scale: 1.1 },
  { x: -0.85, y: 0, z: 1.85, rotY: 2.2, scale: 0.72 },
  { x: 2.25, y: 0, z: -1.2, rotY: 0.4, scale: 0.8 },
];

export const GRASS: Decor[] = [
  { x: -1.65, y: 0, z: 0.38, rotY: 0.4, scale: 1.15 },
  { x: -2.25, y: 0, z: 0.85, rotY: 1.5, scale: 0.9 },
  { x: -2.05, y: 0, z: -0.8, rotY: 2.2, scale: 1.05 },
  { x: -0.45, y: 0, z: 0.72, rotY: 0.2, scale: 0.8 },
  { x: 1.85, y: 0, z: 1.2, rotY: 0.9, scale: 1 },
  { x: 0.75, y: 0, z: -1.7, rotY: 2.5, scale: 0.85 },
  { x: -1.2, y: 0, z: 1.6, rotY: 0.7, scale: 1.1 },
  { x: 2.3, y: 0, z: -0.55, rotY: 1.6, scale: 0.75 },
  { x: 0.2, y: 0, z: -2.15, rotY: 0.5, scale: 0.95 },
];
