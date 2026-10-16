import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { londonDateKey, isOfferActive, activeOfferIds } from '../src/lib/promotions.mjs';
import refresh from '../netlify/functions/promotion-refresh.js';

const offers = JSON.parse(fs.readFileSync(new URL('../src/data/promotions.json', import.meta.url), 'utf8')).offers;
const octoberId = 'october-2026-20-off-everything';
const permanent = ['free-7-day-kk-coaching-trial', 'october-2026-free-pt-taster'].sort();
const october = offers.find(o => o.id === octoberId);
for (const [instant, date, active] of [
  ['2026-09-30T22:59:59Z', '2026-09-30', false],
  ['2026-09-30T23:00:00Z', '2026-10-01', true],
  ['2026-10-25T00:30:00Z', '2026-10-25', true],
  ['2026-10-25T01:30:00Z', '2026-10-25', true],
  ['2026-10-31T23:59:59Z', '2026-10-31', true],
  ['2026-11-01T00:00:00Z', '2026-11-01', false]
]) test(`London boundary ${instant}`, () => {
  assert.equal(londonDateKey(new Date(instant)), date);
  assert.equal(isOfferActive(october, new Date(instant)), active);
  assert.deepEqual(activeOfferIds(offers, new Date(instant)), [...permanent, ...(active ? [octoberId] : [])].sort());
});

const env = { PROMOTION_REFRESH_ENABLED: 'true', PROMOTION_BUILD_HOOK_URL: 'https://api.netlify.com/build_hooks/test-hook' };
function fixture({ date = '2026-11-01T00:05:00Z', ids = [...permanent, octoberId], hookOK = true, stateOK = true } = {}) {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    return url.endsWith('promotion-state.json')
      ? { ok: stateOK, json: async () => ({ version: 1, activeOfferIds: ids }) }
      : { ok: hookOK };
  };
  return { calls, handler: refresh.createHandler({ env, fetcher, now: () => new Date(date) }) };
}
test('scheduler requests one build when published HTML is stale', async () => {
  const { calls, handler } = fixture();
  assert.match((await handler()).body, /Requested/);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.method, 'POST');
});
for (const config of [
  { date: '2026-10-31T23:59:59Z' },
  { ids: permanent },
  { date: '2027-07-01T12:00:00Z', ids: permanent }
]) test(`scheduler skips matching state ${JSON.stringify(config)}`, async () => {
  const { calls, handler } = fixture(config);
  assert.match((await handler()).body, /current/);
  assert.equal(calls.length, 1);
});
test('failed hook is reported so a later schedule can retry stale state', async () => {
  await assert.rejects(fixture({ hookOK: false }).handler(), /next scheduled run will retry/);
});
test('missing/failed manifest does not request a build', async () => {
  const { calls, handler } = fixture({ stateOK: false });
  await assert.rejects(handler(), /no build requested/);
  assert.equal(calls.length, 1);
});
test('refresh is disabled until separately configured', async () => {
  const handler = refresh.createHandler({ env: {}, fetcher: () => { throw new Error('must not fetch'); } });
  assert.match((await handler()).body, /disabled/);
});
test('enabled refresh requires the correct secure hook destination', async () => {
  for (const url of ['', 'http://api.netlify.com/build_hooks/test', 'https://other.example/build_hooks/test']) {
    await assert.rejects(refresh.createHandler({ env: { ...env, PROMOTION_BUILD_HOOK_URL: url } })(), /Configure a Netlify/);
  }
});

test('hook network failures do not expose the secret URL', async () => {
  let calls = 0;
  const handler = refresh.createHandler({ env, now: () => new Date('2026-11-01T00:05:00Z'), fetcher: async () => {
    if (++calls === 1) return { ok: true, json: async () => ({ version: 1, activeOfferIds: [...permanent, octoberId] }) };
    throw new Error(`Failed request to ${env.PROMOTION_BUILD_HOOK_URL}`);
  } });
  await assert.rejects(handler(), error => /next scheduled run/.test(error.message) && !error.message.includes('test-hook'));
});
