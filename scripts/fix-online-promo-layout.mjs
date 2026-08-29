import fs from 'node:fs';

function replaceRequired(file, from, to) {
  const current = fs.readFileSync(file, 'utf8');
  if (!current.includes(from)) throw new Error(`Expected markup not found in ${file}`);
  fs.writeFileSync(file, current.replace(from, to), 'utf8');
}

replaceRequired(
  'src/pages/online-coaching.astro',
  `    <OnlinePromotion lang="en" />\n</section>`,
  `</section>\n  <OnlinePromotion lang="en" />`
);

replaceRequired(
  'src/pages/pl/online-coaching.astro',
  `    <OnlinePromotion lang="pl" />\n</section>`,
  `</section>\n  <OnlinePromotion lang="pl" />`
);

const finalizeFile = 'scripts/finalize-static-html.mjs';
let finalize = fs.readFileSync(finalizeFile, 'utf8');
const oldFn = `function movePricingAfterHero(html, className) {\n  const pricingStart = html.indexOf('<section class="service-pricing"');\n  if (pricingStart < 0) throw new Error('Missing service-pricing section');\n  const pricingClose = html.indexOf('</section>', pricingStart);\n  if (pricingClose < 0) throw new Error('Unclosed service-pricing section');\n  const pricingEnd = pricingClose + '</section>'.length;\n  const pricing = html.slice(pricingStart, pricingEnd);\n  const withoutPricing = html.slice(0, pricingStart) + html.slice(pricingEnd);\n\n  const hero = sectionBounds(withoutPricing, className);\n  return withoutPricing.slice(0, hero.end) + pricing + withoutPricing.slice(hero.end);\n}`;
const newFn = `function movePricingAfterHero(html, className) {\n  const pricingStart = html.indexOf('<section class="service-pricing"');\n  if (pricingStart < 0) throw new Error('Missing service-pricing section');\n  const pricingClose = html.indexOf('</section>', pricingStart);\n  if (pricingClose < 0) throw new Error('Unclosed service-pricing section');\n  const pricingEnd = pricingClose + '</section>'.length;\n  const pricing = html.slice(pricingStart, pricingEnd);\n  const withoutPricing = html.slice(0, pricingStart) + html.slice(pricingEnd);\n\n  const hero = sectionBounds(withoutPricing, className);\n  let insertAt = hero.end;\n  if (className === 'online-hero') {\n    const promotionStart = withoutPricing.indexOf('<section class="online-promotion', hero.end);\n    if (promotionStart >= 0) {\n      const promotionClose = withoutPricing.indexOf('</section>', promotionStart);\n      if (promotionClose < 0) throw new Error('Unclosed online-promotion section');\n      insertAt = promotionClose + '</section>'.length;\n    }\n  }\n  return withoutPricing.slice(0, insertAt) + pricing + withoutPricing.slice(insertAt);\n}`;
if (!finalize.includes(oldFn)) throw new Error('Expected movePricingAfterHero implementation not found');
finalize = finalize.replace(oldFn, newFn);
fs.writeFileSync(finalizeFile, finalize, 'utf8');

const auditFile = 'scripts/seo-audit.mjs';
let audit = fs.readFileSync(auditFile, 'utf8');
const oldAudit = `      const nextSection = html.indexOf('<section', heroEnd + '</section>'.length);\n      if (nextSection !== pricingAt) addError(path, 'pricing is not the first section immediately after the hero');`;
const newAudit = `      const nextSection = html.indexOf('<section', heroEnd + '</section>'.length);\n      const isOnlineRoute = path === '/online-coaching' || path === '/pl/online-coaching';\n      if (isOnlineRoute) {\n        const promotionAt = html.indexOf('<section class="online-promotion', heroEnd + '</section>'.length);\n        if (promotionAt >= 0) {\n          if (nextSection !== promotionAt) addError(path, 'promotion is not the first section immediately after the hero');\n          const promotionEnd = html.indexOf('</section>', promotionAt);\n          if (promotionEnd < 0) addError(path, 'online promotion section is not closed');\n          else {\n            const sectionAfterPromotion = html.indexOf('<section', promotionEnd + '</section>'.length);\n            if (sectionAfterPromotion !== pricingAt) addError(path, 'pricing is not immediately after the online promotion');\n          }\n        } else if (nextSection !== pricingAt) {\n          addError(path, 'pricing is not the first section immediately after the hero when promotion is hidden');\n        }\n      } else if (nextSection !== pricingAt) {\n        addError(path, 'pricing is not the first section immediately after the hero');\n      }`;
if (!audit.includes(oldAudit)) throw new Error('Expected service pricing SEO-audit assertion not found');
audit = audit.replace(oldAudit, newAudit);
fs.writeFileSync(auditFile, audit, 'utf8');

console.log('Online promotion is now a sibling of the hero; pricing follows it when enabled, and the SEO audit validates both ON/OFF layouts.');
