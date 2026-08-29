import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const write = (path, content) => fs.writeFileSync(path, content, 'utf8');

function replaceRequired(path, from, to) {
  const current = read(path);
  if (!current.includes(from)) throw new Error(`Expected text not found in ${path}`);
  write(path, current.replace(from, to));
}

// 1) Polish online copy: keep the primary search phrase once, but remove keyword-stuffed repetition.
replaceRequired(
  'src/pages/pl/online-coaching.astro',
  'Jeśli porównujesz trenera personalnego online, trening personalny online albo prowadzenie online, najważniejsze jest to, co dzieje się po ułożeniu planu. Trening, żywienie, regularne raporty i dane o postępach są częścią jednego systemu, dzięki czemu zmiany wynikają z realnych efektów, a nie ze zgadywania.',
  'Jeśli szukasz trenera personalnego online, sam plan to dopiero początek. Trening, indywidualny jadłospis, regularne raporty i analiza postępów tworzą jeden system. Dzięki temu kolejne zmiany opieramy na Twoich wynikach, a nie na zgadywaniu.'
);

// 2) Pricing heading must remain readable even if a parent section supplies dark-theme inheritance.
replaceRequired(
  'src/components/ServicePricing.astro',
  '.pricing-head h2 { margin-bottom: 12px; }',
  '.pricing-head h2 { margin-bottom: 12px; color: var(--graphite); }'
);

// 3) Root cause: find the matching closing <section>, not simply the first nested </section>.
// OnlinePromotion is nested inside the online hero, so the old helper could insert pricing inside .on-dark.
const finalizePath = 'scripts/finalize-static-html.mjs';
let finalize = read(finalizePath);
const oldSectionBounds = `function sectionBounds(html, className) {\n  const start = html.indexOf(\`<section class=\"\${className}\`);\n  if (start < 0) throw new Error(\`Missing .\${className} section\`);\n  const close = html.indexOf('</section>', start);\n  if (close < 0) throw new Error(\`Unclosed .\${className} section\`);\n  return { start, end: close + '</section>'.length };\n}`;
const newSectionBounds = `function sectionBounds(html, className) {\n  const start = html.indexOf(\`<section class=\"\${className}\`);\n  if (start < 0) throw new Error(\`Missing .\${className} section\`);\n\n  const tagPattern = /<\\/?section\\b[^>]*>/gi;\n  tagPattern.lastIndex = start;\n  let depth = 0;\n  let match;\n\n  while ((match = tagPattern.exec(html))) {\n    const tag = match[0];\n    if (/^<section\\b/i.test(tag)) depth += 1;\n    else depth -= 1;\n\n    if (depth === 0) return { start, end: tagPattern.lastIndex };\n  }\n\n  throw new Error(\`Unclosed .\${className} section\`);\n}`;
if (!finalize.includes(oldSectionBounds)) throw new Error('Expected sectionBounds helper not found');
finalize = finalize.replace(oldSectionBounds, newSectionBounds);
write(finalizePath, finalize);

console.log('Online pricing contrast, PL copy and nested-section finalizer fixed.');
