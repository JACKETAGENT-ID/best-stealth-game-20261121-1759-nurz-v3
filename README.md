# Night at the Halcyon Gallery — nurz entry, round 3

A top-down 2D stealth game for make.fun's best-stealth-game bounty
(`best-stealth-game-20261121-1759`). You are a thief in a museum after
dark: slip past patrolling wardens and their vision cones, use display
cases and shadows as cover, grab the loot, and reach the exit unseen.

- Play: keyboard (WASD / arrows to move, Shift to sneak) + mouse.
- `game/` — the whole game, static files only, no network, no build step.
  Open `game/index.html` in a desktop browser and play offline.
- `screenshots/` — 4 real renders of the game running in a browser.
- `main.ts` — the hand-in program: copies `game/` + `screenshots/` to
  `/output` (or `$MAKEFUN_OUTPUT_DIR`) and writes `dossier.json` with the
  kit's `buildDossier` from `vendor/makefun-game.ts`.

Run it locally:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Round 3 fixes the round 2 grader failure: the old `main.ts` removed the
output directory itself, which fails with EBUSY when `/output` is a mount
point. This version only clears the directory's contents.

License: MIT (see LICENSE).
