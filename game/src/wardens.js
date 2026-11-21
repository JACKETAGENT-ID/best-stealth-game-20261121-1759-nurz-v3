// Night wardens, wall cameras and blinking laser gates: everything that can
// spot Wren, and the rules for how fast being seen turns into being caught.
import { TILE, losClear } from './museum.js';

export const GUARD_SPEED = 55; // px per second on patrol
export const GUARD_RANGE = 185; // how far a warden can see
export const GUARD_HALF_ANGLE = 0.62; // radians either side of facing
export const CAMERA_RANGE = 205;
export const CAMERA_HALF_ANGLE = 0.5;

const TAU = Math.PI * 2;

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
}

/** A warden walking a loop of tile waypoints, pausing at each corner. */
export class Warden {
  constructor(name, waypoints, pauseSeconds = 1.2) {
    this.name = name;
    this.waypoints = waypoints.map(([tx, ty]) => ({
      x: tx * TILE + TILE / 2,
      y: ty * TILE + TILE / 2,
    }));
    this.pauseSeconds = pauseSeconds;
    this.index = 0;
    this.x = this.waypoints[0].x;
    this.y = this.waypoints[0].y;
    this.facing = 0;
    this.waiting = 0;
    this.seesPlayer = false;
    this.suspicion = 0; // 0..1, how alarmed this warden looks
    this.stepPhase = 0;
  }

  update(dt) {
    const target = this.waypoints[(this.index + 1) % this.waypoints.length];
    if (this.waiting > 0) {
      this.waiting -= dt;
      this.stepPhase += dt * 2;
      return;
    }
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const step = GUARD_SPEED * dt;
    if (dist <= step) {
      this.x = target.x;
      this.y = target.y;
      this.index = (this.index + 1) % this.waypoints.length;
      this.waiting = this.pauseSeconds;
      return;
    }
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    this.facing = Math.atan2(dy, dx);
    this.stepPhase += dt * 9;
  }

  /** Detection rate (0..~70 per second) against the player, or 0 when blind. */
  spotRate(solid, px, py, sneaking) {
    const dx = px - this.x;
    const dy = py - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > GUARD_RANGE) return 0;
    if (Math.abs(angleDiff(Math.atan2(dy, dx), this.facing)) > GUARD_HALF_ANGLE) return 0;
    if (!losClear(solid, this.x, this.y, px, py)) return 0;
    const closeness = 1 - (dist / GUARD_RANGE) * 0.55;
    let rate = 62 * closeness;
    if (sneaking) rate *= 0.45;
    return rate;
  }
}

/** A wall camera sweeping its cone back and forth. */
export class Camera {
  constructor(tx, ty, baseAngle, sweep = 0.85, period = 5) {
    this.x = tx * TILE + TILE / 2;
    this.y = ty * TILE + TILE / 2;
    this.baseAngle = baseAngle;
    this.sweep = sweep;
    this.period = period;
    this.time = Math.random() * period;
    this.facing = baseAngle;
    this.seesPlayer = false;
  }

  update(dt) {
    this.time += dt;
    this.facing = this.baseAngle + Math.sin((this.time / this.period) * TAU) * this.sweep;
  }

  spotRate(solid, px, py, sneaking) {
    const dx = px - this.x;
    const dy = py - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > CAMERA_RANGE) return 0;
    if (Math.abs(angleDiff(Math.atan2(dy, dx), this.facing)) > CAMERA_HALF_ANGLE) return 0;
    if (!losClear(solid, this.x, this.y, px, py)) return 0;
    let rate = 46 * (1 - (dist / CAMERA_RANGE) * 0.5);
    if (sneaking) rate *= 0.5;
    return rate;
  }
}

/** A laser gate: two floor posts, one beam, blinking on a fixed rhythm. */
export class LaserGate {
  constructor(x1, y1, x2, y2, onSeconds = 2.2, offSeconds = 1.4, phase = 0) {
    this.x1 = x1; this.y1 = y1;
    this.x2 = x2; this.y2 = y2;
    this.onSeconds = onSeconds;
    this.offSeconds = offSeconds;
    this.time = phase;
    this.tripped = false; // latched until the beam goes dark again
  }

  update(dt) {
    this.time += dt;
    const cycle = this.onSeconds + this.offSeconds;
    if (this.time >= cycle) this.time -= cycle;
    if (!this.isOn()) this.tripped = false;
  }

  isOn() {
    return this.time < this.onSeconds;
  }

  /** True on the frame the player's step crosses a live beam. */
  crosses(px0, py0, px1, py1) {
    if (!this.isOn() || this.tripped) return false;
    const d = segmentsCross(px0, py0, px1, py1, this.x1, this.y1, this.x2, this.y2);
    if (d) this.tripped = true;
    return d;
  }
}

function segmentsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = direction(cx, cy, dx, dy, ax, ay);
  const d2 = direction(cx, cy, dx, dy, bx, by);
  const d3 = direction(ax, ay, bx, by, cx, cy);
  const d4 = direction(ax, ay, bx, by, dx, dy);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function direction(px, py, qx, qy, rx, ry) {
  return (rx - px) * (qy - py) - (ry - py) * (qx - px);
}

/** The four wardens of the Halcyon Gallery, each with their own beat. */
export function makeWardens() {
  return [
    new Warden('Bram', [[2, 4], [13, 4]]),
    new Warden('Sable', [[17, 8], [27, 8]]),
    new Warden('Odo', [[2, 10], [13, 10]]),
    new Warden('Mira', [[16, 16], [27, 16]]),
  ];
}

export function makeCameras() {
  return [
    new Camera(15, 5, Math.PI / 2, 0.85, 5), // watches the north hall, sweeps down
    new Camera(14, 13, -Math.PI / 2, 0.8, 6), // watches the south hall, sweeps up
  ];
}

export function makeLasers() {
  return [
    // Across the east-west crossing corridor (row 7).
    new LaserGate(15 * TILE + 16, 6 * TILE + 16, 15 * TILE + 16, 9 * TILE + 16, 2.2, 1.4, 0),
    // Across the approach to the exit door (row 13).
    new LaserGate(17 * TILE + 16, 13 * TILE + 16, 28 * TILE + 16, 13 * TILE + 16, 2.0, 1.6, 1.1),
  ];
}
