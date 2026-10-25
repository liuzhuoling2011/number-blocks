/** Soft synthesized cues. Unlocked on the first user gesture. */
export class Sfx {
  muted = false;
  private ctx: AudioContext | null = null;

  unlock(): void {
    const Ctx = window.AudioContext ?? window.webkitAudioContext;
    if (!Ctx) return;
    if (!this.ctx) this.ctx = new Ctx();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  click(): void {
    this.tone({ freq: 720, slide: 980, dur: 0.07, gain: 0.045, type: 'sine' });
  }

  pickup(): void {
    this.tone({ freq: 380, slide: 740, dur: 0.12, gain: 0.05, type: 'triangle' });
  }

  placeFail(): void {
    this.tone({ freq: 260, slide: 150, dur: 0.18, gain: 0.05, type: 'sine' });
  }

  placeSuccess(): void {
    this.tone({ freq: 523.25, dur: 0.12, gain: 0.055, type: 'sine' });
    this.tone({ freq: 659.25, dur: 0.16, gain: 0.05, type: 'sine', delay: 0.08 });
  }

  levelClear(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      this.tone({ freq, dur: 0.2, gain: 0.045, type: 'triangle', delay: i * 0.09 });
    });
  }

  private tone(opts: {
    freq: number;
    dur: number;
    gain: number;
    type: OscillatorType;
    slide?: number;
    delay?: number;
  }): void {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + (opts.delay ?? 0);
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    filter.type = 'lowpass';
    filter.frequency.value = 2200;
    osc.type = opts.type;
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.slide) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, opts.slide), t0 + opts.dur);
    }
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(opts.gain, t0 + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.02);
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
