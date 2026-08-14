import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const publishPath = path.join(root, 'src/data/resources-publish.json');
const publish = JSON.parse(fs.readFileSync(publishPath, 'utf8'));

if (publish.enabled) {
  console.log('Resources publication switch: ON — public routes kept.');
  process.exit(0);
}

const dist = path.join(root, 'dist');
fs.rmSync(path.join(dist, 'resources'), { recursive: true, force: true });
fs.rmSync(path.join(dist, 'pl', 'resources'), { recursive: true, force: true });

if (fs.existsSync(dist)) {
  for (const file of fs.readdirSync(dist)) {
    if (!/^sitemap.*\.xml$/i.test(file) || file === 'sitemap-index.xml') continue;
    const sitemapPath = path.join(dist, file);
    let xml = fs.readFileSync(sitemapPath, 'utf8');
    xml = xml.replace(/<url>\s*<loc>[^<]*\/resources(?:\/[^<]*)?<\/loc>[\s\S]*?<\/url>/gi, '');
    fs.writeFileSync(sitemapPath, xml, 'utf8');
  }
}

console.log('Resources publication switch: OFF — routes removed from public build and sitemap.');
