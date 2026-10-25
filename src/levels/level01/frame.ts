import * as THREE from 'three';

const TITLE_DIR = new THREE.Vector3(0.08, 0.98, 1.55).normalize();
// About 6° below horizontal, almost down the meadow. A steeper pitch
// puts grass across the top of the frame and hides the sky.
const PLAY_DIR = new THREE.Vector3(0.06, 0.136, 1.25).normalize();

/**
 * Stage looks across the meadow, low enough that the sky is the top
 * third and One, the pad, and the flower sit in the lower middle.
 * Phone portrait stays wide enough that the sun and the bee remain tappable.
 */
export function frameCamera(
  aspect: number,
  viewWidthPx: number,
  phase: 'title' | 'stage',
  outPos: THREE.Vector3,
  outLook: THREE.Vector3,
): number {
  const title = phase === 'title';
  const portrait = aspect < 0.85;
  const fov = portrait ? (title ? 34 : 32) : title ? 30 : 28;
  const lookY = title ? (portrait ? 0.05 : 0.28) : portrait ? 0.9 : 1.05;
  outLook.set(0, lookY, 0);

  const charPx = THREE.MathUtils.clamp(viewWidthPx * (portrait ? 0.34 : 0.3), 108, 380);
  let worldWidth = viewWidthPx / (charPx / 1.05);
  worldWidth = Math.max(worldWidth, title ? (portrait ? 3.85 : 4.15) : portrait ? 7.4 : 6.3);

  const safeAspect = Math.max(0.38, aspect);
  const vfov = THREE.MathUtils.degToRad(fov);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * safeAspect);
  let dist = worldWidth / (2 * Math.tan(hfov / 2));

  const minHalfHeight = title ? 2.35 : 1.2;
  const halfH = dist * Math.tan(vfov / 2);
  if (halfH < minHalfHeight) dist *= minHalfHeight / halfH;

  const dir = title ? TITLE_DIR : PLAY_DIR;
  outPos.copy(outLook).addScaledVector(dir, dist);
  return fov;
}
