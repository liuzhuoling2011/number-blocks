import * as THREE from 'three';

const TITLE_DIR = new THREE.Vector3(0.08, 0.98, 1.55).normalize();
const PLAY_DIR = new THREE.Vector3(0.05, 0.24, 1.92).normalize();

/**
 * Stage is a step closer than the wide exploration frame, still wide enough
 * that the sun's rays and the flower stay inside a phone portrait.
 * It is not the mood-board hero crop. See docs/ep01-mood-gap-checklist.md.
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
  const fov = portrait ? (title ? 36 : 34) : title ? 32 : 30;
  const lookY = title ? (portrait ? 0.05 : 0.28) : portrait ? 0.5 : 0.56;
  outLook.set(0, lookY, 0);

  const charPx = THREE.MathUtils.clamp(viewWidthPx * (portrait ? 0.3 : 0.24), 108, 340);
  let worldWidth = viewWidthPx / (charPx / 1.05);
  worldWidth = Math.max(worldWidth, title ? (portrait ? 3.85 : 4.15) : portrait ? 4.75 : 4.7);

  const safeAspect = Math.max(0.38, aspect);
  const vfov = THREE.MathUtils.degToRad(fov);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * safeAspect);
  let dist = worldWidth / (2 * Math.tan(hfov / 2));

  const minHalfHeight = title ? 2.35 : 2.02;
  const halfH = dist * Math.tan(vfov / 2);
  if (halfH < minHalfHeight) dist *= minHalfHeight / halfH;

  const dir = title ? TITLE_DIR : PLAY_DIR;
  outPos.copy(outLook).addScaledVector(dir, dist);
  return fov;
}
