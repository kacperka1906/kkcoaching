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
    await expect(page.locator('.apply-status')).toContainText('Zapisy już ruszyły');
    await expect(page.locator('#mk-submit')).toBeEnabled();
    await expect(page.locator('#mk-consent')).not.toBeChecked();
    await expect(page.locator('.faq-list details')).toHaveCount(15);
    await expect(page.locator('.day-card.day-live .day-name')).toHaveText('Niedz.');
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
  await expect(page.locator('#mk-submit')).toBeDisabled();
  await expect(page.locator('.feature-card')).toHaveCount(6);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await context.close();
});


test('successful application reaches isolated endpoint once; failure stays retryable', async ({page}) => {
  const sends = [];
  await page.route('**/.netlify/functions/moja-kolej-2027', async route => {
    sends.push(JSON.parse(route.request().postData()));
    await route.fulfill({status:sends.length===1?502:200,contentType:'application/json',body:JSON.stringify({ok:sends.length!==1})});
  });
  await page.goto('/pl/moja-kolej-2027/');
  await page.locator('#mk-name').fill('Próbny Uczestnik');
  await page.locator('#mk-email').fill('test@example.invalid');
  await page.locator('#mk-goal').selectOption('regularnosc');
  await page.locator('#mk-why').fill('Chcę regularnie dbać o zdrowie i kondycję.');
  await page.locator('#mk-consent').check();
  await page.locator('#mk-submit').click();
  await expect(page.locator('#mk-form-status')).toContainText('Nie udało się wysłać');
  await expect(page.locator('#mk-submit')).toBeEnabled();
  await page.locator('#mk-submit').click();
  await expect(page.locator('#mk-form-status')).toContainText('Twoje zgłoszenie zostało wysłane');
  await expect(page.locator('#mk-submit')).toBeDisabled();
  expect(sends).toHaveLength(2);
  expect(sends[1].campaign).toBe('moja-kolej-2027');
  expect(sends[1].consent).toBe(true);
  expect(sends[1].why).toContain('regularnie');
});
