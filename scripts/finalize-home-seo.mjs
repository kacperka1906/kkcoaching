import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = join(root, 'dist');
const admin = JSON.parse(await readFile(join(root, 'src/data/admin-v2.json'), 'utf8'));

const targets = [
  { file: join(dist, 'index.html'), lang: 'en' },
  { file: join(dist, 'pl', 'index.html'), lang: 'pl' }
];

function escapeAttr(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function replaceTitle(html, value) {
  const escaped = String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escaped}</title>`);
}

function replaceMeta(html, attribute, key, value) {
  const escaped = escapeAttr(value);
  const pattern = new RegExp(`<meta\\s+${attribute}=["']${key}["']\\s+content=["'][^"']*["'][^>]*>`, 'i');
  const reversePattern = new RegExp(`<meta\\s+content=["'][^"']*["']\\s+${attribute}=["']${key}["'][^>]*>`, 'i');
  const replacement = `<meta ${attribute}="${key}" content="${escaped}" />`;
  if (pattern.test(html)) return html.replace(pattern, replacement);
  if (reversePattern.test(html)) return html.replace(reversePattern, replacement);
  return html;
}

for (const target of targets) {
  const seo = admin.home?.seo;
  const title = seo?.title?.[target.lang];
  const description = seo?.description?.[target.lang];
  if (!title || !description) throw new Error(`Missing Admin 2.0 home SEO for ${target.lang}`);

  let html = await readFile(target.file, 'utf8');
  html = replaceTitle(html, title);
  html = replaceMeta(html, 'name', 'description', description);
  html = replaceMeta(html, 'property', 'og:title', title);
  html = replaceMeta(html, 'property', 'og:description', description);
  html = replaceMeta(html, 'name', 'twitter:title', title);
  html = replaceMeta(html, 'name', 'twitter:description', description);
  await writeFile(target.file, html);
  console.log(`Applied Admin 2.0 home SEO (${target.lang}).`);
}
