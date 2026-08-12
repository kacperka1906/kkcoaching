import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const root = new URL('../dist/', import.meta.url);
const rootPath = root.pathname;
const errors = [];
const warnings = [];
const pages = [];

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

for (const file of pages) {
  const path = pagePath(file);
  const html = await readFile(file, 'utf8');

  const title = matchOne(html, /<title>([\s\S]*?)<\/title>/gi);
  if (!title || !title[1].trim()) addError(path, 'missing or duplicate <title>');
  else {
    const len = textLength(title[1]);
    if (len < 20 || len > 65) addWarning(path, `title length ${len} characters`);
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
  }

  const jsonLdBlocks = [...html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const [, json] of jsonLdBlocks) {
    try {
      JSON.parse(json.trim());
    } catch (error) {
      addError(path, `invalid JSON-LD (${error.message})`);
    }
  }

  const hreflangs = [...html.matchAll(/<link\s+rel=["']alternate["']\s+hreflang=["']([^"']+)["'][^>]*>/gi)].map(match => match[1]);
  if (hreflangs.length > 0) {
    for (const required of ['en', 'pl', 'x-default']) {
      if (!hreflangs.includes(required)) addError(path, `localized page missing hreflang=${required}`);
    }
  }
}

const robotsPath = join(rootPath, 'robots.txt');
try {
  const robots = await readFile(robotsPath, 'utf8');
  if (!robots.includes('Sitemap: https://kkcoaching.fit/sitemap-index.xml')) {
    addError('/robots.txt', 'does not point to canonical sitemap-index.xml');
  }
} catch {
  addError('/robots.txt', 'missing from build output');
}

try {
  const sitemapInfo = await stat(join(rootPath, 'sitemap-index.xml'));
  if (!sitemapInfo.isFile() || sitemapInfo.size === 0) addError('/sitemap-index.xml', 'missing or empty');
} catch {
  addError('/sitemap-index.xml', 'missing from build output');
}

console.log(`SEO audit scanned ${pages.length} generated HTML pages.`);
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
