import * as THREE from 'three';
import { FIND_LAYOUT } from './layout.ts';
import { loadModel } from './gltf.ts';

export type PropId = 'flower' | 'bee' | 'sun';

/** Extra screen padding so a finger still counts when the ray just misses. */
const TAP_PX = 42;

function isPropId(value: unknown): value is PropId {
  return value === 'flower' || value === 'bee' || value === 'sun';
}

type WingRig = { obj: THREE.Object3D; base: THREE.Quaternion };

type PropRig = {
  id: PropId;
  root: THREE.Group;
  visual: THREE.Group;
  hit: THREE.Mesh;
  badge: THREE.Sprite;
  spin?: THREE.Object3D;
  wings: WingRig[];
  found: boolean;
  badgeMix: number;
  punch: number;
};

export type FindProps = {
  update(time: number, dt: number): void;
  hitTest(
    raycaster: THREE.Raycaster,
    pointerX: number,
    pointerY: number,
    camera: THREE.Camera,
    viewW: number,
    viewH: number,
  ): PropId | null;
  found(id: PropId): boolean;
  markFound(id: PropId): void;
  punch(id: PropId): void;
  reset(): void;
  dispose(): void;
};

function oneBadgeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法绘制「1」徽章');
  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = '#fff8e8';
  ctx.beginPath();
  ctx.arc(64, 64, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#e85a48';
  ctx.stroke();
  ctx.strokeStyle = '#c0392b';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(48, 46);
  ctx.lineTo(64, 30);
  ctx.lineTo(64, 96);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeBadge(texture: THREE.Texture, y: number): THREE.Sprite {
  const badge = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    }),
  );
  badge.position.y = y;
  badge.scale.set(0.001, 0.001, 1);
  badge.visible = false;
  badge.renderOrder = 6;
  return badge;
}

function makeHit(radius: number, id: PropId, y: number): THREE.Mesh {
  const hit = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 12, 10),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false,
    }),
  );
  hit.name = `Hit_${id}`;
  hit.userData.propId = id;
  hit.position.y = y;
  return hit;
}

function claim(gltf: { scene: THREE.Object3D }, name: string): THREE.Object3D {
  const obj = gltf.scene.getObjectByName(name);
  if (!obj) throw new Error(`模型里没有 ${name}`);
  obj.parent?.remove(obj);
  return obj;
}

function shade(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const list = Array.isArray(obj.material) ? obj.material : [obj.material];
    const transparent = list.some((mat) => mat.transparent && mat.opacity < 0.95);
    obj.castShadow = !transparent;
    obj.receiveShadow = !transparent;
    for (const mat of list) {
      if (mat instanceof THREE.MeshStandardMaterial) mat.envMapIntensity = 0.22;
    }
  });
}

const BADGE_Y: Record<PropId, number> = { flower: 1.22, bee: 0.62, sun: 1.2 };
const HIT_Y: Record<PropId, number> = { flower: 0.72, bee: 0.08, sun: 0 };
const HIT_R: Record<PropId, number> = { flower: 0.58, bee: 0.56, sun: 0.78 };

export async function loadFindProps(scene: THREE.Scene, reduceMotion: boolean): Promise<FindProps> {
  const [flowerGltf, beeGltf, sunGltf] = await Promise.all([
    loadModel('flower.glb'),
    loadModel('bee.glb'),
    loadModel('sun.glb'),
  ]);
  const badgeTex = oneBadgeTexture();
  const models = {
    flower: claim(flowerGltf, 'Flower'),
    bee: claim(beeGltf, 'Bee'),
    sun: claim(sunGltf, 'Sun'),
  };
  const rigs: PropRig[] = [];
  const byId = new Map<PropId, PropRig>();

  for (const id of ['flower', 'bee', 'sun'] as const) {
    const spot = FIND_LAYOUT[id];
    const model = models[id];
    shade(model);
    const root = new THREE.Group();
    root.name = id;
    root.position.set(spot.x, spot.y, spot.z);
    const visual = new THREE.Group();
    visual.add(model);
    const hit = makeHit(HIT_R[id], id, HIT_Y[id]);
    const badge = makeBadge(badgeTex, BADGE_Y[id]);
    root.add(visual, hit, badge);
    const rig: PropRig = {
      id,
      root,
      visual,
      hit,
      badge,
      wings: [],
      found: false,
      badgeMix: 0,
      punch: 0,
    };
    rigs.push(rig);
    byId.set(id, rig);
    scene.add(root);
  }

  const bee = byId.get('bee');
  if (!bee) throw new Error('蜜蜂没有装上');
  for (const name of ['Wing0', 'Wing1', 'Wing2', 'Wing3']) {
    const wing = bee.visual.getObjectByName(name);
    if (!wing) continue;
    wing.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const list = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of list) {
        if (mat instanceof THREE.Material) mat.side = THREE.DoubleSide;
      }
    });
    bee.wings.push({ obj: wing, base: wing.quaternion.clone() });
  }

  const sun = byId.get('sun');
  if (!sun) throw new Error('太阳没有装上');
  const spin = new THREE.Group();
  spin.name = 'SunSpin';
  const sunModel = sun.visual.children[0];
  if (sunModel) {
    sunModel.add(spin);
    for (const name of ['Ray0', 'Ray1', 'Ray2', 'Ray3', 'Ray4', 'Ray5', 'Ray6', 'Ray7', 'Halo']) {
      const part = sunModel.getObjectByName(name);
      if (part) spin.attach(part);
    }
  }
  sun.spin = spin;

  const anchor = new THREE.Vector3();
  const ndc = new THREE.Vector3();
  const flap = new THREE.Quaternion();
  // Wings stand in their local XY plane; local X is the span, so this is an up-down flap.
  const flapAxis = new THREE.Vector3(1, 0, 0);

  return {
    update(time: number, dt: number) {
      const sway = reduceMotion ? 0 : 1;
      const flower = byId.get('flower');
      if (flower) flower.root.rotation.z = Math.sin(time * 1.35) * 0.045 * sway;
      const beeRig = byId.get('bee');
      if (beeRig) {
        const base = FIND_LAYOUT.bee;
        beeRig.root.position.y = base.y + Math.sin(time * 2.1) * 0.08 * sway;
        beeRig.root.position.x = base.x + Math.sin(time * 0.7) * 0.035 * sway;
        beeRig.root.position.z = base.z + Math.cos(time * 0.55) * 0.03 * sway;
        const ang = Math.sin(time * (reduceMotion ? 2.2 : 28)) * (reduceMotion ? 0.08 : 0.7);
        flap.setFromAxisAngle(flapAxis, ang);
        for (const wing of beeRig.wings) wing.obj.quaternion.copy(wing.base).multiply(flap);
      }
      const sunRig = byId.get('sun');
      if (sunRig?.spin) sunRig.spin.rotation.z = reduceMotion ? 0.2 : time * 0.22;

      for (const rig of rigs) {
        rig.badgeMix = THREE.MathUtils.damp(rig.badgeMix, rig.found ? 1 : 0, 8, dt);
        rig.punch = THREE.MathUtils.damp(rig.punch, 0, 7, dt);
        const pop = rig.found && rig.badgeMix < 0.98 ? 1 + Math.sin(rig.badgeMix * Math.PI) * 0.28 : 1;
        const scale = Math.max(0.001, 0.5 * rig.badgeMix * pop);
        rig.badge.scale.set(scale, scale, 1);
        rig.badge.visible = scale > 0.02;
        const s = 1 + rig.punch * 0.08;
        rig.visual.scale.set(s, s, s);
      }
    },
    hitTest(raycaster, pointerX, pointerY, camera, viewW, viewH) {
      const hits = raycaster.intersectObjects(
        rigs.map((rig) => rig.hit),
        false,
      );
      const first = hits[0]?.object.userData.propId;
      if (isPropId(first)) return first;

      let best: { id: PropId; dist: number } | null = null;
      for (const rig of rigs) {
        rig.hit.getWorldPosition(anchor);
        ndc.copy(anchor).project(camera);
        if (ndc.z > 1) continue;
        const x = (ndc.x * 0.5 + 0.5) * viewW;
        const y = (-ndc.y * 0.5 + 0.5) * viewH;
        const dist = Math.hypot(pointerX - x, pointerY - y);
        if (!best || dist < best.dist) best = { id: rig.id, dist };
      }
      if (best && best.dist <= TAP_PX) return best.id;
      return null;
    },
    found(id) {
      return byId.get(id)?.found ?? false;
    },
    markFound(id) {
      const rig = byId.get(id);
      if (!rig || rig.found) return;
      rig.found = true;
      rig.punch = 1;
    },
    punch(id) {
      const rig = byId.get(id);
      if (rig) rig.punch = 1;
    },
    reset() {
      for (const rig of rigs) {
        rig.found = false;
        rig.badgeMix = 0;
        rig.punch = 0;
        rig.badge.visible = false;
        rig.visual.scale.set(1, 1, 1);
        const spot = FIND_LAYOUT[rig.id];
        rig.root.position.set(spot.x, spot.y, spot.z);
        rig.root.rotation.z = 0;
      }
    },
    dispose() {
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      const textures = new Set<THREE.Texture>();
      for (const rig of rigs) {
        scene.remove(rig.root);
        rig.root.traverse((obj) => {
          if (obj instanceof THREE.Mesh) geometries.add(obj.geometry);
          const source = obj instanceof THREE.Mesh || obj instanceof THREE.Sprite ? obj.material : null;
          const list = source ? (Array.isArray(source) ? source : [source]) : [];
          for (const mat of list) {
            materials.add(mat);
            if ('map' in mat && mat.map instanceof THREE.Texture) textures.add(mat.map);
          }
        });
      }
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      for (const texture of textures) texture.dispose();
    },
  };
}
