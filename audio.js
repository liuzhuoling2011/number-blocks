/** 轻量 Web Audio 合成音效（原创，无版权采样） */
export class AudioBus {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this._unlocked = false;
    this._last = Object.create(null);
  }

  async unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      try { await this.ctx.resume(); } catch (_) {}
    }
    this._unlocked = true;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.55;
  }

  _ok(name, gap = 0.08) {
    if (!this._unlocked || this.muted || !this.ctx) return false;
    const t = this.ctx.currentTime;
    if (this._last[name] != null && t - this._last[name] < gap) return false;
    this._last[name] = t;
    return true;
  }

  _env(g, t0, a, h, r, peak = 1) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(peak * 0.7, t0 + a + h);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + h + r);
  }

  _tone(freq, dur, type = "sine", peak = 0.3, gapName = "tone") {
    if (!this._ok(gapName, 0.05)) return;
    const t0 = this.ctx.currentTime + 0.002;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    this._env(g, t0, 0.01, dur * 0.35, dur * 0.55, peak);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  appear() {
    if (!this._ok("appear", 0.2)) return;
    const t0 = this.ctx.currentTime + 0.002;
    [392, 523, 659].forEach((f, i) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "triangle";
      o.frequency.value = f;
      const dt = t0 + i * 0.07;
      this._env(g, dt, 0.02, 0.08, 0.25, 0.22);
      o.connect(g); g.connect(this.master);
      o.start(dt); o.stop(dt + 0.4);
    });
  }

  pickup() {
    if (!this._ok("pickup", 0.1)) return;
    const t0 = this.ctx.currentTime + 0.002;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(320, t0);
    o.frequency.exponentialRampToValueAtTime(680, t0 + 0.09);
    this._env(g, t0, 0.008, 0.04, 0.1, 0.28);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + 0.2);
  }

  putdown() {
    if (!this._ok("putdown", 0.1)) return;
    const t0 = this.ctx.currentTime + 0.002;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(220, t0);
    o.frequency.exponentialRampToValueAtTime(110, t0 + 0.12);
    this._env(g, t0, 0.005, 0.04, 0.12, 0.32);
    // soft noise thud
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.08, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const n = this.ctx.createBufferSource();
    const ng = this.ctx.createGain();
    n.buffer = buf;
    ng.gain.setValueAtTime(0.18, t0);
    ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
    n.connect(ng); ng.connect(this.master);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + 0.2);
    n.start(t0); n.stop(t0 + 0.09);
  }

  countOne() {
    if (!this._ok("count", 0.15)) return;
    const t0 = this.ctx.currentTime + 0.002;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(880, t0);
    o.frequency.exponentialRampToValueAtTime(1320, t0 + 0.06);
    this._env(g, t0, 0.005, 0.06, 0.18, 0.3);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + 0.3);
    // soft harmonic
    const o2 = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    o2.type = "triangle";
    o2.frequency.value = 1320;
    this._env(g2, t0 + 0.02, 0.01, 0.05, 0.2, 0.12);
    o2.connect(g2); g2.connect(this.master);
    o2.start(t0 + 0.02); o2.stop(t0 + 0.35);
  }

  bounce() {
    this._tone(240, 0.12, "square", 0.12, "bounce");
  }

  success() {
    if (!this._ok("success", 0.4)) return;
    const t0 = this.ctx.currentTime + 0.002;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = i % 2 ? "triangle" : "sine";
      o.frequency.value = f;
      const dt = t0 + i * 0.09;
      this._env(g, dt, 0.015, 0.12, 0.45, 0.28);
      o.connect(g); g.connect(this.master);
      o.start(dt); o.stop(dt + 0.65);
    });
  }

  ui() {
    this._tone(660, 0.08, "sine", 0.15, "ui");
  }
}
