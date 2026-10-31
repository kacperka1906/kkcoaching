import fs from 'node:fs';
import path from 'node:path';
import { isOfferActive } from '../src/lib/promotions.mjs';

const root = process.cwd();
const promotions = JSON.parse(fs.readFileSync(path.join(root, 'src/data/promotions.json'), 'utf8'));
const offers = promotions.offers;
const errors = [];
const buildDate = new Date(JSON.parse(fs.readFileSync(path.join(root, 'dist/promotion-state.json'), 'utf8')).builtAt);

const allowedServices = new Set(['online', 'hybrid', 'personal-training', 'general', 'all']);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const ids = new Set();
const trialId = 'free-7-day-kk-coaching-trial';
const trialDestinations = {
  en: 'https://kkcoaching.mypthub.net/p/240389',
  pl: 'https://kkcoaching.mypthub.net/p/240387'
};
const countOccurrences = (text, fragment) => text.split(fragment).length - 1;


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

    for (const name of ['headline', 'ctaText', 'ctaDestination', 'smallPrint']) {
      if (!pairIsValid(offer[name])) errors.push(`${prefix}.${name} must contain non-empty en/pl values`);
    }

    if (typeof offer.showPrice !== 'boolean') errors.push(`${prefix}.showPrice must be boolean`);
    if (offer.showPrice) {
      for (const name of ['promotionalPeriod', 'standardPriceText']) {
        if (!pairIsValid(offer[name])) errors.push(`${prefix}.${name} must contain non-empty en/pl values when showPrice is enabled`);
      }
      for (const name of ['promotionalPrice', 'standardPrice']) {
        if (typeof offer[name] !== 'number' || !Number.isFinite(offer[name]) || offer[name] < 0) {
          errors.push(`${prefix}.${name} must be a non-negative number`);
        }
      }
    } else {
      for (const name of ['title', 'offerText']) {
        if (!pairIsValid(offer[name])) errors.push(`${prefix}.${name} must contain non-empty en/pl values when showPrice is disabled`);
      }
    }

    if (offer.id === 'october-2026-free-pt-taster') {
      if (!offer.enabled || offer.startDate || offer.endDate || offer.autoDisableAfterEndDate !== false
          || offer.display?.homepage !== true || offer.display?.servicePage !== true
          || offer.service !== 'personal-training') {
        errors.push(`${prefix} taster must remain permanent on home and PT pages`);
      }
      for (const lang of ['en', 'pl']) {
        const expected = `${lang === 'pl' ? '/pl' : ''}/contact?interest=taster`;
        if (offer.ctaDestination?.[lang] !== expected) errors.push(`${prefix} incorrect ${lang} taster destination`);
      }
    }
    if (offer.id === trialId) {
      if (!offer.enabled || offer.service !== 'general' || offer.display?.homepage !== true || offer.display?.servicePage !== false) {
        errors.push(`${prefix} trial must be enabled on homepages only`);
      }
      if (offer.showPrice !== true || offer.promotionalPrice !== 0 || offer.standardPrice !== 0) {
        errors.push(`${prefix} trial must have showPrice=true and £0 pricing`);
      }
      if (offer.startDate || offer.endDate || offer.autoDisableAfterEndDate !== false) {
        errors.push(`${prefix} trial must have no start/end date or automatic expiry`);
      }
      for (const lang of ['en', 'pl']) {
        if (offer.ctaDestination?.[lang] !== trialDestinations[lang]) {
          errors.push(`${prefix} trial ${lang} checkout URL is incorrect`);
        }
        if (!Array.isArray(offer.trialFeatures?.[lang]) ||
            offer.trialFeatures[lang].length !== 5 ||
            offer.trialFeatures[lang].some(item => typeof item !== 'string' || !item.trim()) ||
            new Set(offer.trialFeatures[lang]).size !== 5) {
          errors.push(`${prefix} trial must contain exactly five distinct ${lang} features`);
        }
        if (!offer.title?.[lang]?.trim() || !offer.offerText?.[lang]?.trim()) {
          errors.push(`${prefix} trial ${lang} title and description are required`);
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

for (const requiredId of [trialId, 'october-2026-free-pt-taster']) {
  if (!offers?.some(offer => offer.id === requiredId)) errors.push(`Missing permanent offer ${requiredId}`);
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
  if (!isOfferActive(offer, buildDate)) return false;
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
  if (page.placement === 'homepage') {
    const intended = [trialId, 'october-2026-free-pt-taster', 'october-2026-20-off-everything', 'winter-kickstart-2026-pt', 'winter-kickstart-2026-hybrid']
      .filter(id => offers.some(offer => offer.id === id && matchesPage(offer, page)));
    const actual = [...html.matchAll(/data-promotion-id="([^"]+)"/g)].map(match => match[1]);
    const known = actual.filter(id => intended.includes(id));
    if (JSON.stringify(known) !== JSON.stringify(intended)) errors.push(`${page.label} incorrect promotion DOM order`);
  }
  if (html.includes('data-online-promotion')) errors.push(`${page.label} still contains the legacy online promotion marker`);

  for (const offer of offers ?? []) {
    const marker = `data-promotion-id="${offer.id}"`;
    const expected = matchesPage(offer, page);
    const rendered = html.includes(marker);
    const occurrenceCount = countOccurrences(html, marker);
    if (occurrenceCount !== (expected ? 1 : 0)) {
      errors.push(`${page.label} ${offer.id} must appear exactly ${expected ? 'once' : 'zero times'} (found ${occurrenceCount})`);
    }
    if (offer.id === trialId) {
      if (expected) {
        // Validate only the trial article, not text that may appear elsewhere on the page.
        const articleMatch = html.match(new RegExp(`<article\\b(?=[^>]*data-promotion-id="${trialId}")[^>]*>[\\s\\S]*?<\\/article>`));
        if (!articleMatch) {
          errors.push(`${page.label} trial article markup is missing`);
        } else {
          const card = articleMatch[0];
          const lang = page.lang;
          const other = lang === 'en' ? 'pl' : 'en';
          const ownTexts = [offer.headline[lang], offer.title[lang], offer.offerText[lang], offer.promotionalPeriod[lang], offer.ctaText[lang], offer.smallPrint[lang], ...offer.trialFeatures[lang]];
          for (const value of ownTexts) {
            if (!card.includes(value)) errors.push(`${page.label} trial missing ${lang} content: ${value}`);
          }
          const foreignTexts = [offer.headline[other], offer.title[other], offer.offerText[other], offer.promotionalPeriod[other], offer.ctaText[other], offer.smallPrint[other], ...offer.trialFeatures[other]];
          for (const value of foreignTexts) {
            if (value !== offer.headline[lang] && card.includes(value)) {
              errors.push(`${page.label} trial contains ${other} content: ${value}`);
            }
          }
          // Astro adds scoped attributes to HTML tags; check the price within its own paragraph.
          const priceParagraph = card.match(/<p\b(?=[^>]*\bclass="[^"]*\btrial-price\b[^"]*")[^>]*>([\s\S]*?)<\/p>/);
          const priceIsZero = priceParagraph && /<strong\b[^>]*>\s*£0\s*<\/strong>/.test(priceParagraph[1]);
          if (!priceIsZero) errors.push(`${page.label} trial £0 price markup is missing`);
          // Count complete li elements only inside the dedicated feature list.
          const featuresList = card.match(/<ul\b(?=[^>]*\bclass="[^"]*\btrial-features\b[^"]*")[^>]*>([\s\S]*?)<\/ul>/);
          const featureItems = featuresList ? [...featuresList[1].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)] : [];
          if (featureItems.length !== 5) errors.push(`${page.label} trial must render exactly five feature list items`);
          if (featuresList) {
            for (const feature of offer.trialFeatures[lang]) {
              if (featureItems.filter(item => item[1].trim() === feature).length !== 1) {
                errors.push(`${page.label} trial feature must appear exactly once: ${feature}`);
              }
            }
          }
          const ctaMatch = card.match(/<a\b[^>]*data-free-trial-checkout="(en|pl)"[^>]*>/);
          if (!ctaMatch || ctaMatch[1] !== lang || !ctaMatch[0].includes(`href="${trialDestinations[lang]}"`)) {
            errors.push(`${page.label} trial CTA language or checkout URL is incorrect`);
          }
          if (card.includes(trialDestinations[other])) errors.push(`${page.label} trial includes foreign checkout URL`);
          if (!/data-start-date=""[^>]*data-end-date=""[^>]*data-auto-disable="false"/.test(card)) {
            errors.push(`${page.label} trial must not have an expiry date`);
          }
        }
      }
    }

    if (offer.id.startsWith('winter-kickstart-2026-') && expected) {
      if (!html.includes('winter-campaign') || !html.includes('WINTER KICKSTART')) errors.push(`${page.label} missing Winter campaign panel`);
      if (!html.includes(`data-winter-variant="${offer.service === 'hybrid' ? 'hybrid' : 'pt'}"`)) errors.push(`${page.label} wrong Winter variant`);
      if (page.placement==='homepage' && (html.includes('data-promotion-card data-promotion-id="winter-kickstart-2026-hybrid"'))) errors.push(`${page.label} Hybrid must not create a second homepage panel`);
    }
    if (expected && !rendered) errors.push(`${page.label} is missing promotion ${offer.id}`);
    if (!expected && rendered) errors.push(`${page.label} renders promotion ${offer.id} in the wrong placement`);

    if (expected) {
      const expectedText = [offer.headline[page.lang], offer.ctaText[page.lang], offer.smallPrint[page.lang]];
      if (offer.id === trialId) {
        // The trial has its own presentation and is exhaustively checked above.
      } else if (offer.showPrice) expectedText.push(offer.promotionalPeriod[page.lang], offer.standardPriceText[page.lang]);
      else expectedText.push(offer.title[page.lang], offer.offerText[page.lang]);

      for (const text of expectedText) {
        if (!html.includes(text)) errors.push(`${page.label} promotion ${offer.id} is missing text: ${text}`);
      }
      if (offer.showPrice && offer.id !== trialId && !html.includes(`£${offer.promotionalPrice}`)) errors.push(`${page.label} promotion ${offer.id} is missing the promotional price`);
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
