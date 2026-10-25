/* 数字积木 · 第一集：一
 * 原创美术与玩法，非 Numberblocks 官方素材。
 */
(() => {
  "use strict";

  const W = 720;
  const H = 480;
  const UNIT = 64; // 单位方块边长（逻辑像素）

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");
  const cardTitle = document.getElementById("card-title");
  const cardBody = document.getElementById("card-body");
  const cardBtns = document.getElementById("card-btns");
  const speechEl = document.getElementById("speech");
  const speechText = document.getElementById("speech-text");
  const btnSkip = document.getElementById("btn-skip");

  let dpr = 1;
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  // ---------- state ----------
  const PHASE = {
    TITLE: "title",
    INTRO: "intro",
    EXPLORE: "explore",
    BUILD: "build",
    CELEBRATE: "celebrate",
  };
  let phase = PHASE.TITLE;
  let t0 = performance.now();
  let phaseT = 0;
  let pointer = { x: 0, y: 0, down: false, id: null };
  let drag = null; // { kind, ox, oy }
  let confetti = [];
  let bounce = null; // tray cube bounce-back anim
  let exploreDone = { sun: false, tree: false, bee: false };
  let explorePulse = null; // { id, t }
  let buildPlaced = false;
  let buildFlash = 0;
  let onePos = { x: W / 2 - UNIT / 2, y: H / 2 - UNIT / 2 };
  let trayCube = { x: 48, y: H - 48 - UNIT, homeX: 48, homeY: H - 48 - UNIT };
  let pad = { x: W / 2 - UNIT / 2, y: H / 2 - UNIT / 2 + 20, w: UNIT, h: UNIT };
  let introStep = 0;
  let lastTap = 0;

  // 场景道具（可点计数）
  const props = [
    { id: "sun",  label: "太阳", x: 560, y: 48,  r: 36 },
    { id: "tree", label: "树",   x: 120, y: 250, r: 42 },
    { id: "bee",  label: "蜜蜂", x: 520, y: 220, r: 28 },
  ];

  // ---------- resize ----------
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    scale = Math.min(vw / W, vh / H);
    const cssW = Math.floor(W * scale);
    const cssH = Math.floor(H * scale);
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rect = canvas.getBoundingClientRect();
    offsetX = rect.left;
    offsetY = rect.top;
  }
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", () => setTimeout(resize, 120));
  resize();

  // ---------- helpers ----------
  function now() { return (performance.now() - t0) / 1000; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function dist(ax, ay, bx, by) {
    const dx = ax - bx, dy = ay - by;
    return Math.hypot(dx, dy);
  }
  function hitRect(px, py, r) {
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  }
  function clientToGame(cx, cy) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (cx - rect.left) / (rect.width / W),
      y: (cy - rect.top) / (rect.height / H),
    };
  }

  function showSpeech(text, ms = 2800) {
    speechText.textContent = text;
    speechEl.hidden = false;
    clearTimeout(showSpeech._t);
    if (ms > 0) {
      showSpeech._t = setTimeout(() => { speechEl.hidden = true; }, ms);
    }
  }
  function hideSpeech() {
    speechEl.hidden = true;
    clearTimeout(showSpeech._t);
  }

  function showCard(title, body, buttons) {
    cardTitle.textContent = title;
    cardBody.textContent = body;
    cardBtns.innerHTML = "";
    buttons.forEach((b) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = b.primary ? "btn-primary" : "btn-secondary";
      btn.textContent = b.label;
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        b.onClick();
      });
      cardBtns.appendChild(btn);
    });
    overlay.hidden = false;
  }
  function hideCard() { overlay.hidden = true; }

  // ---------- drawing: original One block ----------
  function drawOneBlock(x, y, size, opts = {}) {
    const s = size;
    const face = opts.face !== false;
    const glow = opts.glow || 0;
    const bob = opts.bob || 0;
    const yy = y + bob;

    ctx.save();
    if (glow > 0) {
      ctx.shadowColor = `rgba(231,76,60,${0.35 + glow * 0.4})`;
      ctx.shadowBlur = 18 + glow * 12;
    }

    // 立体顶面 / 侧面（原创几何，非官方造型）
    const depth = s * 0.18;
    // 顶
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.lineTo(x + s * 0.55, yy - depth);
    ctx.lineTo(x + s + s * 0.18, yy - depth * 0.35);
    ctx.lineTo(x + s, yy);
    ctx.closePath();
    ctx.fillStyle = "#ff8a7a";
    ctx.fill();

    // 右侧面
    ctx.beginPath();
    ctx.moveTo(x + s, yy);
    ctx.lineTo(x + s + s * 0.18, yy - depth * 0.35);
    ctx.lineTo(x + s + s * 0.18, yy + s - depth * 0.35);
    ctx.lineTo(x + s, yy + s);
    ctx.closePath();
    ctx.fillStyle = "#a93226";
    ctx.fill();

    // 正面
    const g = ctx.createLinearGradient(x, yy, x, yy + s);
    g.addColorStop(0, "#ff6b5a");
    g.addColorStop(1, "#e74c3c");
    ctx.fillStyle = g;
    roundRect(x, yy, s, s, s * 0.1);
    ctx.fill();

    // 边框
    ctx.strokeStyle = "#922b21";
    ctx.lineWidth = Math.max(2, s * 0.04);
    roundRect(x, yy, s, s, s * 0.1);
    ctx.stroke();

    // 正面高光条
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    roundRect(x + s * 0.1, yy + s * 0.08, s * 0.8, s * 0.18, s * 0.06);
    ctx.fill();

    if (face) {
      // 原创表情：圆眼 + 微笑
      const eyeY = yy + s * 0.38;
      const eyeR = s * 0.09;
      const eyeGap = s * 0.22;
      ctx.fillStyle = "#2c3e50";
      ctx.beginPath();
      ctx.arc(x + s * 0.5 - eyeGap, eyeY, eyeR, 0, Math.PI * 2);
      ctx.arc(x + s * 0.5 + eyeGap, eyeY, eyeR, 0, Math.PI * 2);
      ctx.fill();
      // 眼神白点
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(x + s * 0.5 - eyeGap + eyeR * 0.3, eyeY - eyeR * 0.3, eyeR * 0.35, 0, Math.PI * 2);
      ctx.arc(x + s * 0.5 + eyeGap + eyeR * 0.3, eyeY - eyeR * 0.3, eyeR * 0.35, 0, Math.PI * 2);
      ctx.fill();
      // 微笑
      ctx.strokeStyle = "#2c3e50";
      ctx.lineWidth = Math.max(2, s * 0.05);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(x + s * 0.5, yy + s * 0.55, s * 0.18, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }

    // 数字「1」小徽章（角落）
    if (opts.badge !== false) {
      const bx = x + s * 0.72;
      const by = yy + s * 0.72;
      const br = s * 0.16;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#c0392b";
      ctx.font = `bold ${Math.floor(s * 0.22)}px system-ui,sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("1", bx, by + 1);
    }

    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function drawSceneBackground() {
    // 天空
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#7ec8f5");
    sky.addColorStop(0.55, "#b8e4ff");
    sky.addColorStop(0.55, "#8fd18a");
    sky.addColorStop(1, "#6bb36a");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // 远山
    ctx.fillStyle = "#5fa86a";
    ctx.beginPath();
    ctx.moveTo(0, 280);
    ctx.quadraticCurveTo(180, 210, 360, 270);
    ctx.quadraticCurveTo(520, 220, 720, 275);
    ctx.lineTo(720, 320);
    ctx.lineTo(0, 320);
    ctx.fill();

    // 地面
    ctx.fillStyle = "#7ec46f";
    ctx.fillRect(0, 300, W, H - 300);
    // 草地纹理点
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    for (let i = 0; i < 40; i++) {
      const gx = (i * 97 + 40) % W;
      const gy = 310 + ((i * 53) % 140);
      ctx.fillRect(gx, gy, 3, 3);
    }
  }

  function drawSun(p, highlight) {
    const { x, y, r } = p;
    ctx.save();
    if (highlight) {
      ctx.shadowColor = "#f1c40f";
      ctx.shadowBlur = 24;
    }
    // 光芒
    ctx.strokeStyle = "#f9e79f";
    ctx.lineWidth = 4;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + now() * 0.3;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * (r + 4), y + Math.sin(a) * (r + 4));
      ctx.lineTo(x + Math.cos(a) * (r + 16), y + Math.sin(a) * (r + 16));
      ctx.stroke();
    }
    const g = ctx.createRadialGradient(x - 8, y - 8, 4, x, y, r);
    g.addColorStop(0, "#fff6a5");
    g.addColorStop(1, "#f1c40f");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawTree(p, highlight) {
    const { x, y } = p;
    ctx.save();
    if (highlight) {
      ctx.shadowColor = "#27ae60";
      ctx.shadowBlur = 18;
    }
    // 树干
    ctx.fillStyle = "#8b5a2b";
    roundRect(x - 10, y + 10, 20, 55, 4);
    ctx.fill();
    // 树冠（三层圆）
    ctx.fillStyle = "#27ae60";
    ctx.beginPath();
    ctx.arc(x, y - 10, 38, 0, Math.PI * 2);
    ctx.arc(x - 28, y + 8, 28, 0, Math.PI * 2);
    ctx.arc(x + 28, y + 8, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2ecc71";
    ctx.beginPath();
    ctx.arc(x, y - 18, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBee(p, highlight) {
    const { x, y } = p;
    const flap = Math.sin(now() * 12) * 4;
    ctx.save();
    if (highlight) {
      ctx.shadowColor = "#f39c12";
      ctx.shadowBlur = 16;
    }
    // 翅膀
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath();
    ctx.ellipse(x - 10, y - 10 - flap, 14, 8, -0.4, 0, Math.PI * 2);
    ctx.ellipse(x + 10, y - 10 + flap, 14, 8, 0.4, 0, Math.PI * 2);
    ctx.fill();
    // 身体
    ctx.fillStyle = "#f1c40f";
    ctx.beginPath();
    ctx.ellipse(x, y, 18, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    // 条纹
    ctx.strokeStyle = "#2c3e50";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 10);
    ctx.lineTo(x - 4, y + 10);
    ctx.moveTo(x + 4, y - 10);
    ctx.lineTo(x + 4, y + 10);
    ctx.stroke();
    // 眼睛
    ctx.fillStyle = "#2c3e50";
    ctx.beginPath();
    ctx.arc(x + 10, y - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawCountBadge(x, y, n) {
    ctx.save();
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#e74c3c";
    ctx.lineWidth = 3;
    roundRect(x - 22, y - 22, 44, 44, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#c0392b";
    ctx.font = "bold 26px system-ui,sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(n), x, y + 1);
    ctx.restore();
  }

  function drawPad() {
    // 剪影垫
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = "rgba(192,57,43,0.55)";
    ctx.lineWidth = 3;
    ctx.fillStyle = "rgba(231,76,60,0.12)";
    roundRect(pad.x, pad.y, pad.w, pad.h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(192,57,43,0.45)";
    ctx.font = "bold 36px system-ui,sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (!buildPlaced) ctx.fillText("1", pad.x + pad.w / 2, pad.y + pad.h / 2);
    ctx.restore();
  }

  function drawTray() {
    // 底部托盘
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    roundRect(16, H - 48 - UNIT - 20, 140, UNIT + 40, 16);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 2;
    roundRect(16, H - 48 - UNIT - 20, 140, UNIT + 40, 16);
    ctx.stroke();
    ctx.fillStyle = "#7f8c8d";
    ctx.font = "bold 14px system-ui,sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("积木盒", 16 + 70, H - 48 - UNIT - 6);
    ctx.restore();
  }

  function spawnConfetti(n = 60) {
    confetti = [];
    for (let i = 0; i < n; i++) {
      confetti.push({
        x: W * 0.3 + Math.random() * W * 0.4,
        y: -20 - Math.random() * 80,
        vx: (Math.random() - 0.5) * 4,
        vy: 1.5 + Math.random() * 3,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.2,
        color: ["#e74c3c", "#f1c40f", "#3498db", "#2ecc71", "#9b59b6", "#fff"][i % 6],
        w: 8 + Math.random() * 8,
        h: 5 + Math.random() * 5,
      });
    }
  }

  function updateConfetti() {
    for (const c of confetti) {
      c.x += c.vx;
      c.y += c.vy;
      c.vy += 0.04;
      c.rot += c.vr;
    }
    confetti = confetti.filter((c) => c.y < H + 40);
  }

  function drawConfetti() {
    for (const c of confetti) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      ctx.restore();
    }
  }

  // ---------- phases ----------
  function startTitle() {
    phase = PHASE.TITLE;
    hideSpeech();
    showCard(
      "数字积木 · 第一集：一",
      "认识「一」——只有一块。拖一拖、点一点，一起找找场景里有多少个「1」。",
      [{ label: "开始玩", primary: true, onClick: () => { hideCard(); startIntro(); } }]
    );
  }

  function startIntro() {
    phase = PHASE.INTRO;
    phaseT = now();
    introStep = 0;
    onePos = { x: W / 2 - UNIT / 2, y: H / 2 - 20 };
    btnSkip.hidden = false;
    showSpeech("你好！我是「一」。", 0);
  }

  function advanceIntro() {
    introStep++;
    if (introStep === 1) {
      showSpeech("只有一块。一就是一。", 0);
    } else if (introStep === 2) {
      showSpeech("拖我到处走走，再点点太阳、树和蜜蜂——每样都是 1 个！", 0);
    } else {
      startExplore();
    }
  }

  function startExplore() {
    phase = PHASE.EXPLORE;
    phaseT = now();
    exploreDone = { sun: false, tree: false, bee: false };
    btnSkip.hidden = true;
    showSpeech("点一点：太阳、树、蜜蜂。每样都是「1」～", 3500);
  }

  function maybeFinishExplore() {
    if (exploreDone.sun && exploreDone.tree && exploreDone.bee) {
      setTimeout(() => startBuild(), 700);
    }
  }

  function startBuild() {
    phase = PHASE.BUILD;
    phaseT = now();
    buildPlaced = false;
    trayCube = { x: 48, y: H - 48 - UNIT, homeX: 48, homeY: H - 48 - UNIT };
    bounce = null;
    showSpeech("从积木盒拖出一块，放到虚线格子上，做出「一」。", 4000);
  }

  function startCelebrate() {
    phase = PHASE.CELEBRATE;
    phaseT = now();
    hideSpeech();
    spawnConfetti(80);
    setTimeout(() => {
      showCard(
        "真棒！",
        "你认识了「一」——一块积木、一个太阳、一棵树、一只蜜蜂。下一集「二」还没开放，可以再玩一遍第一集。",
        [
          { label: "再玩一次", primary: true, onClick: () => { hideCard(); startIntro(); } },
          { label: "下一集：二（未开放）", primary: false, onClick: () => {
            showSpeech("下一集还在准备中，先再玩一遍「一」吧！", 2500);
          }},
        ]
      );
    }, 900);
  }

  btnSkip.addEventListener("click", () => {
    if (phase === PHASE.INTRO) startExplore();
  });

  // ---------- input ----------
  function onDown(cx, cy, id) {
    if (!overlay.hidden) return;
    const p = clientToGame(cx, cy);
    pointer.x = p.x; pointer.y = p.y; pointer.down = true; pointer.id = id;
    canvas.classList.add("dragging");

    if (phase === PHASE.INTRO) {
      advanceIntro();
      return;
    }

    if (phase === PHASE.EXPLORE) {
      // 先判断是否点道具
      for (const prop of props) {
        if (dist(p.x, p.y, prop.x, prop.y) <= prop.r + 16) {
          if (!exploreDone[prop.id]) {
            exploreDone[prop.id] = true;
            explorePulse = { id: prop.id, t: now() };
            showSpeech(`${prop.label} —— 1 个！`, 1800);
            maybeFinishExplore();
          } else {
            showSpeech(`还是 1 个${prop.label}。`, 1200);
          }
          return;
        }
      }
      // 拖 One
      if (hitRect(p.x, p.y, { x: onePos.x, y: onePos.y, w: UNIT, h: UNIT })) {
        drag = { kind: "one", ox: p.x - onePos.x, oy: p.y - onePos.y };
      }
      return;
    }

    if (phase === PHASE.BUILD && !buildPlaced) {
      const tc = bounce ? bounce : trayCube;
      if (hitRect(p.x, p.y, { x: tc.x, y: tc.y, w: UNIT, h: UNIT })) {
        drag = { kind: "tray", ox: p.x - tc.x, oy: p.y - tc.y };
        bounce = null;
      }
    }
  }

  function onMove(cx, cy, id) {
    if (!pointer.down || (id != null && pointer.id != null && id !== pointer.id)) return;
    const p = clientToGame(cx, cy);
    pointer.x = p.x; pointer.y = p.y;
    if (!drag) return;
    if (drag.kind === "one") {
      onePos.x = clamp(p.x - drag.ox, 8, W - UNIT - 8);
      onePos.y = clamp(p.y - drag.oy, 8, H - UNIT - 8);
    } else if (drag.kind === "tray") {
      trayCube.x = clamp(p.x - drag.ox, 0, W - UNIT);
      trayCube.y = clamp(p.y - drag.oy, 0, H - UNIT);
    }
  }

  function onUp(cx, cy, id) {
    if (id != null && pointer.id != null && id !== pointer.id) return;
    pointer.down = false;
    canvas.classList.remove("dragging");
    if (!drag) return;

    if (drag.kind === "tray" && phase === PHASE.BUILD && !buildPlaced) {
      const cx0 = trayCube.x + UNIT / 2;
      const cy0 = trayCube.y + UNIT / 2;
      const pcx = pad.x + pad.w / 2;
      const pcy = pad.y + pad.h / 2;
      if (dist(cx0, cy0, pcx, pcy) < UNIT * 0.75) {
        // 成功放到垫上
        trayCube.x = pad.x;
        trayCube.y = pad.y;
        buildPlaced = true;
        buildFlash = now();
        showSpeech("正好一块！这就是「一」。", 2000);
        setTimeout(() => startCelebrate(), 1100);
      } else {
        // 弹回托盘，不惩罚
        bounce = {
          x: trayCube.x, y: trayCube.y,
          tx: trayCube.homeX, ty: trayCube.homeY,
          t0: now(), dur: 0.35,
        };
        showSpeech("轻轻放到虚线格子里哦～", 1800);
      }
    }
    drag = null;
  }

  canvas.addEventListener("mousedown", (e) => {
    e.preventDefault();
    onDown(e.clientX, e.clientY, "mouse");
  });
  window.addEventListener("mousemove", (e) => onMove(e.clientX, e.clientY, "mouse"));
  window.addEventListener("mouseup", (e) => onUp(e.clientX, e.clientY, "mouse"));

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    onDown(t.clientX, t.clientY, t.identifier);
  }, { passive: false });
  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    onMove(t.clientX, t.clientY, t.identifier);
  }, { passive: false });
  canvas.addEventListener("touchend", (e) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    onUp(t.clientX, t.clientY, t.identifier);
  }, { passive: false });
  canvas.addEventListener("touchcancel", (e) => {
    const t = e.changedTouches[0];
    onUp(t.clientX, t.clientY, t.identifier);
  });

  // ---------- render loop ----------
  function frame() {
    const t = now();
    drawSceneBackground();

    // 道具
    const hi = explorePulse && (t - explorePulse.t) < 0.8 ? explorePulse.id : null;
    for (const prop of props) {
      const on = hi === prop.id || (phase === PHASE.EXPLORE && exploreDone[prop.id]);
      if (prop.id === "sun") drawSun(prop, on);
      if (prop.id === "tree") drawTree(prop, on);
      if (prop.id === "bee") drawBee(prop, on);
      if (phase === PHASE.EXPLORE && exploreDone[prop.id]) {
        drawCountBadge(prop.x, prop.y - prop.r - 28, 1);
      }
    }

    // 进度点（探索阶段）
    if (phase === PHASE.EXPLORE) {
      const labels = ["太阳", "树", "蜜蜂"];
      const ids = ["sun", "tree", "bee"];
      ids.forEach((id, i) => {
        const done = exploreDone[id];
        const px = W / 2 - 60 + i * 60;
        const py = 28;
        ctx.beginPath();
        ctx.arc(px, py, 10, 0, Math.PI * 2);
        ctx.fillStyle = done ? "#e74c3c" : "rgba(255,255,255,0.7)";
        ctx.fill();
        ctx.strokeStyle = "#c0392b";
        ctx.lineWidth = 2;
        ctx.stroke();
        if (done) {
          ctx.fillStyle = "#fff";
          ctx.font = "bold 12px system-ui";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("1", px, py + 1);
        }
      });
    }

    if (phase === PHASE.INTRO || phase === PHASE.EXPLORE) {
      const bob = Math.sin(t * 2.2) * 4;
      drawOneBlock(onePos.x, onePos.y, UNIT, { bob, glow: phase === PHASE.INTRO ? 0.6 : 0.2 });
      if (phase === PHASE.INTRO) {
        // 轻提示：点屏幕继续
        if (Math.floor(t * 2) % 2 === 0) {
          ctx.fillStyle = "rgba(44,62,80,0.55)";
          ctx.font = "16px system-ui,sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("点一下继续 ›", W / 2, H - 70);
        }
      }
    }

    if (phase === PHASE.BUILD || phase === PHASE.CELEBRATE) {
      drawTray();
      drawPad();

      // bounce 动画
      let drawX = trayCube.x, drawY = trayCube.y;
      if (bounce) {
        const u = clamp((t - bounce.t0) / bounce.dur, 0, 1);
        const e = 1 - Math.pow(1 - u, 3);
        drawX = bounce.x + (bounce.tx - bounce.x) * e;
        drawY = bounce.y + (bounce.ty - bounce.y) * e;
        trayCube.x = drawX;
        trayCube.y = drawY;
        if (u >= 1) bounce = null;
      }

      const glow = buildPlaced ? 0.8 + Math.sin((t - buildFlash) * 8) * 0.3 : 0.15;
      if (!(phase === PHASE.CELEBRATE && buildPlaced && (t - phaseT) > 0.5)) {
        drawOneBlock(drawX, drawY, UNIT, { glow, face: true });
      }

      // 庆祝时放大的 1
      if (phase === PHASE.CELEBRATE) {
        updateConfetti();
        drawConfetti();
        const k = clamp((t - phaseT) / 0.5, 0, 1);
        const s = UNIT + k * 80;
        const bx = W / 2 - s / 2;
        const by = H / 2 - s / 2 - 30;
        drawOneBlock(bx, by, s, { glow: 1, face: true, bob: Math.sin(t * 3) * 6 });
        ctx.fillStyle = "#c0392b";
        ctx.font = "bold 42px system-ui,sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("1", W / 2, by + s + 48);
      }
    }

    // 标题页轻背景块
    if (phase === PHASE.TITLE) {
      drawOneBlock(W / 2 - 48, H / 2 - 90, 96, { glow: 0.5, bob: Math.sin(t * 2) * 5 });
    }

    requestAnimationFrame(frame);
  }

  // boot
  startTitle();
  requestAnimationFrame(frame);
})();
