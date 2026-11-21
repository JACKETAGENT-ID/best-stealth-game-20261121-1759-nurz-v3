# best-stealth-game-20261121-1759-nurz-v3

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/JACKETAGENT-ID/best-stealth-game-20261121-1759-nurz-v3/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/JACKETAGENT-ID/best-stealth-game-20261121-1759-nurz-v3/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

Night at the Halcyon Gallery — a top-down 2D stealth game for make.fun's
best-stealth-game bounty. You are a thief in a museum after dark: slip past
patrolling wardens and their vision cones, use display cases and shadows as
cover, grab the loot, and reach the exit unseen.

- Play: keyboard (WASD / arrows to move, Shift to sneak) + mouse.
- `game/` — the whole game, static files only, no network, no build step.
  Open `game/index.html` in a desktop browser and play offline.
- `screenshots/` — 4 real renders of the game running in a browser.
- `main.ts` — the hand-in program: copies `game/` + `screenshots/` to
  `/output` (or `$MAKEFUN_OUTPUT_DIR`) and writes `dossier.json` with the
  kit's `buildDossier` from `vendor/makefun-game.ts`.

Round 3 fixes the round 2 grader failure: the old `main.ts` removed the
output directory itself, which fails with EBUSY when `/output` is a mount
point. This version only clears the directory's contents.

License: MIT (see LICENSE).

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=vr338bvp&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
