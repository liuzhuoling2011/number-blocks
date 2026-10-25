/**
 * 数字积木 · 第一集：一 — 精致手作感 3D
 * 原创美术与音效，非 Numberblocks / 塞尔达官方素材。
 */
import * as THREE from "./vendor/three.module.min.js";
import { RoomEnvironment } from "./vendor/addons/environments/RoomEnvironment.js";
import { AudioBus } from "./audio.js?v=7";
import {
  createOneCharacter,
  createBee,
  createTree,
  createSun,
  createFlower,
  createRock,
  createTerrain,
  createMountains,
  createSkyDome,
  createGrassTufts,
  createWorldLabel,
  createPad,
  createTray,
} from "./assets.js?v=7";

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
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xb5d6ea, 0.014);

const pmrem = new THREE.PMREMGenerator(renderer);
const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
scene.environment = envRT.texture;
const envMap = envRT.texture;

const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 120);
const camHome = new THREE.Vector3(0, 5.6, 9.2);
const camDesired = camHome.clone();
const camTarget = new THREE.Vector3(0, 1.05, 0.6);
camera.position.copy(camHome);
camera.lookAt(camTarget);
let camAnim = null;

// lights
const hemi = new THREE.HemisphereLight(0xfff1d6, 0x3d6b45, 0.7);
scene.add(hemi);
const sunLight = new THREE.DirectionalLight(0xfff0d2, 1.45);
sunLight.position.set(7, 16, 5);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 45;
Object.assign(sunLight.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14 });
sunLight.shadow.bias = -0.0002;
sunLight.shadow.normalBias = 0.035;
scene.add(sunLight);
scene.add(new THREE.DirectionalLight(0xa8d4ff, 0.32).translateX(-8).translateY(5).translateZ(-6));

// world
scene.add(createSkyDome());
scene.add(createTerrain(envMap));
scene.add(createMountains());
scene.add(createGrassTufts(70));

const flowerColors = [0xff6b81, 0xffe066, 0xffffff, 0xc39bd3, 0xff9f68];
for (let i = 0; i < 16; i++) {
  const f = createFlower(flowerColors[i % flowerColors.length], envMap);
  const a = Math.random() * Math.PI * 2;
  const r = 1.6 + Math.random() * 5.5;
  f.position.set(Math.cos(a) * r, 0, Math.sin(a) * r * 0.7 + 1.2);
  f.rotation.y = Math.random() * Math.PI;
  f.scale.setScalar(0.85 + Math.random() * 0.4);
  scene.add(f);
}
[[-5.5, 2.2], [4.8, -1.5], [-3.2, -3.5], [5.5, 3.0]].forEach(([x, z], i) => {
  const rock = createRock(envMap);
  rock.position.set(x, 0.05, z);
  rock.rotation.y = i;
  scene.add(rock);
});

// props
const props = {};

const sunProp = createSun();
sunProp.position.set(1.65, 2.15, 2.35);
scene.add(sunProp);
const sunLabel = createWorldLabel("太阳 · 1");
sunLabel.position.set(0, 1.45, 0);
sunProp.add(sunLabel);
props.sun = { group: sunProp, label: "太阳", labelSprite: sunLabel };

const treeProp = createTree(envMap);
treeProp.position.set(-2.05, 0, 1.35);
treeProp.scale.setScalar(1.05);
scene.add(treeProp);
const treeLabel = createWorldLabel("树 · 1");
treeLabel.position.set(0, 3.5, 0);
treeProp.add(treeLabel);
props.tree = { group: treeProp, label: "树", labelSprite: treeLabel };

const beeProp = createBee(envMap);
beeProp.position.set(1.25, 1.5, 3.35);
beeProp.scale.setScalar(1.15);
scene.add(beeProp);
const beeLabel = createWorldLabel("蜜蜂 · 1");
beeLabel.position.set(0, 0.95, 0);
beeProp.add(beeLabel);
props.bee = { group: beeProp, label: "蜜蜂", labelSprite: beeLabel };

const one = createOneCharacter(envMap);
one.position.set(0, 0, 3.0);
one.userData.baseY = 0;
scene.add(one);

const trayCube = createOneCharacter(envMap);
trayCube.visible = false;
trayCube.position.set(-2.4, 0, 3.6);
trayCube.userData.baseY = 0;
scene.add(trayCube);

const tray = createTray(envMap);
tray.position.set(-2.4, 0, 3.6);
tray.visible = false;
scene.add(tray);

const pad = createPad();
pad.position.set(0.55, 0, 1.25);
pad.visible = false;
scene.add(pad);

// confetti
const confetti = [];
function spawnConfetti(n = 70) {
  confetti.forEach((p) => scene.remove(p.mesh));
  confetti.length = 0;
  const colors = [0xe74c3c, 0xf1c40f, 0x3498db, 0x2ecc71, 0x9b59b6, 0xffffff];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.07, 0.03),
      new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.4, envMap, envMapIntensity: 0.3 })
    );
    m.position.set((Math.random() - 0.5) * 4, 3.5 + Math.random() * 2, (Math.random() - 0.5) * 3);
    scene.add(m);
    confetti.push({
      mesh: m,
      v: new THREE.Vector3((Math.random() - 0.5) * 2.5, 1 + Math.random() * 2.5, (Math.random() - 0.5) * 2),
      spin: new THREE.Vector3(Math.random(), Math.random(), Math.random()),
    });
  }
}

// UI helpers
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
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

// input
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hitPoint = new THREE.Vector3();
let dragging = null;
let dragOffset = new THREE.Vector3();
let pointerDown = false;

function setPointerFromEvent(e) {
  const r = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
}
function projectToGround() {
  raycaster.setFromCamera(pointer, camera);
  return raycaster.ray.intersectPlane(groundPlane, hitPoint);
}
function pickProp() {
  raycaster.setFromCamera(pointer, camera);
  const hits = [];
  for (const id of Object.keys(props)) {
    const hs = raycaster.intersectObject(props[id].group, true);
    if (hs.length) hits.push({ id, dist: hs[0].distance });
  }
  hits.sort((a, b) => a.dist - b.dist);
  return hits[0]?.id || null;
}
function pickCube(group) {
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObject(group, true).length > 0;
}
async function ensureAudio() { await audio.unlock(); }

function onPointerDown(e) {
  if (phase === PHASE.TITLE || !endcard.hidden) return;
  e.preventDefault();
  ensureAudio();
  setPointerFromEvent(e);
  pointerDown = true;

  if (phase === PHASE.INTRO) { advanceIntro(); return; }

  if (phase === PHASE.EXPLORE) {
    const pid = pickProp();
    if (pid) { onTapProp(pid); return; }
    if (pickCube(one)) {
      dragging = "one";
      canvas.classList.add("grabbing");
      projectToGround();
      dragOffset.copy(one.position).sub(hitPoint); dragOffset.y = 0;
      one.position.y = one.userData.liftY;
      audio.pickup();
    }
    return;
  }

  if (phase === PHASE.BUILD && !buildPlaced && pickCube(trayCube)) {
    dragging = "tray";
    canvas.classList.add("grabbing");
    projectToGround();
    dragOffset.copy(trayCube.position).sub(hitPoint); dragOffset.y = 0;
    trayCube.position.y = trayCube.userData.liftY;
    audio.pickup();
  }
}

function onPointerMove(e) {
  if (!pointerDown || !dragging) return;
  setPointerFromEvent(e);
  if (!projectToGround()) return;
  const target = dragging === "one" ? one : trayCube;
  target.position.x = THREE.MathUtils.clamp(hitPoint.x + dragOffset.x, -7, 7);
  target.position.z = THREE.MathUtils.clamp(hitPoint.z + dragOffset.z, -5, 6);
  target.position.y = target.userData.liftY;
}

function onPointerUp() {
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
    if (Math.hypot(dx, dz) < 0.9) {
      target.position.set(pad.position.x, 0, pad.position.z);
      target.userData.baseY = 0;
      buildPlaced = true;
      pad.userData.label.visible = false;
      audio.putdown();
      audio.success();
      showSpeech("正好一块！这就是「一」。", 2200);
      setTimeout(() => startCelebrate(), 1000);
      return;
    }
    target.position.set(-2.4, 0, 3.6);
    target.userData.baseY = 0;
    audio.bounce();
    showSpeech("轻轻放到光圈里哦～", 1800);
    return;
  }
  target.position.y = 0;
  target.userData.baseY = 0;
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

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

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
  one.position.set(0, 0, 3.0);
  one.userData.baseY = 0;
  one.scale.setScalar(0.01);
  one.userData.spawnT = performance.now();
  camDesired.copy(camHome);
  camAnim = {
    t0: performance.now(), dur: 1800,
    from: camHome.clone().add(new THREE.Vector3(2.5, 3.5, 6)),
    to: camHome.clone(),
  };
  audio.appear();
  showSpeech("你好！我是「一」。", 0);
  showHint("点一下继续", 0);
}

function advanceIntro() {
  introStep++;
  audio.ui();
  if (introStep === 1) showSpeech("只有一块。一就是一。", 0);
  else if (introStep === 2) showSpeech("拖我到处走走，再点点太阳、树和蜜蜂——每样都是 1 个！", 0);
  else { hintEl.hidden = true; startExplore(); }
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
  trayCube.position.set(-2.4, 0, 3.6);
  showSpeech("从积木盒拖出一块，放到光圈上，做出「一」。", 3800);
  camDesired.set(0.5, 7.2, 9.8);
  camAnim = {
    t0: performance.now(), dur: 900,
    from: camera.position.clone(),
    to: camDesired.clone(),
  };
}

function startCelebrate() {
  phase = PHASE.CELEBRATE;
  hideSpeech();
  spawnConfetti(70);
  one.visible = true;
  one.position.set(0, 0, 0.6);
  one.scale.setScalar(1);
  trayCube.visible = false;
  tray.visible = false;
  pad.visible = false;
  setTimeout(() => { endcard.hidden = false; }, 900);
}

btnStart.addEventListener("click", async () => { await ensureAudio(); audio.ui(); startIntro(); });
btnReplay.addEventListener("click", async () => {
  await ensureAudio(); audio.ui();
  confetti.forEach((p) => scene.remove(p.mesh)); confetti.length = 0;
  endcard.hidden = true; startIntro();
});
btnNext.addEventListener("click", async () => {
  await ensureAudio(); audio.ui();
  showSpeech("下一集还在准备中，先再玩一遍「一」吧！", 2200);
});
btnMute.addEventListener("click", async () => {
  await ensureAudio();
  audio.setMuted(!audio.muted);
  btnMute.classList.toggle("muted", audio.muted);
  btnMute.textContent = audio.muted ? "✕" : "♪";
});

const clock = new THREE.Clock();

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  const now = performance.now();

  if (camAnim) {
    const u = Math.min(1, (now - camAnim.t0) / camAnim.dur);
    camera.position.lerpVectors(camAnim.from, camAnim.to, easeInOut(u));
    camera.lookAt(camTarget);
    if (u >= 1) camAnim = null;
  } else if (phase !== PHASE.TITLE && !dragging) {
    const ox = Math.sin(t * 0.15) * 0.2;
    const oy = Math.sin(t * 0.12) * 0.08;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, camDesired.x + ox, 1.2, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, camDesired.y + oy, 1.2, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, camDesired.z, 1.2, dt);
    camera.lookAt(camTarget);
  }

  // One spawn
  if (one.visible && one.userData.spawnT) {
    const u = Math.min(1, (now - one.userData.spawnT) / 550);
    const s = easeInOut(u);
    one.scale.setScalar(s);
    one.position.y = (1 - s) * 1.4;
    one.rotation.y = (1 - s) * Math.PI;
    if (u >= 1) {
      one.userData.spawnT = 0;
      one.scale.setScalar(1);
      one.rotation.y = 0;
      one.position.y = dragging === "one" ? one.userData.liftY : 0;
      one.userData.baseY = 0;
    }
  } else if (one.visible && !dragging && phase !== PHASE.TITLE) {
    one.userData.breathe?.(t);
    one.rotation.y = Math.sin(t * 0.7) * 0.1;
  }

  if (trayCube.visible && !dragging) {
    trayCube.userData.breathe?.(t + 1.2);
  }

  // bee flight + flutter
  const bee = beeProp;
  bee.position.y = 1.5 + Math.sin(t * 3.0) * 0.18;
  bee.position.x = 1.25 + Math.sin(t * 0.65) * 0.22;
  bee.position.z = 3.35 + Math.cos(t * 0.55) * 0.15;
  bee.rotation.y = Math.sin(t * 0.65) * 0.5 + 0.3;
  bee.rotation.z = Math.sin(t * 2.2) * 0.08;
  bee.userData.flutter?.(t);

  // sun spin
  if (sunProp.userData.rays) sunProp.userData.rays.rotation.z += dt * 0.25;
  sunProp.userData.glow.material.opacity = 0.7 + Math.sin(t * 2) * 0.12;

  // tree canopy sway
  if (treeProp.userData.canopy) {
    treeProp.userData.canopy.rotation.z = Math.sin(t * 0.6) * 0.03;
    treeProp.userData.canopy.rotation.x = Math.cos(t * 0.45) * 0.02;
  }

  // prop pulse
  for (const id of Object.keys(props)) {
    const g = props[id].group;
    if (g.userData.pulse) {
      const u = Math.min(1, (now - g.userData.pulse) / 400);
      g.scale.setScalar(1 + Math.sin(u * Math.PI) * 0.12);
      if (u >= 1) { g.scale.setScalar(id === "tree" ? 1.05 : 1); g.userData.pulse = 0; }
    }
  }

  if (pad.visible) {
    const s = 1 + Math.sin(t * 2.4) * 0.04;
    pad.scale.set(s, 1, s);
  }

  for (const p of confetti) {
    p.v.y -= 5 * dt;
    p.mesh.position.addScaledVector(p.v, dt);
    p.mesh.rotation.x += p.spin.x * dt * 5;
    p.mesh.rotation.y += p.spin.y * dt * 5;
  }

  if (phase === PHASE.TITLE) {
    camera.position.set(
      camHome.x + Math.sin(t * 0.22) * 1.1,
      camHome.y + 0.35,
      camHome.z + Math.cos(t * 0.22) * 0.7
    );
    camera.lookAt(camTarget);
    one.position.set(0, Math.sin(t * 2) * 0.05, 2.7);
    one.userData.baseY = one.position.y;
    one.rotation.y = t * 0.35;
    one.userData.breathe?.(t);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

one.visible = true;
requestAnimationFrame(tick);
