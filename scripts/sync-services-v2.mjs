import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const services = JSON.parse(fs.readFileSync(path.join(root, 'src/data/services-v2.json'), 'utf8'));

const quote = (value) => JSON.stringify(String(value || ''));

for (const lang of ['en', 'pl']) {
  const dir = path.join(root, 'src/content/services', lang);
  fs.mkdirSync(dir, { recursive: true });

  for (const service of services.items.filter((item) => item.enabled !== false)) {
    const lines = [
      '---',
      `title: ${quote(service.title[lang])}`,
      `tagline: ${quote(service.tagline[lang])}`,
      `order: ${Number(service.order)}`,
      `minor: ${Boolean(service.minor)}`,
      `ctaLabel: ${quote(service.ctaLabel[lang])}`,
      `ctaTarget: ${quote(service.ctaTarget[lang])}`,
      `image: ${quote(service.image)}`,
      `imageAlt: ${quote(service.imageAlt[lang])}`
    ];

    if (service.detailImage) {
      lines.push(`detailImage: ${quote(service.detailImage)}`);
      lines.push(`detailImageAlt: ${quote(service.detailImageAlt[lang])}`);
    }

    lines.push('bullets:');
    for (const bullet of service.bullets || []) lines.push(`  - ${quote(bullet[lang])}`);
    lines.push('---', '');

    fs.writeFileSync(path.join(dir, `${service.id}.md`), `${lines.join('\n')}\n`, 'utf8');
  }
}

console.log('Admin 2.0 service data synced.');
