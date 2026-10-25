/** World placement for Episode One. Y-up, One faces +Z (toward the camera). */
export const HOME = { x: -1.02, y: 0.02, z: 0.08 };
export const PAD = { x: 1.05, y: 0, z: -0.04 };
/** Suggested drop radius from the design doc, in world units. */
export const PAD_RADIUS = 0.9;

/**
 * FIND stand-ins. Spread so a phone-width stage frame can tap all three
 * without covering One or the pad. Replaced later by flower/bee/sun GLBs.
 */
export const FIND_LAYOUT = {
  flower: { x: 0.28, y: 0, z: 1.42 },
  bee: { x: 0.06, y: 0.78, z: -1.02 },
  sun: { x: 1.08, y: 1.28, z: -1.32 },
} as const;
