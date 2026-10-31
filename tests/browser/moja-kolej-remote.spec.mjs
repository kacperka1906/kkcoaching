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
  expect(html).toContain('Zapisy już ruszyły');
  expect(html).toContain('id="moja-kolej-form"');
  expect(html).toContain('name="campaign" value="moja-kolej-2027"');
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
  expect(adminConfig.backend.branch).toBe(process.env.MK_EXPECTED_ADMIN_BRANCH || 'feature/moja-kolej-2027-preview');
  expect(adminConfig.collections.map(x => x.name)).toEqual(['moja_kolej_2027']);
  const image = await request.get(origin + '/images/moja-kolej-hero.webp');
  expect(image.status(), 'Artwork URL must resolve on Netlify').toBe(200);
  expect(image.headers()['content-type'], 'Artwork must be a real image, not a 404 HTML fallback').toMatch(/image\/(webp|octet-stream)/);
  expect((await image.body()).length).toBeGreaterThan(10000);
  for (const path of ['/', '/pl/', '/services/', '/pl/services/']) {
    const res = await request.get(origin + path);
    expect(res.status()).toBe(200);
    const body=await res.text();
    if (path.startsWith('/pl/')) expect(body).toContain('href="/pl/moja-kolej-2027/"');
    else expect(body).not.toContain('/moja-kolej-2027');
    if (path==='/pl/') expect(body).toContain('campaign-spotlight');
    if (path==='/') expect(body).not.toContain('campaign-spotlight');
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
    await expect(page.locator('#mk-submit')).toBeEnabled();
    const campaignImage = page.locator('.mk-hero .hero-photo img');
    await expect(campaignImage).toBeVisible();
    expect(await campaignImage.evaluate(el=>el.complete && el.naturalWidth>0), 'Campaign hero image must render').toBe(true);
    const image = page.locator('.site-header img.site-logo');
    await expect(image).toBeVisible();
    expect(await image.evaluate(el=>el.complete && el.naturalWidth>0)).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth)).toBe(false);
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:'test-results/moja-kolej-netlify-'+width+'.png',fullPage:true,animations:'disabled'});
  });
}


test('Polish homepage and header advertise campaign; English site is untouched', async ({ page }) => {
  await page.goto(origin + '/pl/');
  await expect(page.locator('.campaign-spotlight')).toBeVisible();
  await expect(page.locator('.site-header .nav-program-cta')).toHaveCount(1);
  await expect(page.locator('.campaign-spotlight-link')).toHaveAttribute('href','/pl/moja-kolej-2027/');
  await page.goto(origin + '/');
  await expect(page.locator('.campaign-spotlight')).toHaveCount(0);
  await expect(page.locator('.site-header .nav-program-cta')).toHaveCount(0);
});

for (const width of [390, 768, 1024, 1280, 1440]) {
  test('Polish campaign navigation fits '+width+'px without overlap', async ({ page }) => {
    await page.setViewportSize({width,height:900});
    await page.goto(origin+'/pl/');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth), 'Page must not scroll sideways at '+width).toBe(false);
    const menuButton=page.locator('#navToggle');
    const campaign=page.locator('.nav-program-cta a');
    if (width<=1240) {
      await expect(menuButton).toBeVisible();
      await menuButton.click();
      await expect(campaign).toBeVisible();
      await expect(campaign).toContainText('MOJA KOLEJ 2027');
      await menuButton.click();
    } else {
      await expect(menuButton).toBeHidden();
      await expect(campaign).toBeVisible();
      const overlap=await page.evaluate(()=>{
        const left=document.querySelector('.nav-program-cta a')?.getBoundingClientRect();
        const right=document.querySelector('.header-right')?.getBoundingClientRect();
        return !left || !right || left.right > right.left - 2;
      });
      expect(overlap,'Campaign link must not overlap language switch / CTA').toBe(false);
    }
    if (width===390 || width===1440) {
      await page.screenshot({path:'test-results/polish-homepage-programme-'+width+'.png',fullPage:false,animations:'disabled'});
    }
  });
}
