import * as THREE from 'three';
import { loadModel } from './gltf.ts';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PAD } from './layout.ts';

export type EyeRig = { obj: THREE.Object3D; baseY: number };

export type Actors = {
  oneRoot: THREE.Object3D;
  pick: THREE.Object3D[];
  eyes: EyeRig[];
  shadow: THREE.Mesh;
  shadowMat: THREE.MeshBasicMaterial;
  pad: THREE.Object3D;
  ringMat: THREE.MeshStandardMaterial | null;
  padDigit: THREE.Object3D | null;
  padDigitBaseY: number;
  glowMat: THREE.MeshBasicMaterial;
  glow: THREE.PointLight;
};

function blobTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法绘制阴影');
  const grd = ctx.createRadialGradient(size / 2, size / 2, size * 0.05, size / 2, size / 2, size * 0.5);
  grd.addColorStop(0, 'rgba(48, 32, 24, 0.5)');
  grd.addColorStop(0.5, 'rgba(48, 32, 24, 0.18)');
  grd.addColorStop(1, 'rgba(48, 32, 24, 0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function tuneStandard(mat: THREE.MeshStandardMaterial, intensity: number): void {
  mat.envMapIntensity = intensity;
  if (mat.transparent) {
    mat.depthWrite = false;
  }
}

/**
 * One v9 puts the slim digit on HeadDigit, above the block. That node is correct.
 * Face is parented to Body but still carries a world-space Y (0.545). The
 * approved face sits on the front, about 0.02 above the body center.
 */
function fixOneFace(one: THREE.Object3D): void {
  const face = one.getObjectByName('Face');
  if (face && face.position.y > 0.2) face.position.y = 0.02;
}

function prepareOne(one: THREE.Object3D): { pick: THREE.Object3D[]; eyes: EyeRig[] } {
  fixOneFace(one);
  const contact = one.getObjectByName('ContactShadow');
  if (contact) contact.visible = false;

  const pick: THREE.Object3D[] = [];
  const eyes: EyeRig[] = [];
  const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  one.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mat = obj.material;
    if (Array.isArray(mat) || !(mat instanceof THREE.MeshStandardMaterial)) return;

    const parent = obj.parent?.name ?? '';
    const r = (() => {
      if (!obj.geometry.boundingSphere) obj.geometry.computeBoundingSphere();
      return obj.geometry.boundingSphere?.radius ?? 1;
    })();

    if ((parent === 'EyeL' || parent === 'EyeR') && r < 0.035) {
      obj.material = highlightMat;
      obj.castShadow = false;
      pick.push(obj);
      return;
    }

    if (obj.name === 'EyeL' || obj.name === 'EyeR') tuneStandard(mat, 0.72);
    else if (parent === 'EyeL' || parent === 'EyeR') tuneStandard(mat, 0.28);
    else if (obj.name === 'FootL' || obj.name === 'FootR') tuneStandard(mat, 0.32);
    else if (obj.name === 'Smile') tuneStandard(mat, 0.18);
    else if (mat.transparent) tuneStandard(mat, 0.12);
    else tuneStandard(mat, 0.55);

    const skipShadow = mat.transparent || obj.name === 'ContactShadow';
    obj.castShadow = !skipShadow;
    obj.receiveShadow = false;
    if (obj.name !== 'ContactShadow') pick.push(obj);
  });

  for (const name of ['EyeL', 'EyeR']) {
    const eye = one.getObjectByName(name);
    if (eye) eyes.push({ obj: eye, baseY: eye.scale.y || 1 });
  }
  return { pick, eyes };
}

function preparePad(pad: THREE.Object3D): {
  ringMat: THREE.MeshStandardMaterial | null;
  padDigit: THREE.Object3D | null;
  padDigitBaseY: number;
} {
  let ringMat: THREE.MeshStandardMaterial | null = null;
  const padDigit = pad.getObjectByName('PadDigit') ?? null;
  pad.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mat = obj.material;
    if (Array.isArray(mat) || !(mat instanceof THREE.MeshStandardMaterial)) return;
    tuneStandard(mat, mat.transparent ? 0.15 : 0.35);
    obj.castShadow = false;
    obj.receiveShadow = false;
    if (obj.name === 'Ring') {
      ringMat = mat;
      obj.renderOrder = 3;
    }
    if (obj.name === 'Plate') obj.renderOrder = 2;
  });
  if (padDigit) padDigit.renderOrder = 4;
  return { ringMat, padDigit, padDigitBaseY: padDigit?.position.y ?? 0.42 };
}

function glowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法绘制光圈');
  const grd = ctx.createRadialGradient(size / 2, size / 2, size * 0.18, size / 2, size / 2, size * 0.5);
  grd.addColorStop(0, 'rgba(255, 150, 130, 0)');
  grd.addColorStop(0.42, 'rgba(255, 110, 90, 0.28)');
  grd.addColorStop(0.72, 'rgba(255, 90, 70, 0.45)');
  grd.addColorStop(1, 'rgba(255, 80, 60, 0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addPadGlow(pad: THREE.Object3D): { glowMat: THREE.MeshBasicMaterial; glow: THREE.PointLight } {
  const glowMat = new THREE.MeshBasicMaterial({
    map: glowTexture(),
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const disc = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 3.1), glowMat);
  disc.name = 'PadGlow';
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.008;
  disc.renderOrder = 1;

  const glow = new THREE.PointLight(0xff6d5c, 1.15, 2.6, 2);
  glow.position.set(0, 0.18, 0);
  pad.add(disc, glow);
  return { glowMat, glow };
}

export async function loadActors(scene: THREE.Scene, renderer: THREE.WebGLRenderer): Promise<Actors> {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  scene.environmentIntensity = 0.85;
  room.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.geometry.dispose();
    const mat = obj.material;
    if (Array.isArray(mat)) mat.forEach((item) => item.dispose());
    else mat.dispose();
  });
  pmrem.dispose();

  const [oneGltf, padGltf] = await Promise.all([loadModel('one.glb'), loadModel('pad.glb')]);

  const oneRoot = oneGltf.scene.getObjectByName('One');
  const pad = padGltf.scene.getObjectByName('Pad');
  if (!oneRoot || !pad) throw new Error('模型里没有找到 One 或 Pad');

  oneRoot.parent?.remove(oneRoot);
  pad.parent?.remove(pad);
  const { pick, eyes } = prepareOne(oneRoot);
  const padBits = preparePad(pad);
  const glowBits = addPadGlow(pad);
  pad.position.set(PAD.x, PAD.y, PAD.z);
  scene.add(pad);

  const shadowMat = new THREE.MeshBasicMaterial({
    map: blobTexture(),
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 1.05), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.018;
  shadow.renderOrder = 2;
  scene.add(shadow);

  return {
    oneRoot,
    pick,
    eyes,
    shadow,
    shadowMat,
    pad,
    ringMat: padBits.ringMat,
    padDigit: padBits.padDigit,
    padDigitBaseY: padBits.padDigitBaseY,
    glowMat: glowBits.glowMat,
    glow: glowBits.glow,
  };
}
