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
  const existingCounts = new Map();

  if (skipExisting) {
    const { reviews } = await getManualReviews(false, 1000);
    for (const review of reviews) {
      const key = reviewKey(review.author_name, review.text);
      existingCounts.set(key, (existingCounts.get(key) || 0) + 1);
    }
  }

  const desiredCounts = new Map();

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
    const key = reviewKey(payload.name, payload.text);
    const desiredCount = (desiredCounts.get(key) || 0) + 1;
    desiredCounts.set(key, desiredCount);

    if (skipExisting && (existingCounts.get(key) || 0) >= desiredCount) {
      skipped += 1;
      continue;
    }

    const result = await createManualReview(payload);
    if (result.ok) {
      imported += 1;
      existingCounts.set(key, (existingCounts.get(key) || 0) + 1);
    } else {
      failed += 1;
    }
  }

  return { imported, skipped, failed, total: items.length };
}
