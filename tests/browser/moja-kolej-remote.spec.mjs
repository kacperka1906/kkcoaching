import { test, expect } from '@playwright/test';
const origin = process.env.MK_PREVIEW_URL;
test.skip(!origin, 'Needs a confirmed Netlify PR preview URL');

test('actual Netlify preview HTML, metadata, sitemap and no internal promotion', async ({ page, request }) => {
  const route = '/pl/moja-kolej-2027/';
  const response = await request.get(origin + route);
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toMatch(/<html lang="pl">/);
  expect(html).toMatch(/<meta name="robots" content="noindex, follow"/);
  expect(html).toMatch(/<link rel="canonical" href="https:\/\/kkcoaching\.fit\/pl\/moja-kolej-2027\/"/);
  expect(html).not.toMatch(/hreflang=/);
  expect(html).toContain('Zapisy jeszcze nie ruszyły');
  expect(html).toContain('<fieldset disabled');
  const xmlIndex = await request.get(origin + '/sitemap-index.xml');
  expect(xmlIndex.status()).toBe(200);
  const names = [...(await xmlIndex.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(x => new URL(x[1]).pathname);
  for (const name of names) {
    const res = await request.get(origin + name);
    expect(res.status()).toBe(200);
    expect(await res.text()).not.toContain('moja-kolej-2027');
  }
  const configResponse = await request.get(origin + '/admin/config.yml');
  expect(configResponse.status()).toBe(200);
  const adminConfig = JSON.parse(await configResponse.text());
  expect(adminConfig.backend.branch).toBe('feature/moja-kolej-2027-preview');
  expect(adminConfig.collections.map(x => x.name)).toEqual(['moja_kolej_2027']);
  for (const path of ['/', '/pl/', '/services/', '/pl/services/']) {
    const res = await request.get(origin + path);
    expect(res.status()).toBe(200);
    expect(await res.text()).not.toContain('moja-kolej-2027');
  }
});

for (const width of [390, 1440]) {
  test('published Netlify preview screenshot '+width+'px', async ({page}) => {
    await page.setViewportSize({width,height:900});
    await page.goto(origin + '/pl/moja-kolej-2027/');
    // We test the same privacy path as a visitor rejecting optional cookies.
    const decline = page.getByRole('button',{name:'Odrzuć opcjonalne'});
    // Netlify adds a preview-only drawer that can cover the cookie controls on mobile.
    // Prepare screenshots without that instrumentation; the actual site remains untouched.
    await page.evaluate(() => document.querySelectorAll('iframe[title="Netlify Drawer"]').forEach(frame => frame.closest('[data-netlify-deploy-id]')?.remove()));
    if (await decline.isVisible()) await decline.evaluate(button => button.click());
    await expect(page.locator('h1')).toContainText('KOLEJ');
    await expect(page.locator('.apply-form-preview button')).toBeDisabled();
    const image = page.locator('.site-header img.site-logo');
    await expect(image).toBeVisible();
    expect(await image.evaluate(el=>el.complete && el.naturalWidth>0)).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth)).toBe(false);
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:'test-results/moja-kolej-netlify-'+width+'.png',fullPage:true,animations:'disabled'});
  });
}
