import * as THREE from 'three';

export type Meadow = {
  update(): void;
};

function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function grassTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法绘制草地');
  const rand = mulberry32(11);
  ctx.fillStyle = '#6fbf5c';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 90; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 18 + rand() * 54;
    const light = rand() > 0.45;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, light ? 'rgba(186, 230, 140, 0.45)' : 'rgba(62, 140, 58, 0.32)');
    grd.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 140; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 1, y - (3 + rand() * 6));
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function makeSky(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(80, 28, 18);
  const pos = geo.attributes.position;
  if (!pos) throw new Error('天空几何缺少顶点');
  const colors = new Float32Array(pos.count * 3);
  const zenith = new THREE.Color('#9ecff2');
  const mid = new THREE.Color('#e5f3fb');
  const horizon = new THREE.Color('#f4efe6');
  const warm = new THREE.Color('#ffe4c6');
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i += 1) {
    const h = pos.getY(i) / 80;
    tmp.copy(horizon);
    if (h > 0) tmp.lerp(mid, Math.min(1, h / 0.3));
    if (h > 0.2) tmp.lerp(zenith, Math.min(1, (h - 0.2) / 0.7));
    const glow = h < 0.45 && h > -0.05 ? 1 - Math.abs(h - 0.12) / 0.4 : 0;
    if (glow > 0) tmp.lerp(warm, glow * 0.42);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const sky = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    }),
  );
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  return sky;
}

export function buildMeadow(scene: THREE.Scene, renderer: THREE.WebGLRenderer): Meadow {
  scene.background = new THREE.Color('#f4efe6');
  scene.fog = new THREE.Fog(0xf4efe6, 18, 36);
  scene.add(makeSky());

  const hemi = new THREE.HemisphereLight(0xfff8f1, 0x86b86e, 0.78);
  scene.add(hemi);
  scene.add(new THREE.AmbientLight(0xfff5ee, 0.32));

  const key = new THREE.DirectionalLight(0xfff4e6, 2.55);
  key.position.set(3.2, 7.6, 4.8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.4;
  key.shadow.camera.far = 26;
  key.shadow.camera.left = -7;
  key.shadow.camera.right = 7;
  key.shadow.camera.top = 7;
  key.shadow.camera.bottom = -7;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.03;
  key.shadow.intensity = 0.42;
  scene.add(key);
  scene.add(key.target);

  const fill = new THREE.DirectionalLight(0xffd9ce, 0.85);
  fill.position.set(-4.4, 3.2, 3.6);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffffff, 0.28);
  rim.position.set(-1.5, 4.2, -4.5);
  scene.add(rim);

  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({
      map: grassTexture(renderer),
      color: 0xffffff,
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0,
    }),
  );
  grass.rotation.x = -Math.PI / 2;
  grass.receiveShadow = true;
  scene.add(grass);

  const stage = new THREE.Mesh(
    new THREE.CircleGeometry(3.15, 48),
    new THREE.MeshBasicMaterial({
      color: 0xd4f0b8,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    }),
  );
  stage.rotation.x = -Math.PI / 2;
  stage.position.y = 0.006;
  scene.add(stage);

  const hills: { p: [number, number, number]; s: [number, number, number]; c: number }[] = [
    { p: [-3.6, 0.15, -6.4], s: [2.7, 0.82, 1.7], c: 0xd5e3d2 },
    { p: [0.6, 0.05, -7.6], s: [3.5, 1.05, 2.2], c: 0xc5d4e6 },
    { p: [3.8, 0.1, -6.1], s: [2.3, 0.7, 1.55], c: 0xe4ecda },
  ];
  for (const hill of hills) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 20, 14),
      new THREE.MeshStandardMaterial({ color: hill.c, roughness: 1, metalness: 0, envMapIntensity: 0 }),
    );
    mesh.position.set(hill.p[0], hill.p[1], hill.p[2]);
    mesh.scale.set(hill.s[0], hill.s[1], hill.s[2]);
    scene.add(mesh);
  }

  return {
    update() {
      /* Hills and grass stay still. FIND props animate themselves. */
    },
  };
}
