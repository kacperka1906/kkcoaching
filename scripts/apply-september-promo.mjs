import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const write = (file, content) => fs.writeFileSync(file, content, 'utf8');

function replaceRequired(file, from, to, label) {
  let content = read(file);
  if (content.includes(to)) return;
  if (!content.includes(from)) throw new Error(`Missing anchor for ${label}`);
  content = content.replace(from, to);
  write(file, content);
}

function integratePromotion(file, importPath, lang) {
  let content = read(file);
  const importLine = `import OnlinePromotion from '${importPath}';`;
  if (!content.includes(importLine)) {
    const anchor = `import BaseLayout from '${lang === 'en' ? '../layouts/BaseLayout.astro' : '../../layouts/BaseLayout.astro'}';`;
    if (!content.includes(anchor)) throw new Error(`Missing BaseLayout import in ${file}`);
    content = content.replace(anchor, `${anchor}\n${importLine}`);
  }

  if (!content.includes(`<OnlinePromotion lang="${lang}" />`)) {
    const heroStart = content.indexOf('<section class="online-hero on-dark">');
    if (heroStart < 0) throw new Error(`Missing online hero in ${file}`);
    const heroClose = content.indexOf('</section>', heroStart);
    if (heroClose < 0) throw new Error(`Unclosed online hero in ${file}`);
    content = `${content.slice(0, heroClose)}  <OnlinePromotion lang="${lang}" />\n${content.slice(heroClose)}`;
  }

  write(file, content);
}

integratePromotion('src/pages/online-coaching.astro', '../components/OnlinePromotion.astro', 'en');
integratePromotion('src/pages/pl/online-coaching.astro', '../../components/OnlinePromotion.astro', 'pl');

{
  const file = 'scripts/generate-admin-config.mjs';
  let content = read(file);
  const dataAnchor = "  { label: 'Online Coaching page — EN + PL', name: 'online_v2', file: 'src/data/online-v2.json' },";
  const dataWithPromo = `${dataAnchor}\n  { label: 'Online Coaching Promotion — campaign settings', name: 'online_promotion', file: 'src/data/online-promotion.json' },`;
  if (!content.includes("name: 'online_promotion'")) {
    if (!content.includes(dataAnchor)) throw new Error('Missing dataFiles Online Coaching anchor');
    content = content.replace(dataAnchor, dataWithPromo);
  }

  const labelAnchor = "  locationSummary: 'Opis lokalizacji / zasięgu'";
  const labelBlock = `  locationSummary: 'Opis lokalizacji / zasięgu',\n  promotionalPrice: 'Promotional price / Cena promocyjna',\n  standardPrice: 'Standard price / Cena standardowa',\n  promotionalPeriod: 'Promotional period / Okres promocyjny',\n  totalSpaces: 'Total promotional spaces / Łączna liczba miejsc',\n  remainingSpaces: 'Remaining spaces / Pozostałe miejsca',\n  ctaText: 'CTA text / Tekst CTA',\n  ctaDestination: 'CTA destination / Link CTA',\n  startDate: 'Start date / Data rozpoczęcia',\n  endDate: 'End date / Data zakończenia',\n  autoDisableAfterEndDate: 'Automatically disable after end date',\n  smallPrint: 'Small print / Warunki promocji'`;
  if (!content.includes("promotionalPrice: 'Promotional price")) {
    if (!content.includes(labelAnchor)) throw new Error('Missing labelMap anchor');
    content = content.replace(labelAnchor, labelBlock);
  }

  const scalarAnchor = "  if (typeof value === 'boolean') return { ...field, widget: 'boolean', default: value };";
  const scalarDate = `${scalarAnchor}\n  if (name === 'startDate' || name === 'endDate') return { ...field, widget: 'datetime', date_format: 'YYYY-MM-DD', time_format: false, format: 'YYYY-MM-DD' };`;
  if (!content.includes("name === 'startDate' || name === 'endDate'")) {
    if (!content.includes(scalarAnchor)) throw new Error('Missing scalarField boolean anchor');
    content = content.replace(scalarAnchor, scalarDate);
  }

  write(file, content);
}

console.log('September Online Coaching promotion integration applied.');
