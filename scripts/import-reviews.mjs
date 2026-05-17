/**
 * Import bundled reviews (lib/data/reviews-import.json) into Supabase.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run reviews:import
 *   npm run reviews:import:dry
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createManualReview, getManualReviews } from '../lib/kv.js';
import { bulkImportReviews } from '../lib/reviews-import.js';

function loadEnvFile() {
  try {
    const envPath = resolve(process.cwd(), '.env');
    const raw = readFileSync(envPath, 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // optional .env
  }
}

function parseArgs(argv) {
  const opts = { dryRun: false, skipExisting: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--skip-existing') opts.skipExisting = true;
  }
  return opts;
}

async function main() {
  loadEnvFile();
  const { dryRun, skipExisting } = parseArgs(process.argv);

  if (dryRun) {
    const { loadImportReviews } = await import('../lib/reviews-import.js');
    const reviews = loadImportReviews();
    console.log(`Dry run — ${reviews.length} reviews in bundle, first:`, reviews[0]);
    return;
  }

  const result = await bulkImportReviews({
    createManualReview,
    getManualReviews,
    skipExisting
  });

  console.log(
    `Done. Total: ${result.total}, imported: ${result.imported}, skipped: ${result.skipped}, failed: ${result.failed}`
  );
  if (result.failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
