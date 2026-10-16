import fs from 'node:fs';
import { activeOfferIds, londonDateKey } from '../src/lib/promotions.mjs';

const promotions = JSON.parse(fs.readFileSync(new URL('../src/data/promotions.json', import.meta.url), 'utf8'));
const now = new Date();
fs.writeFileSync(new URL('../dist/promotion-state.json', import.meta.url), JSON.stringify({
  version: 1,
  builtAt: now.toISOString(),
  londonDate: londonDateKey(now),
  activeOfferIds: activeOfferIds(promotions.offers, now)
}) + '\n');
