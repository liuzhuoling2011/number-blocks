import * as THREE from 'three';
import { Sfx } from '../../game/sfx.ts';
import { clamp01, easeInOut, easeOutCubic, lerp } from '../../game/ease.ts';
import { loadActors } from './actors.ts';
import type { Actors } from './actors.ts';
import { copy } from './copy.ts';
import { frameCamera } from './frame.ts';
import { HOME, PAD, PAD_RADIUS } from './layout.ts';
import { buildMeadow } from './meadow.ts';
import type { Meadow } from './meadow.ts';

type Phase = 'boot' | 'title' | 'play' | 'clear' | 'error';
type Motion = 'idle' | 'drag' | 'return' | 'snap' | 'celebrate';

const SNAP_TIME = 0.42;
const RETURN_TIME = 0.46;
const PAD_R2 = PAD_RADIUS * PAD_RADIUS;

export class Level01 {
  private readonly root: HTMLElement;
  private readonly sfx = new Sfx();
  private readonly reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private readonly abort = new AbortController();
  private readonly raycaster = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();
  private readonly ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly hit = new THREE.Vector3();
  private readonly head = new THREE.Vector3();
  private readonly camTarget = new THREE.Vector3();
  private readonly lookTarget = new THREE.Vector3();
  private readonly look = new THREE.Vector3();

  private world!: HTMLElement;
  private canvas!: HTMLCanvasElement;
  private hint!: HTMLElement;
  private toast!: HTMLElement;
  private bubble!: HTMLElement;
  private titleSheet!: HTMLElement;
  private clearSheet!: HTMLElement;
  private bootEl!: HTMLElement;
  private errorEl!: HTMLElement;
  private live!: HTMLElement;
  private muteBtn!: HTMLButtonElement;

  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private meadow: Meadow | null = null;
  private actors: Actors | null = null;
  private oneRig: THREE.Group | null = null;
  private oneModel: THREE.Group | null = null;
  private guide: THREE.Group | null = null;
  private guideMat: THREE.MeshBasicMaterial | null = null;

  private phase: Phase = 'boot';
  private motion: Motion = 'idle';
  private ready = false;
  private disposed = false;
  private raf = 0;
  private viewW = 1;
  private viewH = 1;
  private cameraReady = false;
  private last = 0;
  private motionT = 0;
  private fromX = HOME.x;
  private fromZ = HOME.z;
  private fromLift = 0;
  private pointerId: number | null = null;
  private liftArmed = false;
  private downX = 0;
  private downY = 0;
  private lastHitX = HOME.x;
  private lastHitZ = HOME.z;
  private hasHit = false;
  private holdTimer = 0;
  private toastTimer = 0;
  private returnQuiet = false;
  private wantBadge = 0;
  private badgeHide = 0;
  private padBoost = 0;
  private punch = 0;
  private tiltZ = 0;
  private prevX = HOME.x;
  private didChord = false;
  private cardShown = false;
  private bits: { mesh: THREE.Mesh; v: THREE.Vector3; spin: THREE.Vector3; life: number }[] = [];
  private boxGeo: THREE.BoxGeometry | null = null;
  private dotGeo: THREE.SphereGeometry | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.mount();
    this.readMute();
  }

  async start(): Promise<void> {
    try {
      this.boot3d();
    } catch (error) {
      this.fail(error);
      return;
    }
    this.loop(performance.now());
    try {
      await this.loadModels();
      if (this.disposed) return;
      this.ready = true;
      this.setPhase('title');
    } catch (error) {
      this.fail(error);
    }
  }

  dispose(): void {
    this.disposed = true;
    this.abort.abort();
    window.clearTimeout(this.holdTimer);
    window.clearTimeout(this.toastTimer);
    cancelAnimationFrame(this.raf);
    this.clearConfetti();
    this.boxGeo?.dispose();
    this.dotGeo?.dispose();
    this.renderer?.dispose();
    this.scene?.environment?.dispose();
    this.root.replaceChildren();
  }

  private mount(): void {
    this.root.innerHTML = `
      <div class="nb-world" data-phase="boot">
        <canvas class="nb-canvas" aria-label="${copy.canvasLabel}"></canvas>
        <header class="nb-top">
          <p class="nb-brand">${copy.brand}</p>
          <button type="button" class="nb-mute" aria-pressed="false" aria-label="${copy.muteOn}">
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <path fill="currentColor" d="M4 9.2h3.1L12 5.4v13.2l-4.9-3.8H4a1 1 0 0 1-1-1v-3.6a1 1 0 0 1 1-1z"/>
              <path class="nb-wave" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M15.2 9.2a3.2 3.2 0 0 1 0 5.6"/>
              <path class="nb-wave" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M17.5 7a6 6 0 0 1 0 10"/>
              <path class="nb-slash" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M15.5 9.2 20.2 15"/>
            </svg>
          </button>
        </header>
        <p class="nb-hint">${copy.hint}</p>
        <p class="nb-toast" hidden>${copy.miss}</p>
        <p class="nb-bubble" hidden>${copy.cheer}</p>
        <div class="nb-sheet-wrap" data-sheet="title" hidden>
          <section class="nb-sheet">
            <h1 class="nb-title">
              <span class="nb-kicker">${copy.episodeKicker}</span>
              <span class="nb-badge">${copy.episodeNum}</span>
            </h1>
            <p class="nb-sub">${copy.episodeSub}</p>
            <button type="button" class="nb-btn" data-action="start">${copy.start}</button>
          </section>
        </div>
        <div class="nb-sheet-wrap" data-sheet="clear" hidden>
          <section class="nb-sheet nb-sheet--clear">
            <h1 class="nb-pop">${copy.clearTitle}</h1>
            <p class="nb-sub">${copy.clearBody}</p>
            <button type="button" class="nb-btn" data-action="replay">${copy.replay}</button>
            <button type="button" class="nb-btn nb-btn--quiet" disabled aria-disabled="true">${copy.next}</button>
            <p class="nb-caption">${copy.nextCaption}</p>
          </section>
        </div>
        <div class="nb-boot">
          <div class="nb-boot-mark" aria-hidden="true"></div>
          <p>${copy.loading}</p>
        </div>
        <div class="nb-error" hidden>
          <p class="nb-kicker">${copy.brand}</p>
          <h1>${copy.errorTitle}</h1>
          <p class="nb-sub">${copy.errorBody}</p>
          <button type="button" class="nb-btn" data-action="retry">${copy.retry}</button>
        </div>
        <p class="nb-sr" aria-live="polite"></p>
      </div>
    `;

    const world = this.root.querySelector<HTMLElement>('.nb-world');
    const canvas = this.root.querySelector<HTMLCanvasElement>('.nb-canvas');
    const hint = this.root.querySelector<HTMLElement>('.nb-hint');
    const toast = this.root.querySelector<HTMLElement>('.nb-toast');
    const bubble = this.root.querySelector<HTMLElement>('.nb-bubble');
    const titleSheet = this.root.querySelector<HTMLElement>('[data-sheet="title"]');
    const clearSheet = this.root.querySelector<HTMLElement>('[data-sheet="clear"]');
    const bootEl = this.root.querySelector<HTMLElement>('.nb-boot');
    const errorEl = this.root.querySelector<HTMLElement>('.nb-error');
    const live = this.root.querySelector<HTMLElement>('.nb-sr');
    const muteBtn = this.root.querySelector<HTMLButtonElement>('.nb-mute');
    if (!world || !canvas || !hint || !toast || !bubble || !titleSheet || !clearSheet || !bootEl || !errorEl || !live || !muteBtn) {
      throw new Error('界面没有挂上');
    }
    this.world = world;
    this.canvas = canvas;
    this.hint = hint;
    this.toast = toast;
    this.bubble = bubble;
    this.titleSheet = titleSheet;
    this.clearSheet = clearSheet;
    this.bootEl = bootEl;
    this.errorEl = errorEl;
    this.live = live;
    this.muteBtn = muteBtn;

    const signal = this.abort.signal;
    canvas.addEventListener('pointerdown', this.onPointerDown, { signal, passive: false });
    canvas.addEventListener('pointermove', this.onPointerMove, { signal, passive: false });
    canvas.addEventListener('pointerup', this.onPointerUp, { signal });
    canvas.addEventListener('pointercancel', this.onPointerUp, { signal });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault(), { signal });
    muteBtn.addEventListener('click', this.onMute, { signal });
    this.root.querySelector('[data-action="start"]')?.addEventListener('click', this.onStart, { signal });
    this.root.querySelector('[data-action="replay"]')?.addEventListener('click', this.onReplay, { signal });
    this.root.querySelector('[data-action="retry"]')?.addEventListener('click', () => window.location.reload(), { signal });
    window.addEventListener('resize', this.onResize, { signal });
    const observer = new ResizeObserver(() => this.onResize());
    observer.observe(world);
    signal.addEventListener('abort', () => observer.disconnect());
  }

  private boot3d(): void {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0xf4efe6);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 120);
    this.meadow = buildMeadow(this.scene, this.renderer);

    this.oneRig = new THREE.Group();
    this.oneModel = new THREE.Group();
    this.oneRig.add(this.oneModel);
    this.oneRig.position.set(HOME.x, HOME.y, HOME.z);
    this.scene.add(this.oneRig);

    const guideMat = new THREE.MeshBasicMaterial({
      color: 0xfff8e8,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      toneMapped: false,
    });
    const guide = new THREE.Group();
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.26, 16), guideMat);
    head.rotation.z = -Math.PI / 2;
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), guideMat);
    tail.position.x = -0.18;
    guide.add(head, tail);
    guide.visible = false;
    this.guide = guide;
    this.guideMat = guideMat;
    this.scene.add(guide);
    this.onResize();
    const fov = frameCamera(this.camera.aspect, this.viewW, 'title', this.camTarget, this.lookTarget);
    this.camera.position.copy(this.camTarget);
    this.look.copy(this.lookTarget);
    this.camera.fov = fov;
    this.camera.lookAt(this.look);
    this.camera.updateProjectionMatrix();
    this.cameraReady = true;
  }

  private async loadModels(): Promise<void> {
    if (!this.scene || !this.renderer || !this.oneModel) return;
    this.actors = await loadActors(this.scene, this.renderer);
    this.oneModel.add(this.actors.oneRoot);
  }

  private loop = (now: number): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const raw = this.last ? (now - this.last) / 1000 : 0.016;
    this.last = now;
    const dt = Math.min(0.05, raw);
    const clockDt = Math.min(0.5, raw);
    if (!document.hidden) this.update(dt, clockDt, now / 1000);
    if (!document.hidden && this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  private update(dt: number, clockDt: number, time: number): void {
    if (!this.camera || !this.oneRig || !this.oneModel) return;
    this.updateCamera(dt);
    this.meadow?.update(time);
    this.updateMotion(dt, clockDt, time);
    this.updateShadow();
    this.updatePad(dt, time);
    this.updateGuide(time);
    this.updateConfetti(dt);
    this.updateBubble();
  }

  private updateCamera(dt: number): void {
    if (!this.camera) return;
    const phase = this.phase === 'play' || this.phase === 'clear' ? 'play' : 'title';
    const fov = frameCamera(this.camera.aspect, this.viewW, phase, this.camTarget, this.lookTarget);
    if (!this.cameraReady) {
      this.camera.position.copy(this.camTarget);
      this.look.copy(this.lookTarget);
      this.camera.fov = fov;
      this.cameraReady = true;
    } else {
      const a = 1 - Math.exp(-3.5 * dt);
      this.camera.position.lerp(this.camTarget, a);
      this.look.lerp(this.lookTarget, a);
      this.camera.fov += (fov - this.camera.fov) * Math.min(1, dt * 3.2);
    }
    this.camera.lookAt(this.look);
    this.camera.updateProjectionMatrix();
  }

  private updateMotion(dt: number, clockDt: number, time: number): void {
    if (!this.oneRig || !this.oneModel) return;
    const model = this.oneModel;
    const rig = this.oneRig;

    if (this.motion === 'drag' && this.hasHit) {
      rig.position.x = THREE.MathUtils.damp(rig.position.x, this.lastHitX, 18, dt);
      rig.position.z = THREE.MathUtils.damp(rig.position.z, this.lastHitZ, 18, dt);
      model.position.y = THREE.MathUtils.damp(model.position.y, 0.52, 12, dt);
      const vx = rig.position.x - this.prevX;
      this.tiltZ = THREE.MathUtils.damp(this.tiltZ, THREE.MathUtils.clamp(-vx * 2.5, -0.32, 0.32), 8, dt);
      model.rotation.z = this.tiltZ;
      model.rotation.x = THREE.MathUtils.damp(model.rotation.x, 0.2, 8, dt);
      const near = this.nearPad(rig.position.x, rig.position.z) || this.nearPad(this.lastHitX, this.lastHitZ);
      this.padBoost = THREE.MathUtils.damp(this.padBoost, near ? 1 : 0, 10, dt);
      const punch = 1 + this.punch * 0.05;
      model.scale.set(punch, punch, punch);
    } else if (this.motion === 'return' || this.motion === 'snap') {
      const dur = this.motion === 'snap' ? SNAP_TIME : RETURN_TIME;
      this.motionT += clockDt;
      const t = clamp01(this.motionT / dur);
      const k = easeOutCubic(t);
      const destX = this.motion === 'snap' ? PAD.x : HOME.x;
      const destZ = this.motion === 'snap' ? PAD.z : HOME.z;
      rig.position.x = lerp(this.fromX, destX, k);
      rig.position.z = lerp(this.fromZ, destZ, k);
      const hop = Math.sin(t * Math.PI) * (this.motion === 'snap' ? 0.5 : 0.38);
      model.position.y = lerp(this.fromLift, 0, k) * (1 - t) + hop;
      model.rotation.x = THREE.MathUtils.damp(model.rotation.x, 0, 8, dt);
      model.rotation.z = THREE.MathUtils.damp(model.rotation.z, 0, 8, dt);
      model.scale.set(1, 1, 1);
      this.padBoost = THREE.MathUtils.damp(this.padBoost, this.motion === 'snap' ? 1 : 0, 6, dt);
      if (t >= 1) {
        model.position.y = 0;
        model.rotation.set(0, 0, 0);
        if (this.motion === 'snap') this.landSuccess();
        else this.motion = 'idle';
      }
    } else if (this.motion === 'celebrate') {
      this.motionT += clockDt;
      rig.position.set(PAD.x, HOME.y, PAD.z);
      model.position.y = 0;
      model.rotation.set(0, 0, 0);
      if (!this.reduceMotion) {
        const u = clamp01(this.motionT / 0.42);
        const s = Math.sin(u * Math.PI) * (1 - u * 0.25);
        model.scale.set(1 + s * 0.12, 1 - s * 0.16, 1 + s * 0.12);
      } else {
        model.scale.set(1, 1, 1);
      }
      if (!this.didChord && this.motionT > 0.34) {
        this.didChord = true;
        this.sfx.levelClear();
      }
      if (!this.cardShown && this.motionT > 1.1) this.showClearCard();
      this.padBoost = THREE.MathUtils.damp(this.padBoost, 0.35, 3, dt);
    } else {
      this.idle(time);
      this.padBoost = THREE.MathUtils.damp(this.padBoost, 0, 4, dt);
    }

    this.punch = THREE.MathUtils.damp(this.punch, 0, 7, dt);
    this.prevX = rig.position.x;
    this.blink(time);
  }

  private idle(time: number): void {
    if (!this.oneModel) return;
    const breathe = 1 + Math.sin(time * 2.3) * (this.reduceMotion ? 0 : 0.012);
    let hop = 0;
    if (!this.reduceMotion) {
      const cycle = time % 3.15;
      if (cycle < 0.28) hop = Math.sin((cycle / 0.28) * Math.PI) * 0.1;
    }
    this.oneModel.position.y = hop;
    this.oneModel.scale.set(1 + (1 - breathe) * 0.45, breathe, 1 + (1 - breathe) * 0.45);
    this.oneModel.rotation.z = this.reduceMotion ? 0 : Math.sin(time * 0.55) * 0.025;
    this.oneModel.rotation.x = 0;
  }

  private blink(time: number): void {
    const eyes = this.actors?.eyes;
    if (!eyes) return;
    let shut = 0;
    if (!this.reduceMotion && this.motion !== 'drag') {
      const cycle = time % 3.7;
      if (cycle > 3.42) shut = Math.sin(((cycle - 3.42) / 0.28) * Math.PI);
    }
    for (const eye of eyes) eye.obj.scale.y = eye.baseY * (1 - shut * 0.9);
  }

  private updateShadow(): void {
    if (!this.actors || !this.oneRig || !this.oneModel) return;
    const lift = this.oneModel.position.y;
    this.actors.shadow.position.x = this.oneRig.position.x;
    this.actors.shadow.position.z = this.oneRig.position.z;
    const spread = 1 + lift * 0.5;
    this.actors.shadow.scale.set(spread, spread, 1);
    this.actors.shadowMat.opacity = 0.9 * (1 - Math.min(0.62, lift * 0.75));
  }

  private updatePad(dt: number, time: number): void {
    const actors = this.actors;
    if (!actors) return;
    const pulse = 0.5 + 0.5 * Math.sin(time * 2.65);
    const playing = this.phase === 'play' || this.phase === 'clear';
    const amp = (playing ? 1 : 0.45) + this.padBoost * 0.85;
    if (actors.ringMat) actors.ringMat.emissiveIntensity = 0.3 + pulse * 0.85 * amp;
    const glowMesh = actors.pad.getObjectByName('PadGlow');
    if (glowMesh) glowMesh.scale.setScalar(1 + pulse * 0.035 * amp + this.padBoost * 0.04);
    actors.glowMat.opacity = 0.55 + pulse * 0.4 * amp + this.padBoost * 0.2;
    actors.glow.intensity = 0.7 + pulse * 1.1 * amp;

    this.badgeHide = THREE.MathUtils.damp(this.badgeHide, this.wantBadge, 7, dt);
    if (actors.padDigit) {
      const bob = this.wantBadge > 0.4 || this.reduceMotion ? 0 : Math.sin(time * 2.2) * 0.015;
      const hidden = this.badgeHide;
      actors.padDigit.position.y = lerp(actors.padDigitBaseY, 0.08, hidden) + bob;
      const scale = Math.max(0.001, 1 - hidden);
      actors.padDigit.scale.setScalar(scale);
      actors.padDigit.visible = scale > 0.03;
    }
  }

  private updateGuide(time: number): void {
    if (!this.guide || !this.guideMat) return;
    const show = this.ready && this.phase === 'play' && this.motion === 'idle' && !this.reduceMotion;
    this.guide.visible = show;
    if (!show) return;
    const loop = (time * 0.42) % 1;
    const along = easeInOut(loop);
    this.guide.position.set(
      lerp(HOME.x + 0.58, PAD.x - 0.78, along),
      0.58 + Math.sin(loop * Math.PI) * 0.3,
      0.32,
    );
    this.guideMat.opacity = 0.2 + Math.sin(loop * Math.PI) * 0.75;
  }

  private updateBubble(): void {
    if (this.bubble.hidden || !this.camera || !this.oneRig || !this.oneModel) return;
    this.head.set(
      this.oneRig.position.x,
      HOME.y + this.oneModel.position.y + 1.22,
      this.oneRig.position.z,
    );
    this.head.project(this.camera);
    const x = (this.head.x * 0.5 + 0.5) * this.viewW;
    const y = (-this.head.y * 0.5 + 0.5) * this.viewH;
    this.bubble.style.left = `${x}px`;
    this.bubble.style.top = `${y}px`;
  }

  private updateConfetti(dt: number): void {
    if (!this.scene) return;
    for (let i = this.bits.length - 1; i >= 0; i -= 1) {
      const bit = this.bits[i];
      if (!bit) continue;
      bit.life -= dt;
      bit.v.y -= 7.4 * dt;
      bit.mesh.position.addScaledVector(bit.v, dt);
      bit.mesh.rotation.x += bit.spin.x * dt;
      bit.mesh.rotation.y += bit.spin.y * dt;
      if (bit.life <= 0 || bit.mesh.position.y < -0.15) {
        this.scene.remove(bit.mesh);
        const mat = bit.mesh.material;
        if (!Array.isArray(mat)) mat.dispose();
        this.bits.splice(i, 1);
      }
    }
  }

  private onResize = (): void => {
    if (!this.renderer || !this.camera) return;
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    if (w < 2 || h < 2) return;
    this.viewW = w;
    this.viewH = h;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  private onPointerDown = (event: PointerEvent): void => {
    if (!this.ready || this.phase !== 'play' || !this.oneRig) return;
    if (this.motion === 'return' || this.motion === 'snap' || this.motion === 'celebrate') return;
    if (this.pointerId !== null || event.button > 0) return;
    if (event.cancelable) event.preventDefault();
    this.ndcFrom(event);
    if (!this.hitsOne()) {
      this.pulseHint();
      return;
    }
    this.pointerId = event.pointerId;
    this.canvas.setPointerCapture(event.pointerId);
    this.downX = event.clientX;
    this.downY = event.clientY;
    this.liftArmed = false;
    window.clearTimeout(this.holdTimer);
    this.holdTimer = window.setTimeout(() => this.beginLift(), 80);
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.ready || !this.camera) return;
    if (this.pointerId === null) {
      if (this.phase === 'play' && this.motion === 'idle') {
        this.ndcFrom(event);
        this.canvas.style.cursor = this.hitsOne() ? 'grab' : 'default';
      }
      return;
    }
    if (event.pointerId !== this.pointerId) return;
    if (event.cancelable) event.preventDefault();
    const moved = Math.hypot(event.clientX - this.downX, event.clientY - this.downY);
    if (!this.liftArmed && moved > 7) this.beginLift();
    if (this.liftArmed) this.track(event);
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    window.clearTimeout(this.holdTimer);
    const lifted = this.liftArmed;
    const moved = Math.hypot(event.clientX - this.downX, event.clientY - this.downY);
    this.pointerId = null;
    this.liftArmed = false;
    this.canvas.style.cursor = 'default';
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
    if (!lifted || moved < 14) {
      this.pulseHint();
      this.punch = lifted ? 0 : 0.7;
      if (lifted) this.startReturn(false);
      return;
    }
    this.track(event);
    const blockOn = this.oneRig ? this.nearPad(this.oneRig.position.x, this.oneRig.position.z) : false;
    const fingerOn = this.hasHit && this.nearPad(this.lastHitX, this.lastHitZ);
    if (blockOn || fingerOn) this.startSnap();
    else this.startReturn(true);
  };

  private beginLift(): void {
    if (this.liftArmed || this.pointerId === null || !this.oneModel) return;
    this.liftArmed = true;
    this.motion = 'drag';
    this.punch = 1;
    this.canvas.style.cursor = 'grabbing';
    this.sfx.unlock();
    this.sfx.pickup();
    if (this.guide) this.guide.visible = false;
  }

  private track(event: PointerEvent): void {
    if (!this.camera) return;
    this.ndcFrom(event);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hit = this.raycaster.ray.intersectPlane(this.ground, this.hit);
    if (!hit) return;
    this.lastHitX = THREE.MathUtils.clamp(hit.x, -3.1, 3.2);
    this.lastHitZ = THREE.MathUtils.clamp(hit.z, -2.1, 2.3);
    this.hasHit = true;
  }

  private startSnap(): void {
    if (!this.oneRig || !this.oneModel) return;
    this.motion = 'snap';
    this.motionT = 0;
    this.fromX = this.oneRig.position.x;
    this.fromZ = this.oneRig.position.z;
    this.fromLift = this.oneModel.position.y;
    this.pointerId = null;
  }

  private startReturn(showMiss: boolean): void {
    if (!this.oneRig || !this.oneModel) return;
    this.motion = 'return';
    this.motionT = 0;
    this.fromX = this.oneRig.position.x;
    this.fromZ = this.oneRig.position.z;
    this.fromLift = this.oneModel.position.y;
    this.returnQuiet = !showMiss;
    if (showMiss) {
      this.sfx.placeFail();
      this.showToast();
    }
  }

  private landSuccess(): void {
    this.motion = 'celebrate';
    this.motionT = 0;
    this.didChord = false;
    this.cardShown = false;
    this.wantBadge = 1;
    this.sfx.placeSuccess();
    this.spawnConfetti();
    this.bubble.hidden = false;
    this.live.textContent = copy.cheer;
    this.setPhase('clear');
  }

  private showClearCard(): void {
    this.cardShown = true;
    this.clearSheet.hidden = false;
    const sheet = this.clearSheet.querySelector('.nb-sheet');
    sheet?.classList.remove('is-in');
    if (sheet instanceof HTMLElement) void sheet.offsetWidth;
    sheet?.classList.add('is-in');
    this.live.textContent = `${copy.clearTitle}${copy.clearBody}`;
  }

  private spawnConfetti(): void {
    if (!this.scene || !this.oneRig || this.reduceMotion) return;
    this.clearConfetti();
    if (!this.boxGeo) this.boxGeo = new THREE.BoxGeometry(0.075, 0.048, 0.03);
    if (!this.dotGeo) this.dotGeo = new THREE.SphereGeometry(0.042, 8, 6);
    const palette = [0xfff8e8, 0xffd56a, 0xff8f7a, 0xffffff, 0xb7e38a, 0xf2b56b];
    const count = 36;
    for (let i = 0; i < count; i += 1) {
      const mat = new THREE.MeshStandardMaterial({
        color: palette[i % palette.length] ?? 0xfff8e8,
        roughness: 0.42,
        metalness: 0.03,
        envMapIntensity: 0.35,
      });
      const mesh = new THREE.Mesh(i % 3 === 0 ? this.dotGeo : this.boxGeo, mat);
      mesh.position.set(
        this.oneRig.position.x + (Math.random() - 0.5) * 0.4,
        1.05 + Math.random() * 0.25,
        this.oneRig.position.z + (Math.random() - 0.5) * 0.4,
      );
      mesh.castShadow = false;
      this.scene.add(mesh);
      this.bits.push({
        mesh,
        v: new THREE.Vector3((Math.random() - 0.5) * 2.6, 2.3 + Math.random() * 2.1, (Math.random() - 0.5) * 2.6),
        spin: new THREE.Vector3(Math.random() * 5, Math.random() * 5, Math.random() * 3),
        life: 1.45 + Math.random() * 0.55,
      });
    }
  }

  private clearConfetti(): void {
    if (!this.scene) return;
    for (const bit of this.bits) {
      this.scene.remove(bit.mesh);
      const mat = bit.mesh.material;
      if (!Array.isArray(mat)) mat.dispose();
    }
    this.bits = [];
  }

  private onStart = (): void => {
    if (this.phase !== 'title') return;
    this.sfx.unlock();
    this.sfx.click();
    this.setPhase('play');
  };

  private onReplay = (): void => {
    if (this.motion !== 'celebrate' && this.phase !== 'clear') return;
    this.sfx.unlock();
    this.sfx.click();
    this.wantBadge = 0;
    this.cardShown = false;
    this.didChord = false;
    this.bubble.hidden = true;
    this.toast.hidden = true;
    this.clearConfetti();
    this.setPhase('play');
    this.startReturn(false);
  };

  private onMute = (): void => {
    this.sfx.unlock();
    this.sfx.muted = !this.sfx.muted;
    this.sfx.click();
    this.applyMute();
    try {
      localStorage.setItem('shuzi-jimu-muted', this.sfx.muted ? '1' : '0');
    } catch {
      /* private mode */
    }
  };

  private readMute(): void {
    try {
      this.sfx.muted = localStorage.getItem('shuzi-jimu-muted') === '1';
    } catch {
      this.sfx.muted = false;
    }
    this.applyMute();
  }

  private applyMute(): void {
    const muted = this.sfx.muted;
    this.muteBtn.classList.toggle('is-muted', muted);
    this.muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
    this.muteBtn.setAttribute('aria-label', muted ? copy.muteOff : copy.muteOn);
  }

  private setPhase(phase: Phase): void {
    this.phase = phase;
    this.world.dataset.phase = phase;
    this.titleSheet.hidden = phase !== 'title';
    this.clearSheet.hidden = !(phase === 'clear' && this.cardShown);
    this.bootEl.hidden = phase !== 'boot';
    this.errorEl.hidden = phase !== 'error';
    if (phase === 'title') this.live.textContent = `${copy.episodeTitle}。${copy.episodeSub}`;
    if (phase === 'play') this.live.textContent = copy.hint;
    if (phase !== 'play') this.toast.hidden = true;
  }

  private showToast(): void {
    if (this.returnQuiet) return;
    this.toast.hidden = false;
    this.toast.classList.remove('is-shake');
    void this.toast.offsetWidth;
    this.toast.classList.add('is-shake');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toast.hidden = true;
    }, 2300);
    this.live.textContent = copy.miss;
  }

  private pulseHint(): void {
    this.hint.classList.remove('is-pulse');
    void this.hint.offsetWidth;
    this.hint.classList.add('is-pulse');
  }

  private nearPad(x: number, z: number): boolean {
    const dx = x - PAD.x;
    const dz = z - PAD.z;
    return dx * dx + dz * dz <= PAD_R2;
  }

  private hitsOne(): boolean {
    if (!this.camera || !this.oneRig || !this.actors) return false;
    this.raycaster.setFromCamera(this.ndc, this.camera);
    if (this.raycaster.intersectObjects(this.actors.pick, false).length > 0) return true;
    this.head.set(this.oneRig.position.x, HOME.y + 0.52, this.oneRig.position.z);
    return this.raycaster.ray.distanceToPoint(this.head) < 0.84;
  }

  private ndcFrom(event: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private fail(error: unknown): void {
    console.error(error);
    this.setPhase('error');
  }
}
