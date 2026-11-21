// Wren, the thief: quiet feet, quick hands, one small lantern of nerve.
import { moveCircle } from './museum.js';

export const WALK_SPEED = 150;
export const SNEAK_SPEED = 72;
export const THIEF_RADIUS = 11;

export class Thief {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.px = x; // previous position, for laser crossing tests
    this.py = y;
    this.facing = -Math.PI / 2;
    this.sneaking = false;
    this.moving = false;
    this.stepPhase = 0;
    this.stepTick = false; // flips each footstep, for the sound engine
  }

  /** Move from the held keys; returns true while actually walking. */
  update(dt, keys, solid) {
    let mx = 0;
    let my = 0;
    if (keys.left) mx -= 1;
    if (keys.right) mx += 1;
    if (keys.up) my -= 1;
    if (keys.down) my += 1;
    this.sneaking = !!keys.sneak;
    this.moving = mx !== 0 || my !== 0;
    if (!this.moving) return false;
    const len = Math.hypot(mx, my);
    const speed = this.sneaking ? SNEAK_SPEED : WALK_SPEED;
    const dx = (mx / len) * speed * dt;
    const dy = (my / len) * speed * dt;
    this.px = this.x;
    this.py = this.y;
    const next = moveCircle(solid, this.x, this.y, THIEF_RADIUS, dx, dy);
    this.x = next.x;
    this.y = next.y;
    this.facing = Math.atan2(dy, dx);
    const before = Math.floor(this.stepPhase);
    this.stepPhase += dt * (this.sneaking ? 5 : 9);
    if (Math.floor(this.stepPhase) !== before) this.stepTick = !this.stepTick;
    return true;
  }

  /** True when the thief's step is loud enough for a nearby warden to hear. */
  isNoisy() {
    return this.moving && !this.sneaking;
  }
}
