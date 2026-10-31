import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const root = 'http://127.0.0.1:4322';
test.beforeEach(async ({page}) => {
  // Browser tests must not communicate with payment, analytics, or form providers.
  await page.route('**/*', route => route.request().url().startsWith(root + '/')
    ? route.continue() : route.abort());
});

for (const width of [360, 390, 768, 1024, 1440]) {
  test('mobile-first premium page at ' + width + 'px', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({width, height:900});
    const response = await page.goto('/pl/moja-kolej-2027/');
    expect(response.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang','pl');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText('MOJA');
    await expect(page.locator('h1')).toContainText('KOLEJ');
    await expect(page.locator('.preview-tag')).toBeVisible();
    await expect(page.locator('.apply-form-preview fieldset')).toHaveAttribute('disabled', '');
    await expect(page.locator('.apply-form-preview input').first()).toBeDisabled();
    await expect(page.locator('.apply-form-preview button')).toBeDisabled();
    await expect(page.locator('.faq-list details')).toHaveCount(15);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    expect(errors).toEqual([]);
    await page.locator('.faq-list details').first().locator('summary').click();
    await expect(page.locator('.faq-list details').first()).toHaveAttribute('open','');
    await page.locator('a[href="#poznaj-program"]').first().click();
    await expect(page).toHaveURL(/#poznaj-program$/);
    if (width === 390 || width === 1440) {
      await page.screenshot({path:'test-results/moja-kolej-'+width+'.png', fullPage:true, animations:'disabled'});
    }
  });
}

test('supports keyboard navigation and reduced motion', async ({ page }) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/pl/moja-kolej-2027/');
  await page.locator('.faq-list details summary').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.faq-list details').first()).toHaveAttribute('open', '');
  await expect(page.locator('.mk-button').first()).toHaveCSS('transition-duration','0s');
});

test('renders meaningfully with JavaScript disabled', async ({ browser }) => {
  const context = await browser.newContext({javaScriptEnabled:false, viewport:{width:390,height:850}});
  const page = await context.newPage();
  await page.route('**/*', route => route.request().url().startsWith(root + '/')
    ? route.continue() : route.abort());
  await page.goto(root + '/pl/moja-kolej-2027/');
  await expect(page.locator('main h1')).toHaveCount(1);
  await expect(page.locator('.apply-form-preview button')).toBeDisabled();
  await expect(page.locator('.feature-card')).toHaveCount(6);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await context.close();
});
