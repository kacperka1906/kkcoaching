// Netlify invokes this scheduled function only on the published production deploy.
// Activation and its secret build hook require a separate approved release.
const promotions = require('../../src/data/promotions.json');
const stateUrl = 'https://kkcoaching.fit/promotion-state.json';

exports.createHandler = ({ env = process.env, fetcher = fetch, now = () => new Date() } = {}) => async () => {
  if (env.PROMOTION_REFRESH_ENABLED !== 'true') return { statusCode: 200, body: 'Refresh disabled' };
  const hook = env.PROMOTION_BUILD_HOOK_URL;
  if (!hook || !/^https:\/\/api\.netlify\.com\/build_hooks\/[a-zA-Z0-9_-]+$/.test(hook)) {
    throw new Error('Configure a Netlify PROMOTION_BUILD_HOOK_URL before enabling refresh');
  }
  const { activeOfferIds } = await import('../../src/lib/promotions.mjs');
  const response = await fetcher(stateUrl, { headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error('Cannot read published promotion state; no build requested');
  const state = await response.json();
  if (state.version !== 1 || !Array.isArray(state.activeOfferIds)
      || state.activeOfferIds.some(id => typeof id !== 'string')) {
    throw new Error('Invalid published promotion state; no build requested');
  }
  const expected = activeOfferIds(promotions.offers, now());
  if (JSON.stringify([...state.activeOfferIds].sort()) === JSON.stringify(expected)) {
    return { statusCode: 200, body: 'Promotion state is current' };
  }
  try {
    const build = await fetcher(hook, { method: 'POST', signal: AbortSignal.timeout(10_000) });
    if (!build.ok) throw new Error('Hook rejected');
  } catch {
    // Do not leak the secret hook URL via a network library's error message.
    throw new Error('Promotion rebuild request failed; next scheduled run will retry');
  }
  return { statusCode: 200, body: 'Requested promotion rebuild' };
};

exports.handler = exports.createHandler();
