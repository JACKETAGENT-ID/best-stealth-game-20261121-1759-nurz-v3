// Hand-in entrypoint for "Night at the Halcyon Gallery" (nurz, round 3).
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
import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
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

cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
