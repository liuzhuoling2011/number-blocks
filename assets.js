/**
 * 手作感 3D 资源（原创网格，非官方素材）
 */
import * as THREE from "./vendor/three.module.min.js";
import { RoundedBoxGeometry } from "./vendor/addons/geometries/RoundedBoxGeometry.js";
import {
  makePlasticMaps,
  makeGrassMaps,
  makeBarkMap,
  makeLeafMap,
  makeRockMap,
  makeSkyTexture,
  makeFaceTexture,
  makeGlowSprite,
  makeBadgeTexture,
} from "./tex.js";

const _v = new THREE.Vector3();

function shadow(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** 轻微顶点噪声（岩石/地形） */
function displaceSphere(geo, amp = 0.08, seed = 1) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    _v.fromBufferAttribute(pos, i);
    const n = _v.clone().normalize();
    const noise =
      Math.sin(_v.x * 7.1 + seed) * Math.cos(_v.y * 5.3 + seed * 1.7) *
      Math.sin(_v.z * 6.2 + seed * 0.4);
    _v.addScaledVector(n, noise * amp);
    pos.setXYZ(i, _v.x, _v.y, _v.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

// ---------------- Character「一」----------------
export function createOneCharacter(envMap) {
  const root = new THREE.Group();
  root.name = "One";

  const size = 1.05;
  const maps = makePlasticMaps("#e85a48");
  const bodyMat = new THREE.MeshStandardMaterial({
    map: maps.map,
    roughnessMap: maps.roughnessMap,
    normalMap: maps.normalMap,
    normalScale: new THREE.Vector2(0.35, 0.35),
    color: 0xffffff,
    roughness: 0.42,
    metalness: 0.06,
    envMap,
    envMapIntensity: 0.55,
  });

  const body = shadow(
    new THREE.Mesh(new RoundedBoxGeometry(size, size, size, 8, 0.16), bodyMat)
  );
  body.position.y = size / 2;
  root.add(body);

  // 几何感五官：眼球 + 高光 + 微笑挤出条
  const faceG = new THREE.Group();
  faceG.position.set(0, size / 2 + 0.02, size / 2 + 0.01);
  const facePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.78, 0.78),
    new THREE.MeshStandardMaterial({
      map: makeFaceTexture(),
      transparent: true,
      roughness: 0.55,
      metalness: 0,
      depthWrite: false,
      envMapIntensity: 0.2,
    })
  );
  faceG.add(facePlane);

  // 轻微突出的立体眼睛（可读剪影）
  const eyeGeo = new THREE.SphereGeometry(0.09, 16, 12);
  const eyeWhite = new THREE.MeshStandardMaterial({
    color: 0xfffef8, roughness: 0.35, metalness: 0.05, envMap, envMapIntensity: 0.4,
  });
  const irisMat = new THREE.MeshStandardMaterial({ color: 0x1a2433, roughness: 0.25, metalness: 0.1 });
  [[-0.16, 0.06], [0.16, 0.06]].forEach(([x, y]) => {
    const w = new THREE.Mesh(eyeGeo, eyeWhite);
    w.position.set(x, y, 0.04);
    w.scale.set(1, 1.15, 0.7);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), irisMat);
    iris.position.set(0, -0.01, 0.05);
    const hl = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    hl.position.set(-0.02, 0.025, 0.07);
    w.add(iris, hl);
    faceG.add(w);
  });

  // 微笑：细圆环段
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.022, 8, 24, Math.PI * 0.7),
    new THREE.MeshStandardMaterial({ color: 0x1a2430, roughness: 0.5 })
  );
  smile.position.set(0, -0.12, 0.05);
  smile.rotation.set(0, 0, Math.PI);
  faceG.add(smile);
  body.add(faceG);

  // 「1」徽章
  const badge = new THREE.Mesh(
    new THREE.CircleGeometry(0.17, 28),
    new THREE.MeshStandardMaterial({
      map: makeBadgeTexture("1"),
      transparent: true,
      roughness: 0.4,
      metalness: 0.05,
      emissive: 0xffe8c8,
      emissiveIntensity: 0.12,
    })
  );
  badge.position.set(0.34, -0.3, size / 2 + 0.02);
  body.add(badge);

  // 小脚（可读站姿）
  const footMat = new THREE.MeshStandardMaterial({
    color: 0xc0392b, roughness: 0.55, metalness: 0.05, envMap, envMapIntensity: 0.3,
  });
  [-0.22, 0.22].forEach((x) => {
    const foot = shadow(new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.12, 0.36, 3, 0.04), footMat));
    foot.position.set(x, 0.05, 0.06);
    root.add(foot);
  });

  // 接触阴影
  const contact = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 32),
    new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false,
    })
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.01;
  root.add(contact);

  root.userData = {
    size,
    homeY: 0,
    liftY: 0.4,
    body,
    contact,
    breathe(t) {
      const s = 1 + Math.sin(t * 2.1) * 0.018;
      body.scale.set(s, 1 + Math.sin(t * 2.1 + 0.4) * 0.028, s);
      root.position.y = root.userData.baseY + Math.sin(t * 2.1) * 0.03;
    },
    baseY: 0,
  };
  return root;
}

// ---------------- Bee（必须一眼能认）----------------
export function createBee(envMap) {
  const root = new THREE.Group();
  root.name = "bee";

  const yellow = new THREE.MeshStandardMaterial({
    color: 0xf5c542, roughness: 0.45, metalness: 0.08, envMap, envMapIntensity: 0.4,
  });
  const black = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a, roughness: 0.55, metalness: 0.15, envMap, envMapIntensity: 0.25,
  });
  const cream = new THREE.MeshStandardMaterial({
    color: 0xfff6d8, roughness: 0.5, metalness: 0.05,
  });

  // 胸节（较圆）
  const thorax = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 16), yellow));
  thorax.scale.set(1.05, 0.95, 0.95);
  thorax.position.set(0, 0, 0);
  root.add(thorax);

  // 腹节（拉长椭圆 + 黑黄条纹环）
  const abdomen = new THREE.Group();
  abdomen.position.set(-0.42, -0.02, 0);
  const abBody = shadow(
    new THREE.Mesh(new THREE.SphereGeometry(0.32, 22, 16), yellow)
  );
  abBody.scale.set(1.45, 0.95, 0.95);
  abdomen.add(abBody);

  // 条纹：黑色圆环贴在腹上
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.30 - i * 0.01, 0.055, 10, 28),
      black
    );
    ring.rotation.y = Math.PI / 2;
    ring.position.x = -0.08 + i * 0.16;
    ring.scale.set(1, 0.95, 1.05);
    abdomen.add(ring);
  }
  // 尾刺
  const stinger = new THREE.Mesh(
    new THREE.ConeGeometry(0.05, 0.18, 8),
    black
  );
  stinger.rotation.z = Math.PI / 2;
  stinger.position.set(-0.52, 0, 0);
  abdomen.add(stinger);
  root.add(abdomen);

  // 头
  const head = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), cream));
  head.position.set(0.32, 0.06, 0);
  root.add(head);
  // 大复眼
  [-1, 1].forEach((s) => {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.25, metalness: 0.4 })
    );
    eye.position.set(0.38, 0.1, s * 0.14);
    eye.scale.set(0.7, 1, 1.1);
    root.add(eye);
    const hl = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    hl.position.set(0.04, 0.03, s * 0.02);
    eye.add(hl);
  });

  // 触角
  [-1, 1].forEach((s) => {
    const ant = new THREE.Group();
    const a1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.016, 0.18, 6),
      black
    );
    a1.position.y = 0.09;
    const a2 = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), black);
    a2.position.y = 0.18;
    ant.add(a1, a2);
    ant.position.set(0.42, 0.2, s * 0.08);
    ant.rotation.z = s * 0.35;
    ant.rotation.x = -0.4;
    root.add(ant);
  });

  // 腿（六条，可读剪影）
  const legMat = black;
  const makeLeg = (x, z, side) => {
    const leg = new THREE.Group();
    const upper = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.022, 0.22, 6),
      legMat
    );
    upper.position.y = -0.1;
    upper.rotation.z = side * 0.5;
    const lower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.018, 0.2, 6),
      legMat
    );
    lower.position.set(side * 0.06, -0.28, 0);
    lower.rotation.z = side * 0.9;
    leg.add(upper, lower);
    leg.position.set(x, -0.1, z);
    root.add(leg);
    return leg;
  };
  const legs = [];
  [-0.05, 0.12, 0.28].forEach((x, i) => {
    legs.push(makeLeg(x, 0.18, 1));
    legs.push(makeLeg(x, -0.18, -1));
  });

  // 半透明翅膀（双对）
  const wingMat = new THREE.MeshStandardMaterial({
    color: 0xe8f6ff,
    transparent: true,
    opacity: 0.45,
    roughness: 0.15,
    metalness: 0.05,
    side: THREE.DoubleSide,
    depthWrite: false,
    envMap,
    envMapIntensity: 0.6,
  });
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.quadraticCurveTo(0.35, 0.25, 0.55, 0.05);
  wingShape.quadraticCurveTo(0.6, -0.1, 0.35, -0.18);
  wingShape.quadraticCurveTo(0.12, -0.15, 0, 0);
  const wingGeo = new THREE.ShapeGeometry(wingShape, 12);
  const wings = [];
  [[1, 0.12], [1, -0.12], [-1, 0.1], [-1, -0.1]].forEach(([side, z], i) => {
    const w = new THREE.Mesh(wingGeo, wingMat);
    w.position.set(0.05, 0.22, z);
    w.rotation.y = side > 0 ? 0.15 : Math.PI - 0.15;
    w.rotation.x = -0.3;
    w.scale.set(side > 0 ? 1 : -1, 1, 1);
    if (i >= 2) w.scale.multiplyScalar(0.75);
    root.add(w);
    wings.push(w);
  });

  root.userData = {
    wings,
    legs,
    flutter(t) {
      const flap = Math.sin(t * 42) * 0.55;
      wings.forEach((w, i) => {
        w.rotation.x = -0.3 + flap * (i < 2 ? 1 : 0.7);
      });
    },
  };

  // 整体放大到场景可读尺寸
  root.scale.setScalar(0.85);
  return root;
}

// ---------------- Tree ----------------
export function createTree(envMap) {
  const root = new THREE.Group();
  root.name = "tree";
  const bark = makeBarkMap();
  const leaf = makeLeafMap();

  const trunkMat = new THREE.MeshStandardMaterial({
    map: bark, roughness: 0.9, metalness: 0.02, envMap, envMapIntensity: 0.15,
  });
  // 分段树干（略弯）
  const trunk = new THREE.Group();
  const segs = [
    [0.28, 0.22, 0.7, 0, 0.35, 0],
    [0.22, 0.18, 0.65, 0.04, 1.0, 0.02],
    [0.16, 0.12, 0.55, 0.06, 1.55, 0.04],
  ];
  segs.forEach(([r1, r2, h, x, y, z]) => {
    const m = shadow(new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, h, 12), trunkMat));
    m.position.set(x, y, z);
    m.rotation.z = x * 0.3;
    trunk.add(m);
  });
  // 根部隆起
  const roots = shadow(
    new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8), trunkMat)
  );
  roots.scale.set(1.2, 0.35, 1.2);
  roots.position.y = 0.08;
  trunk.add(roots);
  root.add(trunk);

  const leafMat = new THREE.MeshStandardMaterial({
    map: leaf, roughness: 0.7, metalness: 0.02, envMap, envMapIntensity: 0.25,
  });
  const leafMat2 = leafMat.clone();
  leafMat2.color = new THREE.Color(0xb8e06a);

  // 多层树冠体积
  const canopy = new THREE.Group();
  canopy.position.set(0.05, 2.35, 0.02);
  const clusters = [
    [0, 0, 0, 1.15, leafMat],
    [-0.7, -0.25, 0.25, 0.85, leafMat2],
    [0.75, -0.2, -0.2, 0.9, leafMat],
    [0.15, 0.55, 0.1, 0.75, leafMat2],
    [-0.35, 0.35, -0.45, 0.7, leafMat],
    [0.4, -0.45, 0.55, 0.65, leafMat2],
  ];
  clusters.forEach(([x, y, z, r, mat]) => {
    const geo = displaceSphere(new THREE.SphereGeometry(r, 18, 14), 0.06, x * 10 + y);
    const m = shadow(new THREE.Mesh(geo, mat));
    m.position.set(x, y, z);
    canopy.add(m);
  });
  root.add(canopy);

  root.userData.canopy = canopy;
  return root;
}

// ---------------- Sun ----------------
export function createSun() {
  const root = new THREE.Group();
  root.name = "sun";

  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xffe566,
    emissive: 0xffb020,
    emissiveIntensity: 0.85,
    roughness: 0.35,
    metalness: 0.1,
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.7, 32, 24), coreMat);
  root.add(core);

  // 内层起伏
  const shell = new THREE.Mesh(
    displaceSphere(new THREE.SphereGeometry(0.78, 24, 18), 0.04, 2),
    new THREE.MeshStandardMaterial({
      color: 0xffcc44,
      emissive: 0xff9900,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.55,
      roughness: 0.5,
    })
  );
  root.add(shell);

  // 3D 射线（扁锥体）
  const rayMat = new THREE.MeshStandardMaterial({
    color: 0xffe08a,
    emissive: 0xffaa00,
    emissiveIntensity: 0.55,
    roughness: 0.4,
    transparent: true,
    opacity: 0.9,
  });
  const rays = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const ray = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.55, 6), rayMat);
    const a = (i / 12) * Math.PI * 2;
    const long = i % 2 === 0;
    ray.scale.set(long ? 1 : 0.7, long ? 1.15 : 0.85, 1);
    ray.position.set(Math.cos(a) * 1.05, Math.sin(a) * 1.05, 0);
    ray.rotation.z = a - Math.PI / 2;
    rays.add(ray);
  }
  root.add(rays);

  // 光晕 sprite
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makeGlowSprite("#ffe08a"),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.85,
    })
  );
  glow.scale.set(4.2, 4.2, 1);
  root.add(glow);

  const light = new THREE.PointLight(0xffcc66, 1.2, 14, 2);
  root.add(light);

  root.userData = { rays, core, glow };
  return root;
}

// ---------------- Flower / Rock ----------------
export function createFlower(color = 0xff6b81, envMap) {
  const root = new THREE.Group();
  const stem = shadow(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.035, 0.55, 6),
      new THREE.MeshStandardMaterial({ color: 0x3d9a4a, roughness: 0.8 })
    )
  );
  stem.position.y = 0.28;
  root.add(stem);

  const petalMat = new THREE.MeshStandardMaterial({
    color, roughness: 0.55, metalness: 0.05, envMap, envMapIntensity: 0.3,
  });
  for (let i = 0; i < 5; i++) {
    const petal = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 10, 8),
      petalMat
    );
    const a = (i / 5) * Math.PI * 2;
    petal.position.set(Math.cos(a) * 0.12, 0.58, Math.sin(a) * 0.12);
    petal.scale.set(1, 0.45, 0.7);
    root.add(petal);
  }
  const center = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xffe066, roughness: 0.4, emissive: 0xaa8800, emissiveIntensity: 0.15 })
  );
  center.position.y = 0.58;
  root.add(center);
  return root;
}

export function createRock(envMap) {
  const geo = displaceSphere(new THREE.SphereGeometry(0.45, 16, 12), 0.12, Math.random() * 10);
  const mat = new THREE.MeshStandardMaterial({
    map: makeRockMap(),
    roughness: 0.92,
    metalness: 0.05,
    envMap,
    envMapIntensity: 0.2,
  });
  const m = shadow(new THREE.Mesh(geo, mat));
  m.scale.set(1.1 + Math.random() * 0.4, 0.45 + Math.random() * 0.25, 0.9 + Math.random() * 0.3);
  return m;
}

// ---------------- Terrain / mountains / sky ----------------
export function createTerrain(envMap) {
  const geo = new THREE.CircleGeometry(30, 96);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getY(i); // circle in XY then rotate
    // after rotate X, Y becomes height — displace before rotate using Z as unused
  }
  // Use Plane then rotate for easier displace
  const plane = new THREE.PlaneGeometry(56, 56, 80, 80);
  const p = plane.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const h =
      Math.sin(x * 0.15) * Math.cos(y * 0.12) * 0.25 +
      Math.sin(x * 0.4 + y * 0.3) * 0.08;
    const dist = Math.hypot(x, y);
    const fall = THREE.MathUtils.smoothstep(26, 8, dist);
    p.setZ(i, h * fall);
  }
  plane.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    map: makeGrassMaps(),
    roughness: 0.92,
    metalness: 0.0,
    envMap,
    envMapIntensity: 0.12,
  });
  const mesh = new THREE.Mesh(plane, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

export function createMountains() {
  const g = new THREE.Group();
  const mats = [0x4a8f55, 0x3f7d4c, 0x356f44, 0x5a9a62].map(
    (c) =>
      new THREE.MeshStandardMaterial({
        color: c, roughness: 0.95, metalness: 0, flatShading: false,
      })
  );
  const specs = [
    [-14, -18, 9, 4.2, 0],
    [12, -20, 11, 5.0, 1],
    [0, -24, 14, 6.5, 2],
    [18, -14, 7, 3.2, 3],
    [-18, -12, 6.5, 2.8, 1],
  ];
  specs.forEach(([x, z, r, h, mi]) => {
    const geo = displaceSphere(
      new THREE.SphereGeometry(r, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2),
      0.25,
      x
    );
    const m = new THREE.Mesh(geo, mats[mi]);
    m.scale.y = h / r;
    m.position.set(x, 0, z);
    m.receiveShadow = true;
    g.add(m);
  });
  return g;
}

export function createSkyDome() {
  const geo = new THREE.SphereGeometry(60, 24, 16);
  const mat = new THREE.MeshBasicMaterial({
    map: makeSkyTexture(),
    side: THREE.BackSide,
    fog: false,
  });
  return new THREE.Mesh(geo, mat);
}

export function createGrassTufts(count = 80) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0x5cb85c, roughness: 0.85, side: THREE.DoubleSide,
  });
  const blade = new THREE.PlaneGeometry(0.08, 0.35);
  for (let i = 0; i < count; i++) {
    const tuft = new THREE.Group();
    for (let b = 0; b < 4; b++) {
      const m = new THREE.Mesh(blade, mat);
      m.position.set((b - 1.5) * 0.05, 0.17, Math.random() * 0.04);
      m.rotation.y = Math.random() * 0.5;
      m.rotation.z = (Math.random() - 0.5) * 0.3;
      tuft.add(m);
    }
    const a = Math.random() * Math.PI * 2;
    const r = 1.5 + Math.random() * 7;
    tuft.position.set(Math.cos(a) * r, 0, Math.sin(a) * r * 0.75 + 1);
    tuft.rotation.y = Math.random() * Math.PI;
    g.add(tuft);
  }
  return g;
}

export function createWorldLabel(text) {
  const c = document.createElement("canvas");
  c.width = 320;
  c.height = 96;
  const g = c.getContext("2d");
  g.clearRect(0, 0, 320, 96);
  g.fillStyle = "rgba(255,252,245,0.94)";
  g.strokeStyle = "rgba(192,57,43,0.55)";
  g.lineWidth = 5;
  const rr = 28;
  g.beginPath();
  g.moveTo(rr, 6);
  g.arcTo(314, 6, 314, 90, rr);
  g.arcTo(314, 90, 6, 90, rr);
  g.arcTo(6, 90, 6, 6, rr);
  g.arcTo(6, 6, 314, 6, rr);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = "#c0392b";
  g.font = "bold 42px system-ui,sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, 160, 50);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
  );
  spr.scale.set(1.6, 0.48, 1);
  spr.visible = false;
  return spr;
}

export function createPad() {
  const pad = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.58, 0.78, 64),
    new THREE.MeshStandardMaterial({
      color: 0xe74c3c, transparent: true, opacity: 0.65,
      roughness: 0.5, side: THREE.DoubleSide, emissive: 0xc0392b, emissiveIntensity: 0.15,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.025;
  pad.add(ring);
  const plate = new THREE.Mesh(
    new THREE.CircleGeometry(0.58, 48),
    new THREE.MeshStandardMaterial({
      color: 0xffd8d0, transparent: true, opacity: 0.4, roughness: 0.75, side: THREE.DoubleSide,
    })
  );
  plate.rotation.x = -Math.PI / 2;
  plate.position.y = 0.02;
  pad.add(plate);
  const badge = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: makeBadgeTexture("1"), transparent: true, depthTest: false })
  );
  badge.scale.set(0.55, 0.55, 1);
  badge.position.y = 0.35;
  pad.add(badge);
  pad.userData.label = badge;
  return pad;
}

export function createTray(envMap) {
  const tray = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({
    color: 0xf0e6d0, roughness: 0.7, metalness: 0.05, envMap, envMapIntensity: 0.2,
  });
  const base = shadow(new THREE.Mesh(new RoundedBoxGeometry(2.4, 0.22, 1.7, 4, 0.08), wood));
  base.position.y = 0.11;
  tray.add(base);
  const rim = shadow(new THREE.Mesh(new RoundedBoxGeometry(2.5, 0.12, 1.8, 3, 0.05), wood.clone()));
  rim.material.color = new THREE.Color(0xe0d4b8);
  rim.position.y = 0.24;
  tray.add(rim);
  return tray;
}
