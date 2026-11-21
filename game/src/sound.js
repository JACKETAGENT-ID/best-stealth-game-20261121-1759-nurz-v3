// Footsteps, chimes and alarms, all synthesized: no audio files, no network.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.lastStep = 0;
  }

  /** Create the AudioContext on a user gesture (browsers demand one). */
  unlock() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  blip(freq, seconds, type = 'sine', gain = 0.05, when = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    osc.connect(amp).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + seconds + 0.02);
  }

  /** A soft footstep; quieter and lower while sneaking. */
  step(sneaking) {
    if (!this.ctx || this.muted) return;
    const now = performance.now();
    if (now - this.lastStep < 90) return;
    this.lastStep = now;
    this.blip(sneaking ? 140 : 190, 0.06, 'triangle', sneaking ? 0.012 : 0.03);
  }

  pickup() {
    this.blip(660, 0.12, 'sine', 0.06);
    this.blip(990, 0.18, 'sine', 0.05, 0.09);
  }

  suspicious() {
    this.blip(440, 0.1, 'square', 0.025);
    this.blip(415, 0.14, 'square', 0.025, 0.11);
  }

  alarm() {
    for (let i = 0; i < 3; i++) {
      this.blip(620, 0.16, 'sawtooth', 0.04, i * 0.22);
      this.blip(470, 0.16, 'sawtooth', 0.04, i * 0.22 + 0.11);
    }
  }

  win() {
    [523, 659, 784, 1047].forEach((f, i) => this.blip(f, 0.25, 'sine', 0.05, i * 0.12));
  }
}
