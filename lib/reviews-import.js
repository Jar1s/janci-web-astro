import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, 'data/reviews-import.json');

export function reviewKey(name, text) {
  return `${String(name).trim().toLowerCase()}|${String(text).trim().slice(0, 120).toLowerCase()}`;
}

export function loadImportReviews() {
  const raw = readFileSync(DATA_FILE, 'utf8');
  const items = JSON.parse(raw);
  if (!Array.isArray(items) || !items.length) {
    throw new Error('reviews-import.json is empty or invalid');
  }
  return items;
}

export async function bulkImportReviews({ createManualReview, getManualReviews, skipExisting = true }) {
  const items = loadImportReviews();
  let existingKeys = new Set();

  if (skipExisting) {
    const { reviews } = await getManualReviews(false, 1000);
    existingKeys = new Set(reviews.map((r) => reviewKey(r.author_name, r.text)));
  }

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of items) {
    const payload = {
      name: item.name,
      text: item.text,
      rating: item.rating ?? 5,
      approved: true,
      source: 'import',
      relativeTimeDescription: item.date || 'import'
    };

    if (skipExisting && existingKeys.has(reviewKey(payload.name, payload.text))) {
      skipped += 1;
      continue;
    }

    const result = await createManualReview(payload);
    if (result.ok) {
      imported += 1;
      existingKeys.add(reviewKey(payload.name, payload.text));
    } else {
      failed += 1;
    }
  }

  return { imported, skipped, failed, total: items.length };
}
