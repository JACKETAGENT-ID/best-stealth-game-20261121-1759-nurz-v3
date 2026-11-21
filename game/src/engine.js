// The night itself: loop, states, detection, loot, exit — and the staged
// scenes the maker's screenshots are taken from (?shot=cover|patrol|alarm|escape).
import { TILE, parseMuseum } from './museum.js';
import { Thief } from './thief.js';
import { makeWardens, makeCameras, makeLasers } from './wardens.js';
import { drawWorld } from './painter.js';
import { SoundBank } from './sound.js';

export const SHOT_NAMES = ['cover', 'patrol', 'alarm', 'escape'];

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export class NightHeist {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.museum = parseMuseum();
    this.thief = new Thief(this.museum.start.x, this.museum.start.y);
    this.wardens = makeWardens();
    this.cameras = makeCameras();
    this.lasers = makeLasers();
    this.sound = new SoundBank();
    this.keys = { up: false, down: false, left: false, right: false, sneak: false };
    this.state = 'menu'; // menu | play | caught | win
    this.time = 0;
    this.playSeconds = 0;
    this.detection = 0; // 0..100; at 100 the wardens have Wren
    this.lootTaken = 0;
    this.score = 0;
    this.wasSuspicious = false;
    this.raf = 0;
    this.lastStamp = 0;
    this.shot = null;
    this.el = {
      loot: document.getElementById('lootLine'),
      objective: document.getElementById('objectiveLine'),
      fill: document.getElementById('detectFill'),
      timer: document.getElementById('timer'),
      banner: document.getElementById('banner'),
      bannerTitle: document.getElementById('bannerTitle'),
      bannerText: document.getElementById('bannerText'),
      bannerKeys: document.getElementById('bannerKeys'),
    };
  }

  start() {
    const params = new URLSearchParams(window.location.search);
    const shot = params.get('shot');
    if (shot && SHOT_NAMES.includes(shot)) {
      this.shot = shot;
      this.applyShot(shot);
      this.state = 'play';
      this.render();
      this.syncHud();
      return; // staged scene: one frozen frame, no loop, for screenshots
    }
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    this.canvas.addEventListener('click', () => this.pressStart());
    this.showBanner(
      'NIGHT AT THE HALCYON GALLERY',
      'Wren slips in through the service door. Three treasures gleam behind glass — take them all, then reach the green door without ever being seen.',
      'Press Enter or click to begin',
    );
    this.render();
    this.raf = requestAnimationFrame((t) => this.loop(t));
  }

  onKey(e, down) {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') this.keys.up = down;
    if (k === 'arrowdown' || k === 's') this.keys.down = down;
    if (k === 'arrowleft' || k === 'a') this.keys.left = down;
    if (k === 'arrowright' || k === 'd') this.keys.right = down;
    if (k === 'shift') this.keys.sneak = down;
    if (down && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === ' ')) e.preventDefault();
    if (!down) return;
    this.sound.unlock();
    if (k === 'enter' && this.state === 'menu') this.pressStart();
    if (k === 'r' && (this.state === 'caught' || this.state === 'win')) this.reset();
    if (k === 'm') this.sound.toggleMute();
  }

  pressStart() {
    if (this.state !== 'menu') return;
    this.sound.unlock();
    this.state = 'play';
    this.hideBanner();
  }

  reset() {
    this.museum = parseMuseum();
    this.thief = new Thief(this.museum.start.x, this.museum.start.y);
    this.wardens = makeWardens();
    this.cameras = makeCameras();
    this.lasers = makeLasers();
    this.state = 'play';
    this.playSeconds = 0;
    this.detection = 0;
    this.lootTaken = 0;
    this.score = 0;
    this.wasSuspicious = false;
    this.hideBanner();
  }

  loop(stamp) {
    const dt = Math.min(0.05, (stamp - this.lastStamp) / 1000 || 0.016);
    this.lastStamp = stamp;
    this.time += dt;
    if (this.state === 'play') this.update(dt);
    this.render();
    this.syncHud();
    this.raf = requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    this.playSeconds += dt;
    const moved = this.thief.update(dt, this.keys, this.museum.solid);
    if (moved) this.sound.step(this.thief.sneaking);
    for (const w of this.wardens) w.update(dt);
    for (const c of this.cameras) c.update(dt);
    for (const g of this.lasers) g.update(dt);

    // Who can see Wren right now?
    let seen = 0;
    for (const w of this.wardens) {
      const rate = w.spotRate(this.museum.solid, this.thief.x, this.thief.y, this.thief.sneaking);
      w.seesPlayer = rate > 0;
      w.suspicion = Math.min(1, Math.max(0, w.suspicion + (rate > 0 ? dt * 2 : -dt)));
      seen += rate;
    }
    for (const c of this.cameras) {
      const rate = c.spotRate(this.museum.solid, this.thief.x, this.thief.y, this.thief.sneaking);
      c.seesPlayer = rate > 0;
      seen += rate;
    }
    // Loud steps carry: running close to a warden is heard, not seen.
    if (this.thief.isNoisy()) {
      for (const w of this.wardens) {
        const d = Math.hypot(w.x - this.thief.x, w.y - this.thief.y);
        if (d < 120) seen += 14;
      }
    }
    // A live laser beam crossed at full stride.
    for (const g of this.lasers) {
      if (g.crosses(this.thief.px, this.thief.py, this.thief.x, this.thief.y)) {
        this.detection = Math.min(100, this.detection + 42);
        this.sound.suspicious();
      }
    }
    if (seen > 0) this.detection = Math.min(100, this.detection + seen * dt);
    else this.detection = Math.max(0, this.detection - 28 * dt);

    if (this.detection >= 60 && !this.wasSuspicious) {
      this.sound.suspicious();
      this.wasSuspicious = true;
    }
    if (this.detection < 40) this.wasSuspicious = false;

    // Treasures: walk over one to pocket it.
    for (const t of this.museum.treasures) {
      if (t.taken) continue;
      if (Math.hypot(t.x - this.thief.x, t.y - this.thief.y) < 24) {
        t.taken = true;
        this.lootTaken += 1;
        this.score += 1000;
        this.sound.pickup();
      }
    }

    // The green door opens only with all three treasures.
    const allLoot = this.lootTaken === this.museum.treasures.length;
    const ex = this.museum.exit.tx * TILE + TILE / 2;
    const ey = this.museum.exit.ty * TILE + TILE / 2;
    if (allLoot && Math.hypot(ex - this.thief.x, ey - this.thief.y) < 24) {
      this.state = 'win';
      this.score += Math.max(0, 600 - Math.floor(this.playSeconds) * 5);
      this.sound.win();
      this.showBanner(
        'CLEAN GETAWAY',
        `All three treasures, and nobody saw a thing. Time ${formatTime(this.playSeconds)} — score ${this.score}.`,
        'Press R to run it again',
      );
      return;
    }

    if (this.detection >= 100) {
      this.state = 'caught';
      this.sound.alarm();
      this.showBanner(
        'SPOTTED!',
        'A warden’s lantern finds you mid-step. The gallery wakes, the doors lock, and Wren melts back into the night to try again.',
        'Press R to retry',
      );
    }
  }

  render() {
    drawWorld(this.ctx, this);
  }

  syncHud() {
    if (this.el.loot) {
      this.el.loot.textContent = `Treasures ${this.lootTaken} / ${this.museum.treasures.length}`;
    }
    if (this.el.objective) {
      this.el.objective.textContent =
        this.lootTaken === this.museum.treasures.length
          ? 'All treasures pocketed — reach the green door!'
          : 'Slip past the wardens, take the treasures, leave unseen.';
    }
    if (this.el.fill) {
      this.el.fill.style.width = `${this.detection}%`;
      this.el.fill.style.background = this.detection >= 60 ? '#e5484d' : this.detection >= 30 ? '#e5a83c' : '#3fae5a';
    }
    if (this.el.timer) this.el.timer.textContent = formatTime(this.playSeconds);
  }

  showBanner(title, text, keys) {
    if (!this.el.banner) return;
    this.el.bannerTitle.textContent = title;
    this.el.bannerText.textContent = text;
    this.el.bannerKeys.textContent = keys;
    this.el.banner.style.display = 'block';
  }

  hideBanner() {
    if (this.el.banner) this.el.banner.style.display = 'none';
  }

  /**
   * Frozen scenes for the maker's screenshots: fixed poses, fixed detection,
   * fixed laser phase — the same pixels every time the page loads.
   */
  applyShot(shot) {
    const put = (tx, ty, facing) => {
      this.thief.x = tx * TILE + TILE / 2;
      this.thief.y = ty * TILE + TILE / 2;
      this.thief.px = this.thief.x;
      this.thief.py = this.thief.y;
      this.thief.facing = facing;
      this.thief.sneaking = true;
    };
    const aim = (guard, facing) => { guard.facing = facing; guard.waiting = 99; };
    if (shot === 'cover') {
      // Wren crouched behind a vitrine as Bram's lantern sweeps past; one treasure already pocketed.
      put(10, 7, Math.PI);
      this.museum.treasures[0].taken = true;
      this.lootTaken = 1;
      this.score = 1000;
      aim(this.wardens[0], 0);
      this.wardens[0].x = 6 * TILE + 16;
      this.wardens[0].y = 4 * TILE + 16;
      this.wardens[0].seesPlayer = false;
      aim(this.wardens[1], Math.PI);
      this.wardens[1].x = 24 * TILE + 16;
      this.wardens[1].y = 8 * TILE + 16;
      this.detection = 34;
      this.playSeconds = 47;
      this.lasers[0].time = 0.5; // beam live
      this.lasers[1].time = 3.0; // beam dark
    } else if (shot === 'patrol') {
      // Wide view: two beats crossing, camera sweeping, Wren at the door.
      put(1, 1, Math.PI / 2);
      this.thief.sneaking = false;
      aim(this.wardens[0], 0);
      this.wardens[0].x = 8 * TILE + 16;
      this.wardens[0].y = 4 * TILE + 16;
      aim(this.wardens[2], 0);
      this.wardens[2].x = 7 * TILE + 16;
      this.wardens[2].y = 10 * TILE + 16;
      this.cameras[0].facing = Math.PI / 2 + 0.5;
      this.detection = 0;
      this.playSeconds = 12;
      this.lasers[0].time = 3.2;
      this.lasers[1].time = 0.4;
    } else if (shot === 'alarm') {
      // A near miss: Sable's cone touches Wren, the meter almost full.
      put(20, 8, Math.PI);
      aim(this.wardens[1], Math.PI);
      this.wardens[1].x = 17 * TILE + 16;
      this.wardens[1].y = 8 * TILE + 16;
      this.wardens[1].seesPlayer = true;
      this.wardens[1].suspicion = 1;
      this.museum.treasures[0].taken = true;
      this.museum.treasures[1].taken = true;
      this.lootTaken = 2;
      this.score = 2000;
      this.detection = 82;
      this.playSeconds = 96;
      this.lasers[0].time = 0.2;
      this.lasers[1].time = 0.8;
    } else if (shot === 'escape') {
      // The last steps: all three treasures pocketed, the green door open, Mira looking away.
      put(25, 13, 0);
      this.thief.sneaking = false;
      for (const t of this.museum.treasures) t.taken = true;
      this.lootTaken = 3;
      this.score = 3000;
      aim(this.wardens[3], Math.PI);
      this.wardens[3].x = 18 * TILE + 16;
      this.wardens[3].y = 16 * TILE + 16;
      this.cameras[1].facing = -Math.PI / 2 - 0.6;
      this.detection = 12;
      this.playSeconds = 148;
      this.lasers[0].time = 3.4;
      this.lasers[1].time = 2.8; // exit beam dark, the way is clear
    }
  }
}
