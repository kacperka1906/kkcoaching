import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const promotions = JSON.parse(fs.readFileSync(path.join(root, 'src/data/promotions.json'), 'utf8'));
const offers = promotions.offers;
const errors = [];

const allowedServices = new Set(['online', 'hybrid', 'personal-training', 'general', 'all']);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const ids = new Set();

const pairIsValid = (value) => value
  && typeof value.en === 'string' && value.en.trim()
  && typeof value.pl === 'string' && value.pl.trim();

if (!Array.isArray(offers)) {
  errors.push('promotions.offers must be an array');
} else {
  for (const [index, offer] of offers.entries()) {
    const prefix = `offers[${index}]`;

    if (typeof offer.id !== 'string' || !offer.id.trim()) errors.push(`${prefix}.id must be a non-empty string`);
    else if (ids.has(offer.id)) errors.push(`${prefix}.id must be unique: ${offer.id}`);
    else ids.add(offer.id);

    if (typeof offer.internalName !== 'string' || !offer.internalName.trim()) errors.push(`${prefix}.internalName must be a non-empty string`);
    if (typeof offer.enabled !== 'boolean') errors.push(`${prefix}.enabled must be boolean`);
    if (typeof offer.featured !== 'boolean') errors.push(`${prefix}.featured must be boolean`);
    if (!allowedServices.has(offer.service)) errors.push(`${prefix}.service is invalid: ${offer.service}`);
    if (!offer.display || typeof offer.display.homepage !== 'boolean' || typeof offer.display.servicePage !== 'boolean') {
      errors.push(`${prefix}.display must contain homepage and servicePage booleans`);
    }
    if (typeof offer.priority !== 'number' || !Number.isFinite(offer.priority)) errors.push(`${prefix}.priority must be a finite number`);

    for (const name of ['headline', 'title', 'offerText', 'promotionalPeriod', 'standardPriceText', 'ctaText', 'ctaDestination', 'smallPrint']) {
      if (!pairIsValid(offer[name])) errors.push(`${prefix}.${name} must contain non-empty en/pl values`);
    }

    if (typeof offer.showPrice !== 'boolean') errors.push(`${prefix}.showPrice must be boolean`);
    if (offer.showPrice) {
      for (const name of ['promotionalPrice', 'standardPrice']) {
        if (typeof offer[name] !== 'number' || !Number.isFinite(offer[name]) || offer[name] < 0) {
          errors.push(`${prefix}.${name} must be a non-negative number`);
        }
      }
    }

    if (typeof offer.showSpaces !== 'boolean') errors.push(`${prefix}.showSpaces must be boolean`);
    if (offer.showSpaces) {
      for (const name of ['totalSpaces', 'remainingSpaces']) {
        if (!Number.isInteger(offer[name]) || offer[name] < 0) errors.push(`${prefix}.${name} must be a non-negative integer`);
      }
      if (offer.remainingSpaces > offer.totalSpaces) errors.push(`${prefix}.remainingSpaces cannot exceed totalSpaces`);
    }

    if (typeof offer.autoDisableAfterEndDate !== 'boolean') errors.push(`${prefix}.autoDisableAfterEndDate must be boolean`);
    for (const name of ['startDate', 'endDate']) {
      if (offer[name] && (!datePattern.test(offer[name]) || Number.isNaN(Date.parse(`${offer[name]}T00:00:00Z`)))) {
        errors.push(`${prefix}.${name} must use YYYY-MM-DD`);
      }
    }
    if (offer.startDate && offer.endDate && offer.startDate > offer.endDate) errors.push(`${prefix}.startDate cannot be after endDate`);
  }
}

const pages = [
  { lang: 'en', placement: 'homepage', service: null, label: 'EN homepage', file: path.join(root, 'dist/index.html') },
  { lang: 'pl', placement: 'homepage', service: null, label: 'PL homepage', file: path.join(root, 'dist/pl/index.html') },
  { lang: 'en', placement: 'service', service: 'online', label: 'EN Online Coaching', file: path.join(root, 'dist/online-coaching/index.html') },
  { lang: 'pl', placement: 'service', service: 'online', label: 'PL Online Coaching', file: path.join(root, 'dist/pl/online-coaching/index.html') },
  { lang: 'en', placement: 'service', service: 'hybrid', label: 'EN Hybrid Coaching', file: path.join(root, 'dist/hybrid-coaching/index.html') },
  { lang: 'pl', placement: 'service', service: 'hybrid', label: 'PL Hybrid Coaching', file: path.join(root, 'dist/pl/hybrid-coaching/index.html') },
  { lang: 'en', placement: 'service', service: 'personal-training', label: 'EN Personal Training', file: path.join(root, 'dist/personal-training-cwmbran/index.html') },
  { lang: 'pl', placement: 'service', service: 'personal-training', label: 'PL Personal Training', file: path.join(root, 'dist/pl/personal-training-cwmbran/index.html') }
];

const matchesPage = (offer, page) => {
  if (!offer.enabled) return false;
  if (page.placement === 'homepage') return offer.display.homepage;
  if (!offer.display.servicePage) return false;
  return offer.service === page.service || offer.service === 'all';
};

for (const page of pages) {
  if (!fs.existsSync(page.file)) {
    errors.push(`missing built page: ${page.file}`);
    continue;
  }

  const html = fs.readFileSync(page.file, 'utf8');
  if (html.includes('data-online-promotion')) errors.push(`${page.label} still contains the legacy online promotion marker`);

  for (const offer of offers ?? []) {
    const marker = `data-promotion-id="${offer.id}"`;
    const expected = matchesPage(offer, page);
    const rendered = html.includes(marker);

    if (expected && !rendered) errors.push(`${page.label} is missing promotion ${offer.id}`);
    if (!expected && rendered) errors.push(`${page.label} renders promotion ${offer.id} in the wrong placement`);

    if (expected) {
      for (const text of [offer.headline[page.lang], offer.title[page.lang], offer.offerText[page.lang], offer.ctaText[page.lang], offer.smallPrint[page.lang]]) {
        if (!html.includes(text)) errors.push(`${page.label} promotion ${offer.id} is missing text: ${text}`);
      }
      if (offer.showPrice && !html.includes(`£${offer.promotionalPrice}`)) errors.push(`${page.label} promotion ${offer.id} is missing the promotional price`);
    }
  }
}

if (errors.length) {
  console.error('Promotion audit failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const enabledCount = (offers ?? []).filter(offer => offer.enabled).length;
console.log(`Promotion audit passed. campaigns=${offers?.length ?? 0}, enabled=${enabledCount}`);
