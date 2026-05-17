/**
 * Import reviews scraped from kontrolavozidiel.sk into Supabase.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-reviews.mjs
 *   node scripts/import-reviews.mjs --file path/to/recenzie.md
 *   node scripts/import-reviews.mjs --dry-run
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createManualReview } from '../lib/kv.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_FILE = resolve(__dirname, 'data/recenzie-kontrolavozidiel.md');

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

function parseReviews(markdown) {
  const re = />\s*"([^"]+)"\s*\n>\s*\n>\s*([^_\n]+)\s*_([0-9.]+)_/g;
  const reviews = [];
  let match;
  while ((match = re.exec(markdown)) !== null) {
    const text = match[1].trim();
    const name = match[2].trim();
    const date = match[3].trim();
    if (!text || !name) continue;
    reviews.push({
      name,
      text,
      rating: 5,
      approved: true,
      source: 'import',
      relativeTimeDescription: date
    });
  }
  return reviews;
}

function parseArgs(argv) {
  const opts = { file: DEFAULT_FILE, dryRun: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--file' && argv[i + 1]) {
      opts.file = resolve(argv[++i]);
    }
  }
  return opts;
}

async function main() {
  loadEnvFile();
  const { file, dryRun } = parseArgs(process.argv);
  const markdown = readFileSync(file, 'utf8');
  const reviews = parseReviews(markdown);

  if (!reviews.length) {
    console.error('No reviews parsed from', file);
    process.exit(1);
  }

  console.log(`Parsed ${reviews.length} reviews from ${file}`);
  if (dryRun) {
    console.log('Dry run — first 3:', reviews.slice(0, 3));
    return;
  }

  let ok = 0;
  let fail = 0;
  for (const review of reviews) {
    const result = await createManualReview(review);
    if (result.ok) {
      ok += 1;
    } else {
      fail += 1;
      if (fail <= 5) {
        console.warn('Failed:', review.name, result.reason, result.detail || '');
      }
    }
  }

  console.log(`Done. Imported: ${ok}, failed: ${fail}`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
