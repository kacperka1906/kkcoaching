import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { isOfferActive } from '../../src/lib/promotions.mjs';

const state = JSON.parse(fs.readFileSync(new URL('../../dist/promotion-state.json', import.meta.url), 'utf8'));
const offers = JSON.parse(fs.readFileSync(new URL('../../src/data/promotions.json', import.meta.url), 'utf8')).offers;
const octoberOffer = offers.find(o => o.id === 'october-2026-20-off-everything');
const builtActive = isOfferActive(octoberOffer, new Date(state.builtAt));
const routes = ['', 'pl/', 'services/', 'pl/services/', 'personal-training-cwmbran/', 'pl/personal-training-cwmbran/',
  'online-coaching/', 'pl/online-coaching/', 'hybrid-coaching/', 'pl/hybrid-coaching/', 'training-plan/', 'pl/training-plan/'];
const dates = [...new Set([state.builtAt, '2026-11-01T00:00:00Z'].map(value => new Date(value).toISOString()))];

// Never send analytics, mail or checkout requests from regression tests.
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:4322/')
    ? route.continue() : route.abort());
});

for (const instant of dates) for (const width of [390, 1440]) for (const route of routes) {
  test(`${instant} ${width}px /${route}`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.clock.setFixedTime(new Date(instant));
    await page.goto(`/${route}`);
    await expect(page.locator('h1')).toHaveCount(1);
    const active = builtActive && isOfferActive(octoberOffer, new Date(instant));
    for (const element of await page.locator('[data-october-only]').all()) {
      if (active) await expect(element).toBeVisible();
      else await expect(element).toBeHidden();
    }
    for (const element of await page.locator('[data-standard-only]').all()) {
      if (active) await expect(element).toBeHidden();
      else await expect(element).toBeVisible();
    }
    const homepage = route === '' || route === 'pl/';
    const pt = route.includes('personal-training-cwmbran');
    const trial = page.locator('[data-promotion-id="free-7-day-kk-coaching-trial"]');
    const taster = page.locator('[data-promotion-id="october-2026-free-pt-taster"]');
    await expect(trial).toHaveCount(homepage ? 1 : 0);
    await expect(taster).toHaveCount(homepage || pt ? 1 : 0);
    if (homepage) {
      await expect(trial).toBeVisible();
      const lang = route.startsWith('pl/') ? 'pl' : 'en';
      await expect(trial.locator('a')).toHaveAttribute('href', `https://kkcoaching.mypthub.net/p/${lang === 'pl' ? '240387' : '240389'}`);
      const ids = await page.locator('[data-promotion-card]').evaluateAll(cards => cards.filter(c => !c.hidden).map(c => c.dataset.promotionId));
      expect(ids).toEqual(['free-7-day-kk-coaching-trial', 'october-2026-free-pt-taster', ...(active ? [octoberOffer.id] : [])]);
    }
    if (homepage || pt) {
      await expect(taster).toBeVisible();
      await expect(taster.locator('a')).toHaveAttribute('href', `${route.startsWith('pl/') ? '/pl' : ''}/contact/?interest=taster`);
    }
    if (route.includes('training-plan')) {
      const price = await page.locator('script[type="application/ld+json"]').evaluateAll(scripts => scripts
        .flatMap(script => { const json = JSON.parse(script.textContent); return json['@graph'] ?? [json]; })
        .find(node => node['@type'] === 'Service' && node.offers)?.offers.price);
      expect(price).toBe(active ? 24 : 30);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    expect(errors).toEqual([]);
  });
}

for (const route of ['', 'pl/', 'training-plan/', 'pl/training-plan/']) {
  test(`initial HTML with JavaScript disabled /${route}`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.route('**/*', r => r.request().url().startsWith('http://127.0.0.1:4322/') ? r.continue() : r.abort());
    await page.goto(`http://127.0.0.1:4322/${route}`);
    if (builtActive) for (const element of await page.locator('[data-october-only]').all()) await expect(element).toBeVisible();
    else await expect(page.locator('[data-october-only]')).toHaveCount(0);
    if (!route.includes('training-plan')) {
      await expect(page.locator('[data-promotion-id="free-7-day-kk-coaching-trial"]')).toBeVisible();
      await expect(page.locator('[data-promotion-id="october-2026-free-pt-taster"]')).toBeVisible();
    }
    await context.close();
  });
}

// Only an October artifact contains an offer that can expire while the tab is open.
if (builtActive) test('an open plan page expires at London midnight and updates its schema', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-31T23:59:50Z') });
  await page.goto('/training-plan/');
  await expect(page.locator('[data-october-only]')).toBeVisible();
  await page.clock.fastForward(70_000);
  await expect(page.locator('[data-october-only]')).toBeHidden();
  await expect(page.locator('[data-standard-only]')).toBeVisible();
  const price = await page.locator('script[type="application/ld+json"]').evaluateAll(scripts => scripts
    .flatMap(script => { const json = JSON.parse(script.textContent); return json['@graph'] ?? [json]; })
    .find(node => node['@type'] === 'Service' && node.offers).offers.price);
  expect(price).toBe(30);
});


for (const [route, alternate, intent] of [
  ['/contact/?interest=taster', '/pl/contact/?interest=taster', 'taster'],
  ['/pl/contact/?interest=training-plan', '/contact/?interest=training-plan', 'training-plan'],
  ['/contact/?interest=invalid', '/pl/contact/', 'invalid']
]) {
  test('contact intent survives language switching safely: ' + route, async ({ page }) => {
    await page.goto(route);
    const languageLink = page.locator('.lang-switch');
    await expect(languageLink).toHaveAttribute('href', alternate);
    if (intent !== 'invalid') await expect(page.locator('#interest')).toHaveValue(intent);
    await languageLink.click();
    await expect(page).toHaveURL('http://127.0.0.1:4322' + alternate);
    await expect(page.locator('#interest')).toHaveValue(intent === 'invalid' ? '' : intent);
  });
}
for (const route of ['/', '/pl/']) {') + '
  test('mobile menu keyboard entry and Escape return focus: ' + route, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 850 });
    await page.goto(route);
    const button = page.locator('#navToggle');
    const nav = page.locator('#mainNav');
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(nav.locator('a').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(button).toBeFocused();
    await button.click();
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(await page.evaluate(() => document.body.classList.contains('menu-open'))).toBe(false);
  });

  test('footer semantic heading hierarchy: ' + route, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('footer h2')).toHaveCount(3);
    await expect(page.locator('footer h4')).toHaveCount(0);
    await expect(page.locator('footer h2').first()).toBeVisible();
  });
}
));
    await expect(page.locator('#interest')).toHaveValue(intent === 'invalid' ? '' : intent);
  });
}

for (const route of ['/', '/pl/']) {
  test('mobile menu keyboard entry and Escape return focus: ' + route, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 850 });
    await page.goto(route);
    const button = page.locator('#navToggle');
    const nav = page.locator('#mainNav');
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(nav.locator('a').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(button).toBeFocused();
    await button.click();
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(await page.evaluate(() => document.body.classList.contains('menu-open'))).toBe(false);
  });

  test('footer semantic heading hierarchy: ' + route, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator('footer h2')).toHaveCount(3);
    await expect(page.locator('footer h4')).toHaveCount(0);
    await expect(page.locator('footer h2').first()).toBeVisible();
  });
}
