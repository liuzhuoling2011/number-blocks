import * as THREE from 'three';
import { FIND_LAYOUT } from './layout.ts';

export type PropId = 'flower' | 'bee' | 'sun';

/** Extra screen padding so a finger still counts when the ray just misses. */
const TAP_PX = 42;

function isPropId(value: unknown): value is PropId {
  return value === 'flower' || value === 'bee' || value === 'sun';
}

type PropRig = {
  id: PropId;
  root: THREE.Group;
  visual: THREE.Group;
  hit: THREE.Mesh;
  badge: THREE.Sprite;
  spin?: THREE.Object3D;
  wings?: THREE.Object3D;
  found: boolean;
  badgeMix: number;
  punch: number;
  baseScale: number;
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

function plastic(color: number, roughness = 0.42): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.04,
    envMapIntensity: 0.4,
  });
}

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
  ctx.fillStyle = '#c0392b';
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
      sizeAttenuation: true,
    }),
  );
  badge.position.y = y;
  badge.scale.set(0.001, 0.001, 1);
  badge.visible = false;
  badge.renderOrder = 6;
  badge.center.set(0.5, 0.5);
  return badge;
}

function makeHit(radius: number, id: PropId): THREE.Mesh {
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
  return hit;
}

function makeFlower(): THREE.Group {
  const visual = new THREE.Group();
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.05, 0.46, 10),
    plastic(0x3f8f46, 0.72),
  );
  stem.position.y = 0.23;
  stem.castShadow = true;
  const leafMat = plastic(0x67b85a, 0.7);
  for (const side of [-1, 1]) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), leafMat);
    leaf.scale.set(1.5, 0.28, 0.7);
    leaf.position.set(side * 0.12, 0.18, 0.02);
    leaf.rotation.z = side * -0.7;
    leaf.castShadow = true;
    visual.add(leaf);
  }
  const head = new THREE.Group();
  const petalMat = plastic(0xff6d8a, 0.4);
  for (let i = 0; i < 6; i += 1) {
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), petalMat);
    const a = (i / 6) * Math.PI * 2;
    petal.position.set(Math.cos(a) * 0.13, 0, Math.sin(a) * 0.13);
    petal.scale.set(1.05, 0.72, 0.85);
    petal.castShadow = true;
    head.add(petal);
  }
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), plastic(0xffe08a, 0.38));
  center.castShadow = true;
  head.add(center);
  head.position.y = 0.5;
  visual.add(stem, head);
  return visual;
}

function makeBee(wingsOut: { wings?: THREE.Object3D }): THREE.Group {
  const visual = new THREE.Group();
  const yellow = plastic(0xffd15c, 0.4);
  const ink = plastic(0x2c3544, 0.5);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), yellow);
  body.scale.set(0.82, 0.74, 1.28);
  body.castShadow = true;
  visual.add(body);
  for (const z of [-0.08, 0.07]) {
    const band = new THREE.Mesh(new THREE.SphereGeometry(0.185, 14, 10), ink);
    band.scale.set(0.88, 0.78, 0.16);
    band.position.z = z;
    visual.add(band);
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 12), yellow);
  head.position.set(0, 0.02, 0.26);
  head.castShadow = true;
  visual.add(head);
  const eyeMat = plastic(0x1a2433, 0.32);
  for (const x of [-0.045, 0.045]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), eyeMat);
    eye.position.set(x, 0.05, 0.36);
    visual.add(eye);
    const shine = new THREE.Mesh(
      new THREE.SphereGeometry(0.01, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xfffef8 }),
    );
    shine.position.set(x + 0.01, 0.06, 0.382);
    visual.add(shine);
  }
  const wingMat = new THREE.MeshStandardMaterial({
    color: 0xf4fbff,
    roughness: 0.18,
    metalness: 0.02,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    side: THREE.DoubleSide,
    envMapIntensity: 0.25,
  });
  const wings = new THREE.Group();
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8), wingMat);
    wing.scale.set(0.55, 0.1, 1);
    wing.position.set(side * 0.18, 0.08, -0.02);
    wing.rotation.z = side * 0.35;
    wings.add(wing);
  }
  visual.add(wings);
  wingsOut.wings = wings;
  const sting = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), ink);
  sting.scale.set(0.7, 0.7, 1.4);
  sting.position.set(0, 0, -0.3);
  visual.add(sting);
  for (const side of [-1, 1]) {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), ink);
    stick.position.set(side * 0.04, 0.14, 0.3);
    stick.rotation.z = side * -0.5;
    stick.rotation.x = -0.4;
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), ink);
    tip.position.set(side * 0.07, 0.2, 0.34);
    visual.add(stick, tip);
  }
  return visual;
}

function makeSun(spinOut: { spin?: THREE.Object3D }): THREE.Group {
  const visual = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 22, 16),
    new THREE.MeshStandardMaterial({
      color: 0xffd56a,
      roughness: 0.42,
      metalness: 0.04,
      emissive: 0xffb703,
      emissiveIntensity: 0.08,
      envMapIntensity: 0.3,
    }),
  );
  visual.add(core);
  const rayMat = plastic(0xffb703, 0.46);
  rayMat.emissive = new THREE.Color(0xffcc66);
  rayMat.emissiveIntensity = 0.08;
  const rays = new THREE.Group();
  for (let i = 0; i < 8; i += 1) {
    const ray = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), rayMat);
    ray.scale.set(0.42, 1.45, 0.48);
    ray.position.y = 0.5;
    const pivot = new THREE.Group();
    pivot.rotation.z = (i / 8) * Math.PI * 2;
    pivot.add(ray);
    rays.add(pivot);
  }
  visual.add(rays);
  spinOut.spin = rays;
  const eyeMat = plastic(0x1a2433, 0.3);
  for (const x of [-0.1, 0.1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), eyeMat);
    eye.scale.set(1, 1.15, 0.6);
    eye.position.set(x, 0.05, 0.28);
    visual.add(eye);
  }
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.1, 0.018, 8, 18, Math.PI * 0.72),
    plastic(0xc0392b, 0.45),
  );
  smile.position.set(0, -0.08, 0.28);
  smile.rotation.z = Math.PI + (Math.PI - Math.PI * 0.72) / 2;
  visual.add(smile);
  const glowMat = new THREE.SpriteMaterial({
    map: sunGlowTexture(),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0.4,
  });
  const glow = new THREE.Sprite(glowMat);
  glow.scale.set(1.25, 1.25, 1);
  glow.position.z = -0.05;
  glow.renderOrder = 1;
  visual.add(glow);
  return visual;
}

function sunGlowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法绘制太阳光晕');
  const grd = ctx.createRadialGradient(size / 2, size / 2, size * 0.12, size / 2, size / 2, size * 0.5);
  grd.addColorStop(0, 'rgba(255, 220, 120, 0.55)');
  grd.addColorStop(0.45, 'rgba(255, 180, 60, 0.18)');
  grd.addColorStop(1, 'rgba(255, 160, 40, 0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function place(id: PropId, visual: THREE.Group, hitRadius: number, badgeY: number, badgeTex: THREE.Texture): PropRig {
  const spot = FIND_LAYOUT[id];
  const root = new THREE.Group();
  root.name = id;
  root.position.set(spot.x, spot.y, spot.z);
  const hit = makeHit(hitRadius, id);
  const badge = makeBadge(badgeTex, badgeY);
  root.add(visual, hit, badge);
  return {
    id,
    root,
    visual,
    hit,
    badge,
    found: false,
    badgeMix: 0,
    punch: 0,
    baseScale: 1,
  };
}

export function buildFindProps(scene: THREE.Scene, reduceMotion: boolean): FindProps {
  const badgeTex = oneBadgeTexture();
  const flower = place('flower', makeFlower(), 0.5, 0.78, badgeTex);
  flower.baseScale = 1.35;
  const beeWings: { wings?: THREE.Object3D } = {};
  const bee = place('bee', makeBee(beeWings), 0.58, 0.7, badgeTex);
  bee.wings = beeWings.wings;
  bee.baseScale = 1.55;
  const sunSpin: { spin?: THREE.Object3D } = {};
  const sun = place('sun', makeSun(sunSpin), 0.62, 0.92, badgeTex);
  sun.baseScale = 1.08;
  sun.spin = sunSpin.spin;
  const rigs = [flower, bee, sun];
  const byId = new Map<PropId, PropRig>(rigs.map((rig) => [rig.id, rig]));
  for (const rig of rigs) scene.add(rig.root);

  const anchor = new THREE.Vector3();
  const ndc = new THREE.Vector3();

  function applyBadge(rig: PropRig): void {
    const pop = rig.found && rig.badgeMix < 0.98 ? 1 + Math.sin(rig.badgeMix * Math.PI) * 0.28 : 1;
    const scale = Math.max(0.001, 0.5 * rig.badgeMix * pop);
    rig.badge.scale.set(scale, scale, 1);
    rig.badge.visible = scale > 0.02;
  }

  return {
    update(time: number, dt: number) {
      const sway = reduceMotion ? 0 : 1;
      flower.root.rotation.z = Math.sin(time * 1.35) * 0.05 * sway;
      const beeBase = FIND_LAYOUT.bee.y;
      bee.root.position.y = beeBase + Math.sin(time * 2.1) * 0.08 * sway;
      if (bee.wings) bee.wings.rotation.x = Math.sin(time * (reduceMotion ? 2 : 26)) * (reduceMotion ? 0.08 : 0.55);
      if (sun.spin) sun.spin.rotation.z = reduceMotion ? 0.4 : time * 0.28;
      sun.root.position.y = FIND_LAYOUT.sun.y + Math.sin(time * 1.1) * 0.05 * sway;

      for (const rig of rigs) {
        rig.badgeMix = THREE.MathUtils.damp(rig.badgeMix, rig.found ? 1 : 0, 8, dt);
        rig.punch = THREE.MathUtils.damp(rig.punch, 0, 7, dt);
        const s = rig.baseScale * (1 + rig.punch * 0.1);
        rig.visual.scale.set(s, s, s);
        applyBadge(rig);
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
        rig.root.getWorldPosition(anchor);
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
        rig.visual.scale.set(rig.baseScale, rig.baseScale, rig.baseScale);
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
