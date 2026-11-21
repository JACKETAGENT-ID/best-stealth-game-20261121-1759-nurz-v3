// Hand-in entrypoint for "Night at the Halcyon Gallery" (nurz, round 4).
//
// Copies game/ and screenshots/ from this repository into the output
// directory and writes dossier.json there with buildDossier from the
// kit's vendor/makefun-game.ts (unchanged copy).
//
// Why this version exists: round 2 died with exit code 1 in the grader.
// Its main.ts called rmSync() on the output directory itself, and in the
// grader /output is a mount point, so removing it fails with EBUSY
// ("Device or resource busy"). The fix: never remove the output
// directory — only delete the entries inside it, then recreate the
// subdirectories we need. An empty directory is already the expected
// state, so clearing its contents is all the cleaning we ever need.
//
// The repository root is derived from this file's own URL, never from
// process.cwd(): the grader runs `node /bot/main.ts` from elsewhere.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Empty the output directory WITHOUT removing it: /output may be a
// mount point in the grading sandbox, and rmSync on a mount point
// throws EBUSY. Removing each entry inside is always safe.
mkdirSync(outDir, { recursive: true });
for (const entry of readdirSync(outDir)) {
  rmSync(join(outDir, entry), { recursive: true, force: true });
}

// Stage one repository folder into the output directory and report how
// much was copied. The walk is sorted so the counts (and anything derived
// from them) come out identical on every run. A folder flagged optional
// is skipped silently when the repository does not carry it — round 4
// uses that for an extras/ folder the game may grow later, so adding one
// never needs another entrypoint change.
function stageTree(name, { optional = false } = {}) {
  const src = join(repoRoot, name);
  if (!existsSync(src)) {
    if (optional) return { files: 0, bytes: 0 };
    throw new Error(`required folder missing from repository: ${name}`);
  }
  cpSync(src, join(outDir, name), { recursive: true });
  let files = 0;
  let bytes = 0;
  const walk = (dir) => {
    for (const entry of readdirSync(dir).sort()) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else {
        files += 1;
        bytes += statSync(full).size;
      }
    }
  };
  walk(join(outDir, name));
  return { files, bytes };
}

const staged = {
  game: stageTree('game'),
  screenshots: stageTree('screenshots'),
  extras: stageTree('extras', { optional: true }),
};

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});

// Sanity-check the dossier before calling it done: it must be valid JSON
// (a truncated or malformed hand-in would only surface inside the grader
// otherwise), and the staged game tree must be non-empty. buildDossier
// hands back raw bytes (a Uint8Array), not a string — decode first, or
// JSON.parse sees a comma-separated byte list and throws.
const parsed = JSON.parse(new TextDecoder().decode(dossier));
if (typeof parsed !== 'object' || parsed === null) {
  throw new Error('buildDossier did not return a JSON object');
}
if (staged.game.files === 0) {
  throw new Error('staged game folder is empty — nothing to hand in');
}
writeFileSync(join(outDir, 'dossier.json'), dossier);

// One-line build summary on stdout. Deterministic (counts only, no
// timestamps), so repeated runs stay byte-identical in the output dir.
const totalFiles = staged.game.files + staged.screenshots.files + staged.extras.files;
const totalBytes = staged.game.bytes + staged.screenshots.bytes + staged.extras.bytes;
console.log(`halcyon-gallery: staged ${totalFiles} files (${totalBytes} bytes) -> ${outDir}`);
