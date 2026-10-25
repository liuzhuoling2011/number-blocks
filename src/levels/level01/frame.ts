import * as THREE from 'three';

const TITLE_DIR = new THREE.Vector3(0.08, 0.98, 1.55).normalize();
const PLAY_DIR = new THREE.Vector3(0.04, 1.08, 1.52).normalize();

/**
 * Keep One and the pad a similar size on phone and desktop.
 * Width is solved in pixels; distance follows from the horizontal field of view.
 */
export function frameCamera(
  aspect: number,
  viewWidthPx: number,
  phase: 'title' | 'play',
  outPos: THREE.Vector3,
  outLook: THREE.Vector3,
): number {
  const title = phase === 'title';
  const portrait = aspect < 0.85;
  const fov = portrait ? 36 : title ? 32 : 30;
  const lookY = title ? (portrait ? 0.05 : 0.28) : portrait ? 0.55 : 0.62;
  outLook.set(0, lookY, 0);

  const charPx = THREE.MathUtils.clamp(viewWidthPx * (portrait ? 0.28 : 0.22), 108, 340);
  let worldWidth = viewWidthPx / (charPx / 1.05);
  worldWidth = Math.max(worldWidth, portrait ? 3.85 : 4.15);

  const safeAspect = Math.max(0.38, aspect);
  const vfov = THREE.MathUtils.degToRad(fov);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * safeAspect);
  let dist = worldWidth / (2 * Math.tan(hfov / 2));

  const minHalfHeight = title ? 2.35 : 2.05;
  const halfH = dist * Math.tan(vfov / 2);
  if (halfH < minHalfHeight) dist *= minHalfHeight / halfH;

  const dir = title ? TITLE_DIR : PLAY_DIR;
  outPos.copy(outLook).addScaledVector(dir, dist);
  return fov;
}
