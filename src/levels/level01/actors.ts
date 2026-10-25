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
  /** Kept for the pulse loop. The pad no longer adds extra hard rings. */
  bandMats: THREE.MeshStandardMaterial[];
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
  grd.addColorStop(0, 'rgba(12, 62, 18, 0.88)');
  grd.addColorStop(0.42, 'rgba(16, 58, 18, 0.42)');
  grd.addColorStop(1, 'rgba(16, 58, 18, 0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function tuneStandard(mat: THREE.MeshStandardMaterial, intensity: number): void {
  mat.envMapIntensity = intensity;
  // Body albedo bakes a peach highlight. Pull green/blue down so the block
  // reads as the mood-board crimson instead of orange glass.
  if (mat.name === 'BodyPlastic') {
    mat.color.setRGB(1.08, 0.24, 0.26);
    mat.roughness = 0.4;
    mat.metalness = 0.04;
    mat.transparent = false;
    mat.opacity = 1;
    mat.depthWrite = true;
  } else if (mat.name === 'FootPlastic') {
    mat.color.setRGB(1.02, 0.42, 0.4);
    mat.roughness = 0.42;
    mat.metalness = 0.04;
    mat.transparent = false;
    mat.opacity = 1;
    mat.depthWrite = true;
  } else if (mat.transparent) {
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

    if (obj.name === 'EyeL' || obj.name === 'EyeR') tuneStandard(mat, 0.28);
    else if (parent === 'EyeL' || parent === 'EyeR') tuneStandard(mat, 0.16);
    else if (obj.name === 'FootL' || obj.name === 'FootR') tuneStandard(mat, 0.18);
    else if (obj.name === 'Smile') tuneStandard(mat, 0.12);
    else if (mat.transparent) tuneStandard(mat, 0.1);
    else tuneStandard(mat, 0.22);

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
    tuneStandard(mat, mat.transparent ? 0.12 : 0.22);
    obj.castShadow = false;
    obj.receiveShadow = false;
    if (obj.name === 'Ring') {
      ringMat = mat;
      mat.color.set('#d4533a');
      mat.emissive.set('#c43a28');
      mat.emissiveIntensity = 0.12;
      mat.roughness = 0.55;
      mat.metalness = 0.02;
      mat.opacity = 1;
      mat.transparent = false;
      mat.depthWrite = true;
      mat.side = THREE.DoubleSide;
      obj.renderOrder = 3;
    }
    if (obj.name === 'Plate') obj.visible = false;
    if (obj.name === 'DigitOneMesh') {
      mat.color.set('#d22722');
      mat.emissive.set('#6a1612');
      mat.emissiveIntensity = 0.18;
      mat.roughness = 0.4;
    }
  });
  if (padDigit) {
    padDigit.position.y = 0.1;
    padDigit.renderOrder = 5;
  }
  return { ringMat, padDigit, padDigitBaseY: padDigit?.position.y ?? 0.1 };
}

function embeddedGlowTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法绘制光圈');
  const img = ctx.createImageData(size, size);
  const data = img.data;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = (x + 0.5) / size - 0.5;
      const v = (y + 0.5) / size - 0.5;
      const d = Math.hypot(u, v) * 2;
      const halo = Math.exp(-(((d - 0.58) / 0.18) ** 2));
      const wash = d < 0.72 ? Math.exp(-(((d - 0.36) / 0.34) ** 2)) : 0;
      const alpha = Math.min(1, halo * 0.42 + wash * 0.16);
      const i = (y * size + x) * 4;
      data[i] = 214;
      data[i + 1] = 54;
      data[i + 2] = 40;
      data[i + 3] = Math.round(alpha * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addPadGlow(pad: THREE.Object3D): {
  glowMat: THREE.MeshBasicMaterial;
  glow: THREE.PointLight;
  bandMats: THREE.MeshStandardMaterial[];
} {
  const glowMat = new THREE.MeshBasicMaterial({
    map: embeddedGlowTexture(),
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    toneMapped: true,
  });
  const disc = new THREE.Mesh(new THREE.PlaneGeometry(2.45, 2.45), glowMat);
  disc.name = 'PadGlow';
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.02;
  disc.renderOrder = 2;
  const glow = new THREE.PointLight(0xff4a38, 0.08, 2.3, 2);
  glow.position.set(0, 0.16, 0);
  pad.add(disc, glow);
  return { glowMat, glow, bandMats: [] };
}

export async function loadActors(scene: THREE.Scene, renderer: THREE.WebGLRenderer): Promise<Actors> {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  scene.environmentIntensity = 0.2;
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
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 1.12), shadowMat);
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
    bandMats: glowBits.bandMats,
    padDigit: padBits.padDigit,
    padDigitBaseY: padBits.padDigitBaseY,
    glowMat: glowBits.glowMat,
    glow: glowBits.glow,
  };
}
