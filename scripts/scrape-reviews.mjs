/**
 * Scrape reviews from kontrolavozidiel.sk/recenzie/ into markdown for import.
 *
 * Usage:
 *   node scripts/scrape-reviews.mjs
 *   node scripts/scrape-reviews.mjs --url https://www.kontrolavozidiel.sk/recenzie/
 *   node scripts/scrape-reviews.mjs --out scripts/data/recenzie-kontrolavozidiel.md
 */
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_URL = 'https://www.kontrolavozidiel.sk/recenzie/';
const DEFAULT_OUT = resolve(__dirname, 'data/recenzie-kontrolavozidiel.md');

function decodeHtml(s) {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseReviewsFromHtml(html) {
  const re =
    /data-recenzia="([^"]*)"[^>]*>[\s\S]*?<span class="text-grey">\s*([^<]+?)\s*<i>([^<]+)<\/i>/gi;
  const reviews = [];
  let match;
  while ((match = re.exec(html)) !== null) {
    const text = decodeHtml(match[1]);
    const name = decodeHtml(match[2]);
    const date = decodeHtml(match[3]);
    if (!text || !name) continue;
    reviews.push({ text, name, date });
  }
  return reviews;
}

function toMarkdown(url, reviews) {
  const lines = [
    `Source URL: ${url}`,
    'Title: STK, EK a KO Pezinok | JP Control s.r.o.',
    '',
    '## RECENZIE',
    '',
    '---',
    '',
    'Vaše meno',
    '',
    'Rezenzia',
    ''
  ];
  for (const { text, name, date } of reviews) {
    const safeText = text.replace(/"/g, '\\"');
    lines.push(`> "${safeText}"`, '>', `> ${name} _${date}_`, '');
  }
  return `${lines.join('\n')}\n`;
}

function parseArgs(argv) {
  const opts = { url: DEFAULT_URL, out: DEFAULT_OUT };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--url' && argv[i + 1]) opts.url = argv[++i];
    else if (arg === '--out' && argv[i + 1]) opts.out = resolve(argv[++i]);
  }
  return opts;
}

async function main() {
  const { url, out } = parseArgs(process.argv);
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; JanciWebScraper/1.0)',
      Accept: 'text/html'
    },
    signal: AbortSignal.timeout(30000)
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  const html = await res.text();
  const reviews = parseReviewsFromHtml(html);
  if (!reviews.length) {
    console.error('No reviews found in HTML — page structure may have changed.');
    process.exit(1);
  }
  const markdown = toMarkdown(url, reviews);
  writeFileSync(out, markdown, 'utf8');
  const jsonOut = resolve(__dirname, '../lib/data/reviews-import.json');
  writeFileSync(
    jsonOut,
    JSON.stringify(
      reviews.map((r) => ({ name: r.name, text: r.text, rating: 5, date: r.date })),
      null,
      0
    ),
    'utf8'
  );
  console.log(`Scraped ${reviews.length} reviews → ${out}`);
  console.log(`Bundle JSON → ${jsonOut}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
