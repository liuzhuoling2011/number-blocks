/** 程序化贴图（原创，无外部版权素材） */
import * as THREE from "./vendor/three.module.min.js";

function canvas(size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return { c, g: c.getContext("2d") };
}

function toTex(c, opts = {}) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = opts.data ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = opts.repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  if (opts.repeat) tex.repeat.set(opts.repeat, opts.repeat);
  tex.anisotropy = opts.anisotropy || 4;
  tex.needsUpdate = true;
  return tex;
}

/** 塑料红方块：albedo + 轻微磨损边缘 */
export function makePlasticMaps(hex = "#e74c3c") {
  const size = 512;
  const { c, g } = canvas(size);
  // base
  const grd = g.createLinearGradient(0, 0, 0, size);
  grd.addColorStop(0, "#ff8f7a");
  grd.addColorStop(0.45, hex);
  grd.addColorStop(1, "#b83227");
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  // soft noise
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const a = 0.015 + Math.random() * 0.04;
    g.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(80,10,10,${a})`;
    g.fillRect(x, y, 2, 2);
  }
  // edge wear (darker vignette toward borders via radial? use rectangles)
  g.strokeStyle = "rgba(90,20,15,0.22)";
  g.lineWidth = 18;
  g.strokeRect(10, 10, size - 20, size - 20);
  g.strokeStyle = "rgba(255,220,200,0.18)";
  g.lineWidth = 8;
  g.strokeRect(28, 28, size - 56, size - 56);
  // top specular strip hint
  g.fillStyle = "rgba(255,255,255,0.16)";
  g.fillRect(40, 36, size - 80, 48);

  const map = toTex(c);

  // roughness map
  const r = canvas(size);
  r.g.fillStyle = "#a0a0a0";
  r.g.fillRect(0, 0, size, size);
  for (let i = 0; i < 3000; i++) {
    const v = 120 + Math.random() * 80;
    r.g.fillStyle = `rgb(${v},${v},${v})`;
    r.g.fillRect(Math.random() * size, Math.random() * size, 3, 3);
  }
  // smoother center, rougher edges
  const rg = r.g.createRadialGradient(size / 2, size / 2, 40, size / 2, size / 2, size * 0.7);
  rg.addColorStop(0, "rgba(180,180,180,0.5)");
  rg.addColorStop(1, "rgba(60,60,60,0.55)");
  r.g.fillStyle = rg;
  r.g.fillRect(0, 0, size, size);
  const roughnessMap = toTex(r.c, { data: true });

  // simple normal-ish (fake bump via lighting in albedo is enough; provide soft normal)
  const n = canvas(size);
  n.g.fillStyle = "#8080ff";
  n.g.fillRect(0, 0, size, size);
  for (let i = 0; i < 800; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    n.g.fillStyle = `rgba(${120 + Math.random() * 40},${120 + Math.random() * 40},255,0.15)`;
    n.g.beginPath();
    n.g.arc(x, y, 2 + Math.random() * 4, 0, Math.PI * 2);
    n.g.fill();
  }
  const normalMap = toTex(n.c, { data: true });

  return { map, roughnessMap, normalMap };
}

/** 草地 albedo */
export function makeGrassMaps() {
  const size = 512;
  const { c, g } = canvas(size);
  g.fillStyle = "#5fa85a";
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const h = 4 + Math.random() * 10;
    const green = 90 + Math.random() * 90;
    g.strokeStyle = `rgba(${40 + Math.random() * 40},${green},${40 + Math.random() * 30},${0.25 + Math.random() * 0.45})`;
    g.lineWidth = 1 + Math.random();
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (Math.random() - 0.5) * 3, y - h);
    g.stroke();
  }
  // patches
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(${70 + Math.random() * 40},${130 + Math.random() * 50},${60},${0.12})`;
    g.beginPath();
    g.ellipse(Math.random() * size, Math.random() * size, 20 + Math.random() * 40, 12 + Math.random() * 24, Math.random(), 0, Math.PI * 2);
    g.fill();
  }
  return toTex(c, { repeat: 6, anisotropy: 8 });
}

/** 树干 */
export function makeBarkMap() {
  const size = 256;
  const { c, g } = canvas(size);
  g.fillStyle = "#6b4423";
  g.fillRect(0, 0, size, size);
  for (let x = 0; x < size; x += 6) {
    g.strokeStyle = `rgba(40,22,10,${0.15 + Math.random() * 0.35})`;
    g.lineWidth = 1 + Math.random() * 2;
    g.beginPath();
    g.moveTo(x + Math.random() * 3, 0);
    for (let y = 0; y < size; y += 16) {
      g.lineTo(x + Math.sin(y * 0.1) * 3, y);
    }
    g.stroke();
  }
  for (let i = 0; i < 80; i++) {
    g.fillStyle = "rgba(30,15,8,0.25)";
    g.fillRect(Math.random() * size, Math.random() * size, 2, 8 + Math.random() * 16);
  }
  return toTex(c, { repeat: 2 });
}

/** 叶子 */
export function makeLeafMap() {
  const size = 256;
  const { c, g } = canvas(size);
  const grd = g.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size / 2);
  grd.addColorStop(0, "#6fdf7a");
  grd.addColorStop(0.55, "#2f9e4f");
  grd.addColorStop(1, "#1d6b35");
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 600; i++) {
    g.fillStyle = `rgba(255,255,200,${Math.random() * 0.08})`;
    g.beginPath();
    g.arc(Math.random() * size, Math.random() * size, 2, 0, Math.PI * 2);
    g.fill();
  }
  return toTex(c);
}

/** 岩石 */
export function makeRockMap() {
  const size = 256;
  const { c, g } = canvas(size);
  g.fillStyle = "#8a8f8a";
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 2000; i++) {
    const v = 90 + Math.random() * 80;
    g.fillStyle = `rgba(${v},${v - 5},${v - 10},${0.2 + Math.random() * 0.4})`;
    g.beginPath();
    g.arc(Math.random() * size, Math.random() * size, 1 + Math.random() * 6, 0, Math.PI * 2);
    g.fill();
  }
  return toTex(c);
}

/** 天空渐变（背景用） */
export function makeSkyTexture() {
  const c = document.createElement("canvas");
  c.width = 8;
  c.height = 512;
  const g = c.getContext("2d");
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, "#6eb6e8");
  grd.addColorStop(0.45, "#a8d4f0");
  grd.addColorStop(0.72, "#d7eef8");
  grd.addColorStop(1, "#e8f4c8");
  g.fillStyle = grd;
  g.fillRect(0, 0, 8, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

/** 角色脸部（高清、干净） */
export function makeFaceTexture() {
  const size = 512;
  const { c, g } = canvas(size);
  g.clearRect(0, 0, size, size);

  // soft cheek blush
  const blush = (x, y) => {
    const rg = g.createRadialGradient(x, y, 4, x, y, 48);
    rg.addColorStop(0, "rgba(255,120,130,0.45)");
    rg.addColorStop(1, "rgba(255,120,130,0)");
    g.fillStyle = rg;
    g.beginPath();
    g.arc(x, y, 48, 0, Math.PI * 2);
    g.fill();
  };
  blush(130, 310);
  blush(382, 310);

  // eyes white
  const eye = (cx, cy) => {
    g.fillStyle = "#fffef8";
    g.beginPath();
    g.ellipse(cx, cy, 48, 56, 0, 0, Math.PI * 2);
    g.fill();
    // iris
    const ir = g.createRadialGradient(cx - 6, cy - 8, 4, cx, cy, 34);
    ir.addColorStop(0, "#3d5a80");
    ir.addColorStop(0.55, "#1b2838");
    ir.addColorStop(1, "#0d1520");
    g.fillStyle = ir;
    g.beginPath();
    g.arc(cx, cy + 4, 30, 0, Math.PI * 2);
    g.fill();
    // pupil
    g.fillStyle = "#05080c";
    g.beginPath();
    g.arc(cx, cy + 6, 14, 0, Math.PI * 2);
    g.fill();
    // highlights
    g.fillStyle = "rgba(255,255,255,0.95)";
    g.beginPath();
    g.arc(cx - 10, cy - 10, 10, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(cx + 12, cy + 8, 5, 0, Math.PI * 2);
    g.fill();
    // soft lid
    g.strokeStyle = "rgba(30,40,50,0.35)";
    g.lineWidth = 6;
    g.beginPath();
    g.ellipse(cx, cy - 2, 48, 56, 0, Math.PI * 1.15, Math.PI * 1.85);
    g.stroke();
  };
  eye(180, 220);
  eye(332, 220);

  // smile
  g.strokeStyle = "#1a2430";
  g.lineWidth = 14;
  g.lineCap = "round";
  g.beginPath();
  g.arc(256, 300, 70, 0.18 * Math.PI, 0.82 * Math.PI);
  g.stroke();
  // soft mouth highlight
  g.strokeStyle = "rgba(255,255,255,0.25)";
  g.lineWidth = 5;
  g.beginPath();
  g.arc(256, 296, 66, 0.25 * Math.PI, 0.55 * Math.PI);
  g.stroke();

  return toTex(c);
}

/** 太阳光晕 sprite */
export function makeGlowSprite(color = "#ffe08a") {
  const size = 256;
  const { c, g } = canvas(size);
  const rg = g.createRadialGradient(size / 2, size / 2, 8, size / 2, size / 2, size / 2);
  rg.addColorStop(0, color);
  rg.addColorStop(0.25, color);
  rg.addColorStop(0.55, "rgba(255,200,80,0.35)");
  rg.addColorStop(1, "rgba(255,200,80,0)");
  g.fillStyle = rg;
  g.fillRect(0, 0, size, size);
  const tex = toTex(c);
  return tex;
}

/** 数字徽章 */
export function makeBadgeTexture(n = "1") {
  const size = 128;
  const { c, g } = canvas(size);
  g.clearRect(0, 0, size, size);
  g.fillStyle = "#fff8e8";
  g.beginPath();
  g.arc(64, 64, 56, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#c0392b";
  g.lineWidth = 8;
  g.stroke();
  g.fillStyle = "#c0392b";
  g.font = "bold 78px system-ui,sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(String(n), 64, 70);
  return toTex(c);
}
