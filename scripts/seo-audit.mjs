import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const root = new URL('../dist/', import.meta.url);
const rootPath = root.pathname;
const errors = [];
const warnings = [];
const pages = [];
const routeSet = new Set();
const pageRecords = [];
const internalLinks = [];
const canonicalOwners = new Map();
const titleOwners = new Map();

const commercialServiceRoutes = new Map([
  ['/personal-training-cwmbran', 'local-hero'],
  ['/online-coaching', 'online-hero'],
  ['/hybrid-coaching', 'hybrid-hero'],
  ['/pl/personal-training-cwmbran', 'local-hero'],
  ['/pl/online-coaching', 'online-hero'],
  ['/pl/hybrid-coaching', 'hybrid-hero']
]);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.isFile() && entry.name.endsWith('.html')) pages.push(path);
  }
}

function pagePath(file) {
  const rel = relative(rootPath, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'/index.html'.length)}`;
  return `/${rel.replace(/\.html$/, '')}`;
}

function normalizeRoute(value) {
  if (!value) return '/';
  const clean = value.split('#')[0].split('?')[0].replace(/\/+$/, '');
  return clean || '/';
}

function matchOne(html, regex) {
  const matches = [...html.matchAll(regex)];
  return matches.length === 1 ? matches[0] : null;
}

function textLength(value = '') {
  return value.replace(/&[a-zA-Z0-9#]+;/g, ' ').replace(/\s+/g, ' ').trim().length;
}

function addError(path, message) {
  errors.push(`${path}: ${message}`);
}

function addWarning(path, message) {
  warnings.push(`${path}: ${message}`);
}

await walk(rootPath);
pages.forEach(file => routeSet.add(pagePath(file)));

for (const file of pages) {
  const path = pagePath(file);
  if (path === '/admin' || path.startsWith('/admin/')) continue;

  const html = await readFile(file, 'utf8');
  const noindex = /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(html)
    || /<meta\s+content=["'][^"']*noindex[^"']*["']\s+name=["']robots["']/i.test(html);

  const title = matchOne(html, /<title>([\s\S]*?)<\/title>/gi);
  if (!title || !title[1].trim()) addError(path, 'missing or duplicate <title>');
  else {
    const value = title[1].replace(/\s+/g, ' ').trim();
    const len = textLength(value);
    if (len < 20 || len > 65) addWarning(path, `title length ${len} characters`);
    if (!noindex) {
      if (titleOwners.has(value)) addWarning(path, `duplicate title also used by ${titleOwners.get(value)}`);
      else titleOwners.set(value, path);
    }
  }

  const description = matchOne(html, /<meta\s+name=["']description["']\s+content=["']([^"']*)["'][^>]*>/gi)
    ?? matchOne(html, /<meta\s+content=["']([^"']*)["']\s+name=["']description["'][^>]*>/gi);
  if (!description || !description[1].trim()) addError(path, 'missing or duplicate meta description');
  else {
    const len = textLength(description[1]);
    if (len < 70 || len > 165) addWarning(path, `meta description length ${len} characters`);
  }

  const canonical = matchOne(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["'][^>]*>/gi)
    ?? matchOne(html, /<link\s+href=["']([^"']+)["']\s+rel=["']canonical["'][^>]*>/gi);
  if (!canonical) addError(path, 'missing or duplicate canonical URL');
  else if (!canonical[1].startsWith('https://kkcoaching.fit')) addError(path, `canonical points outside kkcoaching.fit: ${canonical[1]}`);
  else if (!noindex) {
    if (canonicalOwners.has(canonical[1])) addError(path, `canonical duplicated by ${canonicalOwners.get(canonical[1])}`);
    else canonicalOwners.set(canonical[1], path);
    const canonicalPath = normalizeRoute(new URL(canonical[1]).pathname);
    if (path !== '/404' && canonicalPath !== normalizeRoute(path)) {
      addError(path, `self-canonical mismatch: ${canonical[1]}`);
    }
  }

  const htmlLang = html.match(/<html\s+lang=["']([^"']+)["']/i)?.[1];
  if (!htmlLang || !['en', 'pl'].includes(htmlLang)) addError(path, `invalid or missing html lang (${htmlLang ?? 'none'})`);

  if (!/<meta\s+name=["']robots["']/i.test(html)) addError(path, 'missing robots meta');
  if (!/<meta\s+property=["']og:title["']/i.test(html)) addError(path, 'missing og:title');
  if (!/<meta\s+property=["']og:description["']/i.test(html)) addError(path, 'missing og:description');
  if (!/<meta\s+property=["']og:image["']/i.test(html)) addError(path, 'missing og:image');

  const h1Count = (html.match(/<h1(?:\s|>)/gi) ?? []).length;
  if (h1Count !== 1) addWarning(path, `expected one H1, found ${h1Count}`);

  const imageTags = html.match(/<img\b[^>]*>/gi) ?? [];
  for (const tag of imageTags) {
    const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ?? '(unknown src)';
    if (!/\balt=["'][^"']*["']/i.test(tag)) addError(path, `image missing alt: ${src}`);
    if (!/\bwidth=["']?\d+/i.test(tag) || !/\bheight=["']?\d+/i.test(tag)) addWarning(path, `image missing explicit width/height: ${src}`);
    if (src.includes('/images/kacper.png')) addError(path, 'legacy /images/kacper.png reference remains');
    if (src.includes('online-coaching-placeholder.svg') || src.includes('hybrid-coaching-placeholder.svg')) {
      addError(path, `legacy service placeholder remains: ${src}`);
    }
  }

  const jsonLdBlocks = [...html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const [, json] of jsonLdBlocks) {
    try {
      JSON.parse(json.trim());
    } catch (error) {
      addError(path, `invalid JSON-LD (${error.message})`);
    }
  }

  const hreflangMatches = [...html.matchAll(/<link\s+rel=["']alternate["']\s+hreflang=["']([^"']+)["']\s+href=["']([^"']+)["'][^>]*>/gi)];
  const hreflangs = hreflangMatches.map(match => match[1]);
  if (hreflangs.length > 0) {
    for (const required of ['en', 'pl', 'x-default']) {
      if (!hreflangs.includes(required)) addError(path, `localized page missing hreflang=${required}`);
    }
    for (const [, language, href] of hreflangMatches) {
      if (!href.startsWith('https://kkcoaching.fit')) addError(path, `hreflang ${language} points outside kkcoaching.fit`);
      else {
        const targetPath = normalizeRoute(new URL(href).pathname);
        if (!routeSet.has(targetPath)) addError(path, `hreflang ${language} target does not exist: ${targetPath}`);
      }
    }
  }

  for (const match of html.matchAll(/<a\b[^>]*\shref=["']([^"']+)["'][^>]*>/gi)) {
    const href = match[1];
    if (!href || href.startsWith('#') || /^(mailto:|tel:|javascript:)/i.test(href)) continue;
    try {
      const url = new URL(href, `https://kkcoaching.fit${path === '/' ? '/' : `${path}/`}`);
      if (url.origin !== 'https://kkcoaching.fit') continue;
      if (url.pathname.startsWith('/.netlify/') || url.pathname.startsWith('/admin/')) continue;
      if (/\.[a-z0-9]{2,5}$/i.test(url.pathname)) continue;
      internalLinks.push({ from: path, to: normalizeRoute(url.pathname), href });
    } catch {
      addWarning(path, `could not parse link: ${href}`);
    }
  }

  if (commercialServiceRoutes.has(path)) {
    const heroClass = commercialServiceRoutes.get(path);
    const heroStart = html.indexOf(`<section class="${heroClass}`);
    const heroEnd = heroStart >= 0 ? html.indexOf('</section>', heroStart) : -1;
    const pricingAt = html.indexOf('<section class="service-pricing"');
    const footerAt = html.indexOf('<footer');
    if (heroStart < 0 || heroEnd < 0) addError(path, `missing ${heroClass} hero`);
    if (pricingAt < 0) addError(path, 'missing service pricing');
    else {
      if (pricingAt < heroEnd) addError(path, 'pricing appears before hero is closed');
      if (footerAt >= 0 && pricingAt > footerAt) addError(path, 'pricing remains below footer instead of directly after hero');
      const nextSection = html.indexOf('<section', heroEnd + '</section>'.length);
      if (nextSection !== pricingAt) addError(path, 'pricing is not the first section immediately after the hero');
    }
  }

  pageRecords.push({ path, html, noindex });
}

for (const link of internalLinks) {
  if (!routeSet.has(link.to)) addError(link.from, `broken internal link ${link.href} -> ${link.to}`);
}

const robotsPath = join(rootPath, 'robots.txt');
try {
  const robots = await readFile(robotsPath, 'utf8');
  if (!robots.includes('Sitemap: https://kkcoaching.fit/sitemap-index.xml')) {
    addError('/robots.txt', 'does not point to canonical sitemap-index.xml');
  }
  if (/Disallow:\s*\/$/m.test(robots)) addError('/robots.txt', 'site root is blocked');
} catch {
  addError('/robots.txt', 'missing from build output');
}

try {
  const sitemapInfo = await stat(join(rootPath, 'sitemap-index.xml'));
  if (!sitemapInfo.isFile() || sitemapInfo.size === 0) addError('/sitemap-index.xml', 'missing or empty');
} catch {
  addError('/sitemap-index.xml', 'missing from build output');
}

const sitemapFiles = (await readdir(rootPath)).filter(name => /^sitemap-\d+\.xml$/.test(name));
const sitemapUrls = new Set();
for (const sitemapFile of sitemapFiles) {
  const xml = await readFile(join(rootPath, sitemapFile), 'utf8');
  for (const match of xml.matchAll(/<loc>(https:\/\/kkcoaching\.fit[^<]+)<\/loc>/g)) {
    sitemapUrls.add(normalizeRoute(new URL(match[1]).pathname));
  }
}
for (const record of pageRecords) {
  if (record.noindex || record.path === '/404') continue;
  if (!sitemapUrls.has(normalizeRoute(record.path))) addError(record.path, 'indexable page missing from sitemap');
}

for (const requiredRoute of ['/training-plan', '/pl/training-plan']) {
  if (!routeSet.has(requiredRoute)) addError(requiredRoute, 'required training-plan landing page was not generated');
}

console.log(`SEO audit scanned ${pages.length} generated HTML pages (CMS admin excluded).`);
if (warnings.length) {
  console.log(`\nWarnings (${warnings.length}):`);
  warnings.forEach(item => console.log(`  - ${item}`));
}
if (errors.length) {
  console.error(`\nErrors (${errors.length}):`);
  errors.forEach(item => console.error(`  - ${item}`));
  process.exit(1);
}

console.log('\nSEO audit passed with no blocking errors.');
