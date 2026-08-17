import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const site = 'https://kkcoaching.fit';

const hasFileExtension = (pathname) => /\/[^^/?#]*\.[a-z0-9]{1,8}$/i.test(pathname);

function normalizePathname(pathname) {
  if (!pathname || pathname === '/') return '/';
  if (pathname.startsWith('/.netlify/') || pathname.startsWith('/admin/')) return pathname;
  if (hasFileExtension(pathname)) return pathname;
  return `${pathname.replace(/\/+$/, '')}/`;
}

function normalizeInternalUrl(value) {
  if (!value) return value;
  if (/^(?:mailto:|tel:|sms:|javascript:|data:|#)/i.test(value)) return value;

  try {
    if (value.startsWith(site)) {
      const url = new URL(value);
      url.pathname = normalizePathname(url.pathname);
      return url.toString();
    }

    if (value.startsWith('/')) {
      const [pathPart, suffix = ''] = value.split(/(?=[?#])/i, 2);
      return `${normalizePathname(pathPart)}${suffix}`;
    }
  } catch {
    return value;
  }

  return value;
}

function routeFromHtmlFile(file) {
  const rel = path.relative(dist, file).split(path.sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel.replace(/\.html$/, '')}`;
}

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.isFile() && entry.name.endsWith('.html')) acc.push(full);
  }
  return acc;
}

if (!fs.existsSync(dist)) {
  console.log('URL normalization skipped: dist does not exist.');
  process.exit(0);
}

let touched = 0;
for (const file of walk(dist)) {
  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  const route = routeFromHtmlFile(file);
  const canonicalUrl = `${site}${normalizePathname(route)}`;

  html = html.replace(/<link\s+rel=["']canonical["']\s+href=["'][^"']*["']\s*\/?\s*>/i,
    `<link rel="canonical" href="${canonicalUrl}" />`);
  html = html.replace(/(<meta\s+property=["']og:url["']\s+content=["'])[^"']*(["'])/i,
    `$1${canonicalUrl}$2`);

  html = html.replace(/(<link\s+rel=["']alternate["'][^>]*href=["'])([^"']+)(["'][^>]*>)/gi,
    (_, a, value, b) => `${a}${normalizeInternalUrl(value)}${b}`);

  html = html.replace(/(href=["'])([^"']+)(["'])/gi,
    (_, a, value, b) => `${a}${normalizeInternalUrl(value)}${b}`);

  if (html !== before) {
    fs.writeFileSync(file, html, 'utf8');
    touched += 1;
  }
}

console.log(`Public URL normalization complete: ${touched} HTML file(s) updated.`);
