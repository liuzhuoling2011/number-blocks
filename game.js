/**
 * 数字积木 · 第一集：一 — Three.js 精致小场景
 * 原创美术与音效，非 Numberblocks / 塞尔达官方素材。
 */
import * as THREE from "./vendor/three.module.min.js";
import { RoundedBoxGeometry } from "./vendor/addons/geometries/RoundedBoxGeometry.js";
import { AudioBus } from "./audio.js?v=5";

const canvas = document.getElementById("c");
const overlay = document.getElementById("overlay");
const endcard = document.getElementById("endcard");
const speechEl = document.getElementById("speech");
const speechText = document.getElementById("speech-text");
const hintEl = document.getElementById("hint");
const progressEl = document.getElementById("progress");
const btnStart = document.getElementById("btn-start");
const btnReplay = document.getElementById("btn-replay");
const btnNext = document.getElementById("btn-next");
const btnMute = document.getElementById("btn-mute");

const audio = new AudioBus();
const PHASE = { TITLE: 0, INTRO: 1, EXPLORE: 2, BUILD: 3, CELEBRATE: 4 };
let phase = PHASE.TITLE;
let introStep = 0;
let exploreDone = { sun: false, tree: false, bee: false };
let buildPlaced = false;
let speechTimer = 0;

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b8d8);
scene.fog = new THREE.FogExp2(0xa8cfe0, 0.012);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
const camHome = new THREE.Vector3(0, 5.8, 9.4);
const camDesired = camHome.clone();
const camTarget = new THREE.Vector3(0, 1.0, 0.5);
camera.position.copy(camHome);
camera.lookAt(camTarget);

// cinematic intro camera
let camAnim = null; // {t0, dur, from, to}

// ---------- lights (warm, readable) ----------
const hemi = new THREE.HemisphereLight(0xfff2d6, 0x3d6b45, 0.85);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d2, 1.35);
sun.position.set(6, 14, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 40;
sun.shadow.camera.left = -12;
sun.shadow.camera.right = 12;
sun.shadow.camera.top = 12;
sun.shadow.camera.bottom = -12;
sun.shadow.bias = -0.00025;
sun.shadow.normalBias = 0.03;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xa8d4ff, 0.28);
fill.position.set(-8, 4, -6);
scene.add(fill);

// ---------- ground / meadow ----------
function makeGrassTexture() {
  const s = 256;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d");
  g.fillStyle = "#6faf5e";
  g.fillRect(0, 0, s, s);
  for (let i = 0; i < 1800; i++) {
    const x = Math.random() * s;
    const y = Math.random() * s;
    const shade = 90 + Math.random() * 50;
    g.fillStyle = `rgba(${shade * 0.55},${shade},${shade * 0.4},${0.15 + Math.random() * 0.35})`;
    g.fillRect(x, y, 1 + Math.random() * 2, 2 + Math.random() * 3);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(28, 64),
  new THREE.MeshStandardMaterial({
    map: makeGrassTexture(),
    roughness: 0.92,
    metalness: 0.0,
  })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// soft distant hills
function hill(x, z, r, h, color) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(r, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color, roughness: 0.95 })
  );
  m.scale.y = h / r;
  m.position.set(x, 0, z);
  m.receiveShadow = true;
  scene.add(m);
}
hill(-8, -8, 6, 2.4, 0x5a9a58);
hill(7, -9, 7, 2.8, 0x4f8f52);
hill(0, -12, 9, 3.4, 0x45874a);

// ---------- props ----------
const props = {};

function makeWorldLabel(text) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 96;
  const g = c.getContext("2d");
  g.clearRect(0,0,256,96);
  g.fillStyle = "rgba(255,252,245,0.92)";
  g.strokeStyle = "rgba(192,57,43,0.55)";
  g.lineWidth = 6;
  const r=28;
  g.beginPath();
  g.moveTo(r,8); g.arcTo(248,8,248,88,r); g.arcTo(248,88,8,88,r); g.arcTo(8,88,8,8,r); g.arcTo(8,8,248,8,r);
  g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#c0392b";
  g.font = "bold 44px system-ui,sans-serif";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, 128, 50);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  m.scale.set(1.4, 0.52, 1);
  m.visible = false;
  return m;
}


function makeSunProp() {
  const g = new THREE.Group();
  g.name = "sun";
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.72, 24, 24),
    new THREE.MeshStandardMaterial({
      color: 0xffe566,
      emissive: 0xffb000,
      emissiveIntensity: 0.65,
      roughness: 0.35,
    })
  );
  core.castShadow = true;
  g.add(core);
  const glow = new THREE.PointLight(0xffcc66, 0.9, 10, 2);
  g.add(glow);
  // rays
  for (let i = 0; i < 8; i++) {
    const ray = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.45, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffaa00, emissiveIntensity: 0.4 })
    );
    const a = (i / 8) * Math.PI * 2;
    ray.position.set(Math.cos(a) * 1.05, Math.sin(a) * 1.05, 0);
    ray.rotation.z = a;
    g.add(ray);
  }
  g.position.set(2.0, 2.15, 2.6);
  scene.add(g);
  props.sun = { group: g, hit: core, label: "太阳" };
}

function makeTreeProp() {
  const g = new THREE.Group();
  g.name = "tree";
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.26, 1.4, 10),
    new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 })
  );
  trunk.position.y = 0.7;
  trunk.castShadow = true;
  g.add(trunk);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f9e4f, roughness: 0.75 });
  [[0, 2.0, 0, 1.1], [-0.45, 1.55, 0.2, 0.85], [0.5, 1.6, -0.15, 0.9]].forEach(([x, y, z, r]) => {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), leafMat);
    leaf.position.set(x, y, z);
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    g.add(leaf);
  });
  g.position.set(-2.2, 0, 1.2);
  scene.add(g);
  props.tree = { group: g, hit: trunk, label: "树" };
}

function makeBeeProp() {
  const g = new THREE.Group();
  g.name = "bee";
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.45 })
  );
  body.scale.set(1.35, 0.95, 1.0);
  body.castShadow = true;
  g.add(body);
  const stripe = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.05, 8, 16),
    new THREE.MeshStandardMaterial({ color: 0x2c3e50 })
  );
  stripe.rotation.y = Math.PI / 2;
  g.add(stripe);
  const wingMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, transparent: true, opacity: 0.55, roughness: 0.2, side: THREE.DoubleSide,
  });
  const w1 = new THREE.Mesh(new THREE.CircleGeometry(0.22, 12), wingMat);
  w1.position.set(-0.15, 0.18, 0.05);
  w1.rotation.x = -0.6;
  const w2 = w1.clone();
  w2.position.x = 0.15;
  g.add(w1, w2);
  g.userData.wings = [w1, w2];
  g.position.set(1.7, 1.55, 3.5);
  scene.add(g);
  props.bee = { group: g, hit: body, label: "蜜蜂" };
}


// little meadow flowers (readable silhouettes)
(function scatterFlowers() {
  const colors = [0xff6b81, 0xffe066, 0xffffff, 0xc39bd3];
  for (let i = 0; i < 18; i++) {
    const g = new THREE.Group();
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.025, 0.35, 5),
      new THREE.MeshStandardMaterial({ color: 0x3d8b4a, roughness: 0.85 })
    );
    stem.position.y = 0.175;
    g.add(stem);
    const petal = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 10, 8),
      new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.55 })
    );
    petal.position.y = 0.38;
    petal.scale.y = 0.55;
    g.add(petal);
    const ang = Math.random() * Math.PI * 2;
    const rad = 1.8 + Math.random() * 4.5;
    g.position.set(Math.cos(ang) * rad, 0, Math.sin(ang) * rad * 0.7 + 1.0);
    g.rotation.y = Math.random() * Math.PI;
    scene.add(g);
  }
})();

makeSunProp();
makeTreeProp();
makeBeeProp();

props.sun.labelSprite = makeWorldLabel("太阳 · 1");
props.sun.labelSprite.position.set(0, 1.3, 0);
props.sun.group.add(props.sun.labelSprite);
props.tree.labelSprite = makeWorldLabel("树 · 1");
props.tree.labelSprite.position.set(0, 3.2, 0);
props.tree.group.add(props.tree.labelSprite);
props.bee.labelSprite = makeWorldLabel("蜜蜂 · 1");
props.bee.labelSprite.position.set(0, 0.9, 0);
props.bee.group.add(props.bee.labelSprite);


// ---------- One cube (original character) ----------
function makeFaceTexture() {
  const s = 256;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d");
  // transparent bg — only face features
  g.clearRect(0, 0, s, s);
  // eyes
  g.fillStyle = "#1f2a36";
  g.beginPath(); g.arc(92, 110, 22, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(164, 110, 22, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#fff";
  g.beginPath(); g.arc(98, 104, 8, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(170, 104, 8, 0, Math.PI * 2); g.fill();
  // smile
  g.strokeStyle = "#1f2a36";
  g.lineWidth = 10;
  g.lineCap = "round";
  g.beginPath();
  g.arc(128, 145, 36, 0.15 * Math.PI, 0.85 * Math.PI);
  g.stroke();
  // cheek blush
  g.fillStyle = "rgba(255,140,140,0.35)";
  g.beginPath(); g.ellipse(70, 150, 16, 10, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(186, 150, 16, 10, 0, 0, Math.PI * 2); g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeOneCube() {
  const size = 1.0;
  const geo = new RoundedBoxGeometry(size, size, size, 4, 0.12);
  const faceTex = makeFaceTexture();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xe74c3c,
    roughness: 0.38,
    metalness: 0.08,
  });
  const faceMat = new THREE.MeshStandardMaterial({
    color: 0xe74c3c,
    roughness: 0.38,
    metalness: 0.08,
    map: faceTex,
  });
  // RoundedBox uses BoxGeometry face order: +x -x +y -y +z -z ? Actually multi-material on RoundedBox may not map cleanly.
  // Use single material + plane decal for face instead.
  const mesh = new THREE.Mesh(geo, bodyMat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.72, 0.72),
    new THREE.MeshStandardMaterial({
      map: faceTex,
      transparent: true,
      roughness: 0.5,
      metalness: 0,
      depthWrite: false,
    })
  );
  face.position.set(0, 0.02, size / 2 + 0.01);
  mesh.add(face);

  // small "1" badge
  const badge = new THREE.Mesh(
    new THREE.CircleGeometry(0.18, 20),
    new THREE.MeshStandardMaterial({ color: 0xfff8e7, roughness: 0.35, metalness: 0.05, emissive: 0xfff0c8, emissiveIntensity: 0.15 })
  );
  badge.position.set(0.32, -0.32, size / 2 + 0.015);
  mesh.add(badge);
  const canvas1 = document.createElement("canvas");
  canvas1.width = canvas1.height = 64;
  const cg = canvas1.getContext("2d");
  cg.fillStyle = "#c0392b";
  cg.font = "bold 44px system-ui,sans-serif";
  cg.textAlign = "center";
  cg.textBaseline = "middle";
  cg.fillText("1", 32, 34);
  const t1 = new THREE.CanvasTexture(canvas1);
  t1.colorSpace = THREE.SRGBColorSpace;
  const num = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.22),
    new THREE.MeshBasicMaterial({ map: t1, transparent: true })
  );
  num.position.z = 0.01;
  badge.add(num);

  const wrap = new THREE.Group();
  wrap.add(mesh);
  wrap.position.set(0, size / 2, 3.0);
  wrap.userData = { size, homeY: size / 2, liftY: size / 2 + 0.35, mesh };
  scene.add(wrap);
  return wrap;
}

const one = makeOneCube();

// tray + pad for build phase
const tray = new THREE.Group();
{
  const base = new THREE.Mesh(
    new RoundedBoxGeometry(2.2, 0.25, 1.6, 3, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xf5efe0, roughness: 0.7, metalness: 0.05 })
  );
  base.position.y = 0.12;
  base.castShadow = true;
  base.receiveShadow = true;
  tray.add(base);
  tray.position.set(-2.4, 0, 3.6);
  tray.visible = false;
  scene.add(tray);
}

const pad = new THREE.Group();
{
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.72, 48),
    new THREE.MeshStandardMaterial({
      color: 0xe74c3c, transparent: true, opacity: 0.55, side: THREE.DoubleSide, roughness: 0.6,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  pad.add(ring);
  const plate = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 32),
    new THREE.MeshStandardMaterial({
      color: 0xffd5cf, transparent: true, opacity: 0.35, roughness: 0.8, side: THREE.DoubleSide,
    })
  );
  plate.rotation.x = -Math.PI / 2;
  plate.position.y = 0.015;
  pad.add(plate);
  // floating "1"
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "rgba(192,57,43,0.55)";
  g.font = "bold 90px system-ui";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("1", 64, 72);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.7),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
  );
  label.rotation.x = -Math.PI / 2;
  label.position.y = 0.03;
  pad.add(label);
  pad.userData.label = label;
  pad.position.set(0.6, 0, 1.2);
  pad.visible = false;
  scene.add(pad);
}

const trayCube = makeOneCube();
trayCube.visible = false;
trayCube.position.set(-2.4, 0.5, 3.6);

// ---------- particles (celebrate) ----------
const confetti = [];
function spawnConfetti(n = 50) {
  confetti.forEach((p) => scene.remove(p.mesh));
  confetti.length = 0;
  const colors = [0xe74c3c, 0xf1c40f, 0x3498db, 0x2ecc71, 0x9b59b6, 0xffffff];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.08, 0.04),
      new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.5 })
    );
    m.position.set((Math.random() - 0.5) * 3, 4 + Math.random() * 2, (Math.random() - 0.5) * 3);
    scene.add(m);
    confetti.push({
      mesh: m,
      v: new THREE.Vector3((Math.random() - 0.5) * 2, 1 + Math.random() * 2, (Math.random() - 0.5) * 2),
      spin: new THREE.Vector3(Math.random(), Math.random(), Math.random()),
    });
  }
}

// ---------- UI helpers ----------
function showSpeech(text, ms = 2800) {
  speechText.textContent = text;
  speechEl.hidden = false;
  clearTimeout(speechTimer);
  if (ms > 0) speechTimer = setTimeout(() => { speechEl.hidden = true; }, ms);
}
function hideSpeech() {
  speechEl.hidden = true;
  clearTimeout(speechTimer);
}
function showHint(t, ms = 2000) {
  hintEl.textContent = t;
  hintEl.hidden = false;
  clearTimeout(showHint._t);
  if (ms > 0) showHint._t = setTimeout(() => { hintEl.hidden = true; }, ms);
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

// ---------- raycasting / drag ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hitPoint = new THREE.Vector3();
let dragging = null; // 'one' | 'tray'
let dragOffset = new THREE.Vector3();
let pointerDown = false;

function setPointerFromEvent(e) {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  pointer.x = x * 2 - 1;
  pointer.y = -(y * 2 - 1);
}

function projectToGround() {
  raycaster.setFromCamera(pointer, camera);
  return raycaster.ray.intersectPlane(groundPlane, hitPoint);
}

function pickProp() {
  raycaster.setFromCamera(pointer, camera);
  const hits = [];
  for (const id of Object.keys(props)) {
    const p = props[id];
    const hs = raycaster.intersectObject(p.group, true);
    if (hs.length) hits.push({ id, dist: hs[0].distance });
  }
  hits.sort((a, b) => a.dist - b.dist);
  return hits[0]?.id || null;
}

function pickCube(group) {
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObject(group, true).length > 0;
}

async function ensureAudio() {
  await audio.unlock();
}

function onPointerDown(e) {
  if (phase === PHASE.TITLE || phase === PHASE.CELEBRATE) return;
  if (endcard.hidden === false) return;
  e.preventDefault();
  ensureAudio();
  setPointerFromEvent(e);
  pointerDown = true;

  if (phase === PHASE.INTRO) {
    advanceIntro();
    return;
  }

  if (phase === PHASE.EXPLORE) {
    const pid = pickProp();
    if (pid) {
      onTapProp(pid);
      return;
    }
    if (pickCube(one)) {
      dragging = "one";
      canvas.classList.add("grabbing");
      projectToGround();
      dragOffset.copy(one.position).sub(hitPoint);
      dragOffset.y = 0;
      one.position.y = one.userData.liftY;
      audio.pickup();
    }
    return;
  }

  if (phase === PHASE.BUILD && !buildPlaced) {
    if (pickCube(trayCube)) {
      dragging = "tray";
      canvas.classList.add("grabbing");
      projectToGround();
      dragOffset.copy(trayCube.position).sub(hitPoint);
      dragOffset.y = 0;
      trayCube.position.y = trayCube.userData.liftY;
      audio.pickup();
    }
  }
}

function onPointerMove(e) {
  if (!pointerDown || !dragging) return;
  setPointerFromEvent(e);
  if (!projectToGround()) return;
  const target = dragging === "one" ? one : trayCube;
  const x = THREE.MathUtils.clamp(hitPoint.x + dragOffset.x, -7, 7);
  const z = THREE.MathUtils.clamp(hitPoint.z + dragOffset.z, -5, 6);
  target.position.x = x;
  target.position.z = z;
  target.position.y = target.userData.liftY;
}

function onPointerUp(e) {
  if (!pointerDown) return;
  pointerDown = false;
  canvas.classList.remove("grabbing");
  if (!dragging) return;
  const target = dragging === "one" ? one : trayCube;
  const kind = dragging;
  dragging = null;

  if (kind === "tray" && phase === PHASE.BUILD && !buildPlaced) {
    const dx = target.position.x - pad.position.x;
    const dz = target.position.z - pad.position.z;
    if (Math.hypot(dx, dz) < 0.85) {
      target.position.set(pad.position.x, target.userData.homeY, pad.position.z);
      buildPlaced = true;
      pad.userData.label.visible = false;
      audio.putdown();
      audio.success();
      showSpeech("正好一块！这就是「一」。", 2200);
      setTimeout(() => startCelebrate(), 1000);
      return;
    }
    // bounce back
    target.position.set(-2.4, target.userData.homeY, 3.6);
    audio.bounce();
    showSpeech("轻轻放到光圈里哦～", 1800);
    return;
  }

  target.position.y = target.userData.homeY;
  audio.putdown();
}

canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
window.addEventListener("pointermove", onPointerMove, { passive: false });
window.addEventListener("pointerup", onPointerUp, { passive: false });
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

function onTapProp(id) {
  if (phase !== PHASE.EXPLORE) return;
  const p = props[id];
  if (!exploreDone[id]) {
    exploreDone[id] = true;
    progressEl.querySelector(`[data-id="${id}"]`)?.classList.add("done");
    if (p.labelSprite) p.labelSprite.visible = false;
    audio.countOne();
    // pulse scale
    p.group.userData.pulse = performance.now();
    showSpeech(`${p.label} —— 1 个！`, 1600);
    if (exploreDone.sun && exploreDone.tree && exploreDone.bee) {
      setTimeout(() => startBuild(), 800);
    }
  } else {
    audio.countOne();
    showSpeech(`还是 1 个${p.label}。`, 1200);
  }
}

// ---------- phases ----------
function startIntro() {
  phase = PHASE.INTRO;
  introStep = 0;
  overlay.hidden = true;
  endcard.hidden = true;
  progressEl.hidden = true;
  tray.visible = false;
  pad.visible = false;
  trayCube.visible = false;
  one.visible = true;
  one.position.set(0, one.userData.homeY, 3.0);
  one.scale.setScalar(0.01);
  one.userData.spawnT = performance.now();
  // camera push-in
  camDesired.copy(camHome);
  camAnim = {
    t0: performance.now(),
    dur: 1800,
    from: camHome.clone().add(new THREE.Vector3(2.5, 4, 7)),
    to: camHome.clone(),
  };
  audio.appear();
  showSpeech("你好！我是「一」。", 0);
  showHint("点一下继续", 0);
}

function advanceIntro() {
  introStep++;
  audio.ui();
  if (introStep === 1) {
    showSpeech("只有一块。一就是一。", 0);
  } else if (introStep === 2) {
    showSpeech("拖我到处走走，再点点太阳、树和蜜蜂——每样都是 1 个！", 0);
  } else {
    hintEl.hidden = true;
    startExplore();
  }
}

function startExplore() {
  phase = PHASE.EXPLORE;
  exploreDone = { sun: false, tree: false, bee: false };
  progressEl.querySelectorAll("span").forEach((s) => s.classList.remove("done"));
  progressEl.hidden = false;
  for (const id of Object.keys(props)) {
    if (props[id].labelSprite) props[id].labelSprite.visible = true;
  }
  showSpeech("点一点：太阳、树、蜜蜂。每样都是「1」～", 3200);
}

function startBuild() {
  phase = PHASE.BUILD;
  buildPlaced = false;
  progressEl.hidden = true;
  for (const id of Object.keys(props)) {
    if (props[id].labelSprite) props[id].labelSprite.visible = false;
  }
  one.visible = false;
  tray.visible = true;
  pad.visible = true;
  pad.userData.label.visible = true;
  trayCube.visible = true;
  trayCube.position.set(-2.4, trayCube.userData.homeY, 3.6);
  showSpeech("从积木盒拖出一块，放到光圈上，做出「一」。", 3800);
  // gentle camera nudge
  camDesired.set(0.5, 7.8, 10.2);
  camAnim = {
    t0: performance.now(),
    dur: 900,
    from: camera.position.clone(),
    to: camDesired.clone(),
  };
}

function startCelebrate() {
  phase = PHASE.CELEBRATE;
  hideSpeech();
  spawnConfetti(55);
  one.visible = true;
  one.position.set(0, one.userData.homeY, 0.5);
  one.scale.setScalar(1);
  trayCube.visible = false;
  tray.visible = false;
  pad.visible = false;
  setTimeout(() => { endcard.hidden = false; }, 900);
}

btnStart.addEventListener("click", async () => {
  await ensureAudio();
  audio.ui();
  startIntro();
});
btnReplay.addEventListener("click", async () => {
  await ensureAudio();
  audio.ui();
  confetti.forEach((p) => scene.remove(p.mesh));
  confetti.length = 0;
  endcard.hidden = true;
  startIntro();
});
btnNext.addEventListener("click", async () => {
  await ensureAudio();
  audio.ui();
  showSpeech("下一集还在准备中，先再玩一遍「一」吧！", 2200);
});
btnMute.addEventListener("click", async () => {
  await ensureAudio();
  audio.setMuted(!audio.muted);
  btnMute.classList.toggle("muted", audio.muted);
  btnMute.textContent = audio.muted ? "✕" : "♪";
});

// ---------- animate ----------
const clock = new THREE.Clock();

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  const now = performance.now();

  // camera anim
  if (camAnim) {
    const u = Math.min(1, (now - camAnim.t0) / camAnim.dur);
    const e = easeInOut(u);
    camera.position.lerpVectors(camAnim.from, camAnim.to, e);
    camera.lookAt(camTarget);
    if (u >= 1) camAnim = null;
  } else if (phase !== PHASE.TITLE && !dragging) {
    // gentle breathing around desired framing
    const ox = Math.sin(t * 0.15) * 0.22;
    const oy = Math.sin(t * 0.12) * 0.08;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, camDesired.x + ox, 1.2, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, camDesired.y + oy, 1.2, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, camDesired.z, 1.2, dt);
    camera.lookAt(camTarget);
  }

  // spawn pop for One
  if (one.visible && one.userData.spawnT) {
    const u = Math.min(1, (now - one.userData.spawnT) / 500);
    const s = easeInOut(u);
    one.scale.setScalar(s);
    one.position.y = one.userData.homeY + (1 - s) * 1.2;
    one.rotation.y = (1 - s) * Math.PI;
    if (u >= 1) {
      one.userData.spawnT = 0;
      one.scale.setScalar(1);
      one.position.y = dragging === "one" ? one.userData.liftY : one.userData.homeY;
      one.rotation.y = 0;
    }
  } else if (one.visible && !dragging) {
    one.position.y = one.userData.homeY + Math.sin(t * 2.0) * 0.04;
    one.rotation.y = Math.sin(t * 0.8) * 0.08;
  }

  // bee bob + wings
  const bee = props.bee.group;
  bee.position.y = 1.55 + Math.sin(t * 3.2) * 0.18;
  bee.position.x = 1.7 + Math.sin(t * 0.7) * 0.25;
  bee.rotation.y = Math.sin(t * 0.7) * 0.4;
  if (bee.userData.wings) {
    const flap = Math.sin(t * 28) * 0.5;
    bee.userData.wings[0].rotation.z = -0.4 + flap;
    bee.userData.wings[1].rotation.z = 0.4 - flap;
  }

  // sun rays spin
  props.sun.group.children.forEach((ch, i) => {
    if (i === 0 || ch.isLight) return;
    ch.rotation.z += dt * 0.4;
  });

  // prop pulse
  for (const id of Object.keys(props)) {
    const g = props[id].group;
    if (g.userData.pulse) {
      const u = Math.min(1, (now - g.userData.pulse) / 400);
      const s = 1 + Math.sin(u * Math.PI) * 0.18;
      g.scale.setScalar(s);
      if (u >= 1) { g.scale.setScalar(1); g.userData.pulse = 0; }
    }
  }

  // pad breathe
  if (pad.visible) {
    const s = 1 + Math.sin(t * 2.5) * 0.04;
    pad.scale.set(s, 1, s);
  }

  // confetti
  for (const p of confetti) {
    p.v.y -= 4.5 * dt;
    p.mesh.position.addScaledVector(p.v, dt);
    p.mesh.rotation.x += p.spin.x * dt * 4;
    p.mesh.rotation.y += p.spin.y * dt * 4;
  }

  // title idle: slow camera
  if (phase === PHASE.TITLE) {
    camera.position.set(
      camHome.x + Math.sin(t * 0.25) * 1.2,
      camHome.y + 0.4,
      camHome.z + Math.cos(t * 0.25) * 0.8
    );
    camera.lookAt(camTarget);
    one.position.set(0, one.userData.homeY + Math.sin(t * 2) * 0.06, 2.6);
    one.rotation.y = t * 0.4;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

// boot title scene
one.visible = true;
requestAnimationFrame(tick);
