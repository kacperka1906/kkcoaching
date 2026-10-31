import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const route = '/pl/moja-kolej-2027/';
const preview = 'http://127.0.0.1:4322' + route;
test.beforeEach(async ({page}) => {
 await page.route('**/*', req => req.request().url().startsWith('http://127.0.0.1:4322/')
  ? req.continue() : req.abort());
});

for(const width of [360,390,768,1024,1440]){
 test('campaign visual and safety ' + width + 'px',async ({page})=>{
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setViewportSize({width,height:900});
   const response=await page.goto(route,{waitUntil:'networkidle'});
   expect(response?.status()).toBe(200);
   await expect(page.locator('h1')).toHaveCount(1);
   await expect(page.locator('h1')).toBeVisible();
   await expect(page.locator('.mk-preview')).toContainText('Zapisy jeszcze nie ruszyły');
   await expect(page.locator('.mk-stage')).toHaveCount(4);
   await expect(page.locator('.mk-feature')).toHaveCount(6);
   await expect(page.locator('.mk-week')).toHaveCount(16);
   await expect(page.locator('.mk-faq-items details')).toHaveCount(15);
   await expect(page.locator('.mk-form-card fieldset')).toBeDisabled();
   await expect(page.locator('.mk-form-card button')).toBeDisabled();
   await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex, follow');
   await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',preview.replace('127.0.0.1:4322','kkcoaching.fit').replace('http:','https:'));
   expect(await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth+1)).toBe(false);
   expect(errors).toEqual([]);
   await page.locator('.mk-faq-items summary').first().click();
   await expect(page.locator('.mk-faq-items details').first()).toHaveAttribute('open','');
   fs.mkdirSync('test-results/moja-kolej-2027',{recursive:true});
   await page.screenshot({path:path.join('test-results/moja-kolej-2027', 'preview-'+width+'.png'),fullPage:true,animations:'disabled'});
 });
}
test('can read preview and complete first CTA with JS disabled',async ({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
 const page=await context.newPage();
 await page.goto(preview,{waitUntil:'domcontentloaded'});
 await expect(page.locator('.mk-button-red')).toHaveAttribute('href','#poznaj-program');
 await expect(page.locator('h1')).toBeVisible();
 await expect(page.locator('.mk-form-card button')).toBeDisabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth+1)).toBe(false);
 await context.close();
});
test('keyboard focus and slowed image delivery keep campaign usable',async ({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.route('**/images/*',async r=>{ await new Promise(ok=>setTimeout(ok,200)); await r.continue(); });
 await page.goto(route,{waitUntil:'domcontentloaded'});
 await expect(page.locator('.mk-button-red')).toBeVisible();
 await page.locator('.mk-button-red').focus();
 await expect(page.locator('.mk-button-red')).toBeFocused();
 await page.keyboard.press('Enter');
 await expect(page).toHaveURL(/#poznaj-program$/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth+1)).toBe(false);
});
