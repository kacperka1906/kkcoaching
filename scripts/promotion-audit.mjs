import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const promotion = JSON.parse(fs.readFileSync(path.join(root, 'src/data/online-promotion.json'), 'utf8'));

const errors = [];
const requiredPair = (name) => {
  const value = promotion[name];
  if (!value || typeof value.en !== 'string' || !value.en.trim() || typeof value.pl !== 'string' || !value.pl.trim()) {
    errors.push(`${name} must contain non-empty en/pl values`);
  }
};

for (const name of ['headline', 'promotionalPeriod', 'ctaText', 'ctaDestination', 'smallPrint']) requiredPair(name);
for (const name of ['promotionalPrice', 'standardPrice', 'totalSpaces', 'remainingSpaces']) {
  if (typeof promotion[name] !== 'number' || !Number.isFinite(promotion[name]) || promotion[name] < 0) {
    errors.push(`${name} must be a non-negative number`);
  }
}

if (!Number.isInteger(promotion.totalSpaces) || !Number.isInteger(promotion.remainingSpaces)) {
  errors.push('totalSpaces and remainingSpaces must be integers');
}
if (promotion.remainingSpaces > promotion.totalSpaces) errors.push('remainingSpaces cannot exceed totalSpaces');
if (typeof promotion.enabled !== 'boolean') errors.push('enabled must be boolean');
if (typeof promotion.autoDisableAfterEndDate !== 'boolean') errors.push('autoDisableAfterEndDate must be boolean');

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
for (const name of ['startDate', 'endDate']) {
  if (promotion[name] && (!datePattern.test(promotion[name]) || Number.isNaN(Date.parse(`${promotion[name]}T00:00:00Z`)))) {
    errors.push(`${name} must use YYYY-MM-DD`);
  }
}
if (promotion.startDate && promotion.endDate && promotion.startDate > promotion.endDate) {
  errors.push('startDate cannot be after endDate');
}

const pages = [
  { lang: 'en', file: path.join(root, 'dist/online-coaching/index.html') },
  { lang: 'pl', file: path.join(root, 'dist/pl/online-coaching/index.html') }
];

const spacesLabel = (lang) => {
  const count = promotion.remainingSpaces;
  if (count >= promotion.totalSpaces) return lang === 'pl' ? `${promotion.totalSpaces} MIEJSC DLA NOWYCH KLIENTÓW` : `${promotion.totalSpaces} NEW CLIENT SPACES`;
  if (lang === 'en') return `${count} ${count === 1 ? 'SPACE' : 'SPACES'} REMAINING`;
  if (count === 1) return `ZOSTAŁO ${count} MIEJSCE`;
  const lastTwo = count % 100;
  const last = count % 10;
  return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)
    ? `ZOSTAŁY ${count} MIEJSCA`
    : `ZOSTAŁO ${count} MIEJSC`;
};

for (const page of pages) {
  if (!fs.existsSync(page.file)) {
    errors.push(`missing built page: ${page.file}`);
    continue;
  }
  const html = fs.readFileSync(page.file, 'utf8');
  const hasPromotion = html.includes('data-online-promotion');
  if (promotion.enabled && !hasPromotion) errors.push(`${page.lang} Online Coaching is missing the enabled promotion`);
  if (!promotion.enabled && hasPromotion) errors.push(`${page.lang} Online Coaching still renders promotion while disabled`);
  if (promotion.enabled) {
    const expected = [
      promotion.headline[page.lang],
      `£${promotion.promotionalPrice}`,
      spacesLabel(page.lang),
      promotion.ctaText[page.lang],
      promotion.smallPrint[page.lang]
    ];
    for (const text of expected) {
      if (!html.includes(text)) errors.push(`${page.lang} Online Coaching missing promotion text: ${text}`);
    }
  }
}

if (errors.length) {
  console.error('Promotion audit failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Promotion audit passed. enabled=${promotion.enabled}, remaining=${promotion.remainingSpaces}/${promotion.totalSpaces}, end=${promotion.endDate}`);
