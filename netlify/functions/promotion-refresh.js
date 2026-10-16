// Netlify invokes this scheduled function only on the published production deploy.
// Activation and its secret build hook require a separate approved release.
const promotions = require('../../src/data/promotions.json');
const stateUrl = 'https://kkcoaching.fit/promotion-state.json';
const londonHour = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London', hour: '2-digit', hourCycle: 'h23'
});
// Retry soon after the first changed offer date, then at most one scheduled
// rebuild request per London day while the published manifest remains stale.
// A time gate cannot prevent manually duplicated invocations; keep the hook private.
const firstDayRetryHours = new Set([0, 1, 3, 6, 12]);

function nextCalendarDate(dateKey) {
  const date = new Date(dateKey + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function validCalendarDateKey(key) {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const date = new Date(key + 'T00:00:00Z');
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === key;
}

function sameIds(a, b) {
  return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
}

// The manifest may have been built weeks before an offer ends. Calculate the
// actual first mismatch day rather than using its old builtAt timestamp.
function firstMismatchDate(offers, publishedIds, publishedDay, today, activeOfferIds) {
  const dates = new Set([publishedDay, today]);
  for (const offer of offers) {
    if (offer.startDate && offer.startDate >= publishedDay && offer.startDate <= today) {
      dates.add(offer.startDate);
    }
    if (offer.autoDisableAfterEndDate && validCalendarDateKey(offer.endDate)) {
      const dayAfterEnd = nextCalendarDate(offer.endDate);
      if (dayAfterEnd >= publishedDay && dayAfterEnd <= today) dates.add(dayAfterEnd);
    }
  }
  for (const day of [...dates].sort()) {
    // Midday UTC safely belongs to the named Europe/London date, including DST.
    const expected = activeOfferIds(offers, new Date(day + 'T12:00:00Z'));
    if (!sameIds(expected, publishedIds)) return day;
  }
  return today;
}

exports.createHandler = ({ env = process.env, fetcher = fetch, now = () => new Date() } = {}) => async () => {
  if (env.PROMOTION_REFRESH_ENABLED !== 'true') return { statusCode: 200, body: 'Refresh disabled' };
  const hook = env.PROMOTION_BUILD_HOOK_URL;
  if (!hook || !/^https:\/\/api\.netlify\.com\/build_hooks\/[a-zA-Z0-9_-]+$/.test(hook)) {
    throw new Error('Configure a Netlify PROMOTION_BUILD_HOOK_URL before enabling refresh');
  }
  const { activeOfferIds, londonDateKey } = await import('../../src/lib/promotions.mjs');
  const current = now();
  const today = londonDateKey(current);
  const response = await fetcher(stateUrl, {
    headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(10_000)
  });
  if (!response.ok) throw new Error('Cannot read published promotion state; no build requested');
  const state = await response.json();
  if (state?.version !== 1 || !Array.isArray(state.activeOfferIds)
      || state.activeOfferIds.some(id => typeof id !== 'string')
      || !validCalendarDateKey(state.londonDate) || state.londonDate > today) {
    throw new Error('Invalid published promotion state; no build requested');
  }

  const expected = activeOfferIds(promotions.offers, current);
  if (sameIds(state.activeOfferIds, expected)) {
    return { statusCode: 200, body: 'Promotion state is current' };
  }

  const changeDate = firstMismatchDate(
    promotions.offers, state.activeOfferIds, state.londonDate, today, activeOfferIds
  );
  const hour = Number(londonHour.format(current));
  if (changeDate === today ? !firstDayRetryHours.has(hour) : hour !== 0) {
    return { statusCode: 200, body: 'Stale promotion state; rebuild deferred to next retry window' };
  }

  try {
    const build = await fetcher(hook, { method: 'POST', signal: AbortSignal.timeout(10_000) });
    if (!build.ok) throw new Error('Hook rejected');
  } catch {
    // Do not leak the secret hook URL via a network library's error message.
    throw new Error('Promotion rebuild request failed; next scheduled retry window will retry');
  }
  return { statusCode: 200, body: 'Requested promotion rebuild' };
};

exports.handler = exports.createHandler();
