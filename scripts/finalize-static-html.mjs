import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = join(root, 'dist');
const servicePages = JSON.parse(await readFile(join(root, 'src/data/service-pages.json'), 'utf8'));

const targets = [
  { route: 'personal-training-cwmbran', lang: 'en', key: 'personal', heroClass: 'local-hero' },
  { route: 'online-coaching', lang: 'en', key: 'online', heroClass: 'online-hero' },
  { route: 'hybrid-coaching', lang: 'en', key: 'hybrid', heroClass: 'hybrid-hero' },
  { route: 'pl/personal-training-cwmbran', lang: 'pl', key: 'personal', heroClass: 'local-hero' },
  { route: 'pl/online-coaching', lang: 'pl', key: 'online', heroClass: 'online-hero' },
  { route: 'pl/hybrid-coaching', lang: 'pl', key: 'hybrid', heroClass: 'hybrid-hero' }
];

const locationRoutes = ['', 'pl', 'services', 'pl/services', 'hybrid-coaching', 'pl/hybrid-coaching'];
const reviewRoutes = ['', 'pl'];
const relatedRoutes = ['personal-training-cwmbran', 'online-coaching', 'hybrid-coaching', 'training-plan', 'pl/personal-training-cwmbran', 'pl/online-coaching', 'pl/hybrid-coaching', 'pl/training-plan'];

function escapeAttr(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function setAttr(tag, name, value) {
  const escaped = escapeAttr(value);
  const pattern = new RegExp(`\\s${name}=(?:"[^"]*"|'[^']*')`, 'i');
  if (pattern.test(tag)) return tag.replace(pattern, ` ${name}="${escaped}"`);
  return tag.replace(/\s*\/>$|>$/, match => ` ${name}="${escaped}"${match}`);
}

function sectionBounds(html, className) {
  const start = html.indexOf(`<section class="${className}`);
  if (start < 0) throw new Error(`Missing .${className} section`);
  const close = html.indexOf('</section>', start);
  if (close < 0) throw new Error(`Unclosed .${className} section`);
  return { start, end: close + '</section>'.length };
}

function replaceHeroImage(html, className, image, alt) {
  const bounds = sectionBounds(html, className);
  const section = html.slice(bounds.start, bounds.end);
  const mediaAt = section.indexOf('class="hero-media"');
  if (mediaAt < 0) throw new Error(`Missing hero-media inside .${className}`);
  const imgStart = section.indexOf('<img', mediaAt);
  const imgEnd = section.indexOf('>', imgStart);
  if (imgStart < 0 || imgEnd < 0) throw new Error(`Missing hero image inside .${className}`);

  const originalTag = section.slice(imgStart, imgEnd + 1);
  let tag = originalTag;
  tag = setAttr(tag, 'src', image);
  tag = setAttr(tag, 'alt', alt);
  tag = setAttr(tag, 'loading', 'eager');
  tag = setAttr(tag, 'fetchpriority', 'high');
  tag = setAttr(tag, 'decoding', 'async');

  const updatedSection = section.slice(0, imgStart) + tag + section.slice(imgEnd + 1);
  return html.slice(0, bounds.start) + updatedSection + html.slice(bounds.end);
}

function movePricingAfterHero(html, className) {
  const pricingStart = html.indexOf('<section class="service-pricing"');
  if (pricingStart < 0) throw new Error('Missing service-pricing section');
  const pricingClose = html.indexOf('</section>', pricingStart);
  if (pricingClose < 0) throw new Error('Unclosed service-pricing section');
  const pricingEnd = pricingClose + '</section>'.length;
  const pricing = html.slice(pricingStart, pricingEnd);
  const withoutPricing = html.slice(0, pricingStart) + html.slice(pricingEnd);

  const hero = sectionBounds(withoutPricing, className);
  let insertAt = hero.end;
  if (className === 'online-hero') {
    const promotionStart = withoutPricing.indexOf('<section class="online-promotion', hero.end);
    if (promotionStart >= 0) {
      const promotionClose = withoutPricing.indexOf('</section>', promotionStart);
      if (promotionClose < 0) throw new Error('Unclosed online-promotion section');
      insertAt = promotionClose + '</section>'.length;
    }
  }
  return withoutPricing.slice(0, insertAt) + pricing + withoutPricing.slice(insertAt);
}

function moveBlockBeforeFinalCta(html, className, tagName = 'section') {
  const blockStart = html.indexOf(`<${tagName} class="${className}`);
  if (blockStart < 0) return html;
  const closeTag = `</${tagName}>`;
  const blockClose = html.indexOf(closeTag, blockStart);
  if (blockClose < 0) throw new Error(`Unclosed ${className} ${tagName}`);
  const blockEnd = blockClose + closeTag.length;
  const block = html.slice(blockStart, blockEnd);
  const withoutBlock = html.slice(0, blockStart) + html.slice(blockEnd);
  const mainClose = withoutBlock.indexOf('</main>');
  if (mainClose < 0) throw new Error('Missing </main>');
  const finalCtaAt = withoutBlock.lastIndexOf('<section class="final-cta', mainClose);
  const insertAt = finalCtaAt >= 0 ? finalCtaAt : mainClose;
  return withoutBlock.slice(0, insertAt) + block + withoutBlock.slice(insertAt);
}

function addHeroPreload(html, image) {
  if (html.includes(`rel="preload" as="image" href="${image}"`)) return html;
  const preload = `<link rel="preload" as="image" href="${escapeAttr(image)}">`;
  const headClose = html.indexOf('</head>');
  if (headClose < 0) throw new Error('Missing </head>');
  return html.slice(0, headClose) + preload + html.slice(headClose);
}

function outputFile(route) {
  return route ? join(dist, route, 'index.html') : join(dist, 'index.html');
}

for (const target of targets) {
  const file = outputFile(target.route);
  const visual = servicePages[target.key];
  if (!visual?.heroImage) throw new Error(`Missing CMS hero image for ${target.key}`);
  const alt = visual.heroAlt?.[target.lang] || '';

  let html = await readFile(file, 'utf8');
  html = replaceHeroImage(html, target.heroClass, visual.heroImage, alt);
  html = movePricingAfterHero(html, target.heroClass);
  html = addHeroPreload(html, visual.heroImage);
  await writeFile(file, html);
  console.log(`Finalized /${target.route}`);
}

for (const route of relatedRoutes) {
  const file = outputFile(route);
  let html = await readFile(file, 'utf8');
  const before = html;
  html = moveBlockBeforeFinalCta(html, 'related-coaching', 'aside');
  if (html !== before) {
    await writeFile(file, html);
    console.log(`Moved related coaching before final CTA on /${route}`);
  }
}

for (const route of locationRoutes) {
  const file = outputFile(route);
  let html = await readFile(file, 'utf8');
  const before = html;
  html = moveBlockBeforeFinalCta(html, 'training-location');
  if (html !== before) {
    await writeFile(file, html);
    console.log(`Moved training location before final CTA on /${route}`);
  }
}

for (const route of reviewRoutes) {
  const file = outputFile(route);
  let html = await readFile(file, 'utf8');
  const before = html;
  html = moveBlockBeforeFinalCta(html, 'reviews-section');
  if (html !== before) {
    await writeFile(file, html);
    console.log(`Moved reviews before final CTA on /${route}`);
  }
}
