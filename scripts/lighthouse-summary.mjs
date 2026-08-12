import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const reportsDir = new URL('../lighthouse-reports/', import.meta.url);
const files = (await readdir(reportsDir)).filter(file => file.endsWith('.json')).sort();
if (!files.length) throw new Error('No Lighthouse reports found');

const rows = [];
let hardFailure = false;

for (const file of files) {
  const report = JSON.parse(await readFile(join(reportsDir.pathname, file), 'utf8'));
  const categories = report.categories;
  const audits = report.audits;
  const score = key => Math.round((categories[key]?.score ?? 0) * 100);
  const metric = key => audits[key]?.displayValue ?? 'n/a';
  const row = {
    report: file.replace('.json', ''),
    performance: score('performance'),
    accessibility: score('accessibility'),
    bestPractices: score('best-practices'),
    seo: score('seo'),
    fcp: metric('first-contentful-paint'),
    lcp: metric('largest-contentful-paint'),
    cls: metric('cumulative-layout-shift'),
    tbt: metric('total-blocking-time'),
    speedIndex: metric('speed-index')
  };
  rows.push(row);
  if (row.performance < 70 || row.seo < 95 || row.accessibility < 85 || row.bestPractices < 85) hardFailure = true;
}

console.table(rows);
console.log('\nQuality gate: performance >= 70, SEO >= 95, accessibility >= 85, best practices >= 85.');
if (hardFailure) {
  console.error('At least one Lighthouse report missed the minimum quality gate.');
  process.exit(1);
}
console.log('All Lighthouse reports passed the minimum quality gate.');
