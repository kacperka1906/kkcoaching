import { readFile, writeFile } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');
const write = (path, content) => writeFile(path, content);

function replaceOnce(content, from, to, label) {
  if (!content.includes(from)) throw new Error(`Missing expected text for ${label}`);
  return content.replace(from, to);
}

function updateFaqAnswer(items, questionEn, answerEn, answerPl) {
  const item = items.find(entry => entry?.q?.en === questionEn);
  if (!item) throw new Error(`FAQ not found: ${questionEn}`);
  item.a.en = answerEn;
  item.a.pl = answerPl;
}

// 1) Personal Training scope consistency: 1:1 keeps practical nutrition guidance,
// while Online/Hybrid clearly include the full personalised meal-plan service.
{
  const path = 'src/data/service-details-v2.json';
  const data = JSON.parse(await read(path));
  updateFaqAnswer(
    data.personalTraining.faq.items,
    'What if I need support between face-to-face sessions?',
    'If you want more support outside the gym, we can discuss Hybrid or Online Coaching. Those services add ongoing check-ins, progress analysis, a personalised meal plan with specific meals and portions, technique feedback and support between reviews.',
    'Jeśli chcesz więcej wsparcia poza siłownią, możemy rozszerzyć współpracę o coaching hybrydowy albo online. Wtedy dochodzą regularne raporty, dokładna analiza postępów, indywidualny jadłospis z konkretnymi posiłkami i porcjami, ocena techniki oraz kontakt między raportami.'
  );
  await write(path, `${JSON.stringify(data, null, 2)}\n`);
}

// 2) Online Coaching: remove the remaining contradiction around full meal plans.
{
  const path = 'src/data/online-v2.json';
  const data = JSON.parse(await read(path));
  const mealFaq = data.faq.items.find(item => item?.q?.en === 'Do I get a fixed meal plan?');
  if (!mealFaq) throw new Error('Online meal-plan FAQ not found');
  mealFaq.q.en = 'Do I get a personalised meal plan?';
  mealFaq.q.pl = 'Czy dostanę indywidualny jadłospis rozpisany posiłek po posiłku?';
  mealFaq.a.en = 'Yes. Online Coaching includes a personalised meal plan with specific meals and portions, built around your calorie and macronutrient targets and, where practical, the foods you actually enjoy. The plan is not treated as a rigid menu forever — it can be adjusted as your progress, preferences or routine change.';
  mealFaq.a.pl = 'Tak. W ramach coachingu online rozpisuję pełny, indywidualny jadłospis z konkretnymi posiłkami i porcjami. Układam go pod Twoje zapotrzebowanie, makroskładniki i — w miarę możliwości — produkty oraz dania, które lubisz. Nie oznacza to jedzenia tego samego bez końca: jadłospis możemy korygować, gdy zmieniają się postępy, preferencje albo Twój grafik.';
  await write(path, `${JSON.stringify(data, null, 2)}\n`);
}

// 3) Hybrid: make the PL title unique and align FAQ wording with the actual service.
{
  const path = 'src/data/hybrid-v2.json';
  const data = JSON.parse(await read(path));
  data.seo.title.pl = 'Coaching hybrydowy Cwmbran | Trening 1:1 + Online | KK Coaching';
  const firstFaq = data.faq.items.find(item => item?.q?.en === 'What is the difference between Hybrid Coaching and Online Coaching?');
  if (!firstFaq) throw new Error('Hybrid comparison FAQ not found');
  firstFaq.a.en = 'Hybrid Coaching includes the full Online Coaching service and adds scheduled face-to-face 1:1 personal training sessions in Cwmbran. Your personalised training programme, full meal plan, app, check-ins, progress tracking, video feedback and WhatsApp support all remain part of the service.';
  firstFaq.a.pl = 'Coaching hybrydowy łączy pełne prowadzenie online z regularnymi treningami personalnymi 1:1 w Cwmbran. Nadal masz indywidualny plan treningowy, pełny jadłospis, aplikację, raporty, analizę postępów, ocenę techniki i kontakt przez WhatsApp.';
  if (!data.faq.items.some(item => item?.q?.en === 'Do I need to be a member of JD Gyms Cwmbran?')) {
    const locationIndex = data.faq.items.findIndex(item => item?.q?.en === 'Where do the face-to-face sessions take place?');
    const membership = {
      q: {
        en: 'Do I need to be a member of JD Gyms Cwmbran?',
        pl: 'Czy muszę mieć członkostwo w JD Gyms Cwmbran?'
      },
      a: {
        en: 'Yes. Because the 1:1 sessions take place inside JD Gyms Cwmbran, you need an active JD Gyms membership to access the gym. The membership is separate from the cost of your Hybrid Coaching package.',
        pl: 'Tak. Treningi 1:1 odbywają się na terenie JD Gyms Cwmbran, dlatego potrzebujesz aktywnego członkostwa w JD Gyms, żeby wejść na siłownię. Karnet jest opłacany osobno i nie jest wliczony w cenę coachingu hybrydowego.'
      }
    };
    data.faq.items.splice(locationIndex >= 0 ? locationIndex + 1 : data.faq.items.length, 0, membership);
  }
  await write(path, `${JSON.stringify(data, null, 2)}\n`);
}

// 4) Related service cards: reflect the full meal-plan offer accurately.
{
  const path = 'src/components/RelatedCoaching.astro';
  let content = await read(path);
  content = replaceOnce(
    content,
    "{ href: '/pl/online-coaching', title: 'Coaching online', body: 'Plan treningowy, żywienie, raporty, analiza postępów i stałe wsparcie.' }",
    "{ href: '/pl/online-coaching', title: 'Coaching online', body: 'Plan treningowy, indywidualny jadłospis, raporty, analiza postępów i stałe wsparcie.' }",
    'Related Coaching PL online card'
  );
  content = replaceOnce(
    content,
    "{ href: '/online-coaching', title: 'Online Coaching', body: 'Individual training, nutrition targets, check-ins, progress analysis and ongoing support.' }",
    "{ href: '/online-coaching', title: 'Online Coaching', body: 'Individual training, a personalised meal plan, check-ins, progress analysis and ongoing support.' }",
    'Related Coaching EN online card'
  );
  await write(path, content);
}

// 5) Global entity description: match the real service scope without implying meal plans are part of standalone 1:1.
{
  const path = 'src/components/BusinessEntity.astro';
  let content = await read(path);
  content = replaceOnce(
    content,
    "description: 'Personal training in Cwmbran and online fitness coaching with individual training, practical nutrition support and regular progress tracking.',",
    "description: 'Personal training in Cwmbran plus online and hybrid coaching with individual training programmes, personalised meal plans, regular progress tracking and direct support.',",
    'BusinessEntity description'
  );
  await write(path, content);
}

// 6) Home-page entity descriptions: same facts in natural EN/PL wording.
for (const [path, from, to, label] of [
  [
    'src/pages/index.astro',
    "description: 'Personal training in Cwmbran and online fitness coaching with individual training, practical nutrition support and progress tracking.',",
    "description: 'Personal training in Cwmbran plus online and hybrid coaching with individual training programmes, personalised meal plans, progress tracking and direct support.',",
    'Home EN Organization description'
  ],
  [
    'src/pages/pl/index.astro',
    "description: 'Trening personalny w Cwmbran i coaching online z indywidualnym planem treningowym, praktycznym wsparciem żywieniowym i monitoringiem postępów.',",
    "description: 'Trening personalny w Cwmbran oraz coaching online i hybrydowy z indywidualnym planem treningowym, rozpisanym jadłospisem, kontrolą postępów i stałym wsparciem.',",
    'Home PL Organization description'
  ]
]) {
  let content = await read(path);
  content = replaceOnce(content, from, to, label);
  // Make sure the homepage proof card can never fall back to the coach's own story.
  content = replaceOnce(
    content,
    'const consentedTestimonials = testimonials.filter(t => t.data.consentOnFile);',
    "const consentedTestimonials = testimonials.filter(t => t.data.consentOnFile && !/kacper-own-story/i.test(t.id));",
    `${label} client-only homepage proof`
  );
  await write(path, content);
}

// 7) Dynamic PT FAQs: membership + current prices, with values derived from pricing.json.
for (const [path, depth, lang] of [
  ['src/pages/personal-training-cwmbran.astro', '..', 'en'],
  ['src/pages/pl/personal-training-cwmbran.astro', '../..', 'pl']
]) {
  let content = await read(path);
  const importAnchor = lang === 'en'
    ? "import admin from '../data/admin-v2.json';"
    : "import admin from '../../data/admin-v2.json';";
  const pricingImport = lang === 'en'
    ? "import pricing from '../data/pricing.json';"
    : "import pricing from '../../data/pricing.json';";
  content = replaceOnce(content, importAnchor, `${importAnchor}\n${pricingImport}`, `${lang} PT pricing import`);
  const oldFaq = "const faqs = copy.faq.items.map(item => ({ q: item.q[lang], a: item.a[lang] }));";
  const newFaq = lang === 'en'
    ? `const enabledPackages = pricing.personal.packages.filter(plan => plan.enabled);\nconst faqs = [\n  ...copy.faq.items.map(item => ({ q: item.q[lang], a: item.a[lang] })),\n  {\n    q: 'Do I need to be a member of JD Gyms Cwmbran?',\n    a: 'Yes. Because the 1:1 sessions take place inside JD Gyms Cwmbran, you need an active JD Gyms membership to access the gym. The membership is separate from the cost of your personal training sessions with me.'\n  },\n  {\n    q: 'How much does personal training in Cwmbran cost?',\n    a: \`A single \\${pricing.personal.payg.sessionMinutes}-minute 1:1 session is \\${pricing.currency}\\${pricing.personal.payg.price}. Current 4-week packages run from \\${pricing.currency}\\${Math.min(...enabledPackages.map(plan => plan.price))} to \\${pricing.currency}\\${Math.max(...enabledPackages.map(plan => plan.price))}, with a lower rate per session at higher training frequencies. The pricing section on this page always shows the current options.\`\n  }\n];`
    : `const enabledPackages = pricing.personal.packages.filter(plan => plan.enabled);\nconst faqs = [\n  ...copy.faq.items.map(item => ({ q: item.q[lang], a: item.a[lang] })),\n  {\n    q: 'Czy muszę mieć członkostwo w JD Gyms Cwmbran?',\n    a: 'Tak. Treningi 1:1 odbywają się na terenie JD Gyms Cwmbran, dlatego potrzebujesz aktywnego członkostwa w JD Gyms, żeby wejść na siłownię. Karnet na siłownię jest opłacany osobno i nie jest wliczony w cenę treningów personalnych.'\n  },\n  {\n    q: 'Ile kosztuje trening personalny w Cwmbran?',\n    a: \`Pojedynczy trening 1:1 trwający \\${pricing.personal.payg.sessionMinutes} minut kosztuje \\${pricing.currency}\\${pricing.personal.payg.price}. Aktualne pakiety 4-tygodniowe kosztują od \\${pricing.currency}\\${Math.min(...enabledPackages.map(plan => plan.price))} do \\${pricing.currency}\\${Math.max(...enabledPackages.map(plan => plan.price))}, a przy częstszych treningach cena jednej sesji jest niższa. Aktualny cennik zawsze znajdziesz wyżej na tej stronie.\`\n  }\n];`;
  content = replaceOnce(content, oldFaq, newFaq, `${lang} PT dynamic FAQs`);
  await write(path, content);
}

// 8) Training-plan comparison FAQs: Online Coaching includes the full meal plan.
for (const [path, from, to, label] of [
  [
    'src/pages/training-plan.astro',
    "Online Coaching includes ongoing check-ins, progress analysis, nutrition guidance, technique feedback and continued support.",
    "Online Coaching includes ongoing check-ins, progress analysis, a personalised meal plan, technique feedback and continued support.",
    'Training Plan EN coaching comparison'
  ],
  [
    'src/pages/pl/training-plan.astro',
    "Coaching online obejmuje bieżące raporty, analizę postępów, wskazówki żywieniowe, ocenę techniki i regularne korekty.",
    "Coaching online obejmuje bieżące raporty, analizę postępów, indywidualny jadłospis, ocenę techniki i regularne korekty.",
    'Training Plan PL coaching comparison'
  ]
]) {
  let content = await read(path);
  content = replaceOnce(content, from, to, label);
  await write(path, content);
}

// 9) Transformations are client proof only; the coach's own story remains on About.
for (const path of ['src/pages/transformations.astro', 'src/pages/pl/transformations.astro']) {
  let content = await read(path);
  content = replaceOnce(
    content,
    ".filter(t => t.data.consentOnFile)",
    ".filter(t => t.data.consentOnFile && !/kacper-own-story/i.test(t.id))",
    `${path} client-only transformations`
  );
  await write(path, content);
}

// 10) Explain the nutrition side of transformation proof accurately.
{
  const path = 'src/components/ResultsContext.astro';
  let content = await read(path);
  content = replaceOnce(
    content,
    "['Żywienie do normalnego życia', 'Kalorie, makro i nawyki mają pomagać osiągać cel bez budowania planu, którego nie da się utrzymać poza idealnym tygodniem.']",
    "['Żywienie, które da się normalnie realizować', 'W coachingu online i hybrydowym rozpisuję pełny jadłospis z konkretnymi posiłkami i porcjami, dopasowany do celu, kalorii, makro i — w miarę możliwości — preferencji klienta.']",
    'ResultsContext PL nutrition card'
  );
  content = replaceOnce(
    content,
    "['Nutrition that works in real life', 'Calories, macros and habits should move you toward the goal without creating a plan that only works during a perfect week.']",
    "['Nutrition you can actually follow', 'Online and Hybrid Coaching include a full personalised meal plan with specific meals and portions, matched to the goal, calorie and macro targets and, where practical, food preferences.']",
    'ResultsContext EN nutrition card'
  );
  await write(path, content);
}

// 11) Resource author byline should lead to the author profile when Resources are approved later.
{
  const path = 'src/components/ResourceArticleBody.astro';
  let content = await read(path);
  content = replaceOnce(
    content,
    "const authorLabel = lang === 'pl' ? 'Kacper Kaszowski · Personal Trainer' : 'Kacper Kaszowski · Personal Trainer';",
    "const authorLabel = lang === 'pl' ? 'Kacper Kaszowski · Personal Trainer' : 'Kacper Kaszowski · Personal Trainer';\nconst authorHref = lang === 'pl' ? '/pl/about' : '/about';",
    'Resource author href'
  );
  content = replaceOnce(
    content,
    '<div class="article-meta"><span>{authorLabel}</span><span>{updatedLabel}: {article.updated}</span></div>',
    '<div class="article-meta"><a href={authorHref}>{authorLabel}</a><span>{updatedLabel}: <time datetime={article.updated}>{article.updated}</time></span></div>',
    'Resource visible author link'
  );
  content = replaceOnce(
    content,
    ".article-meta { display: flex; gap: 12px 24px; flex-wrap: wrap; margin-top: 24px; color: #AEB4BC; font-size: .78rem; font-weight: 700; }",
    ".article-meta { display: flex; gap: 12px 24px; flex-wrap: wrap; margin-top: 24px; color: #AEB4BC; font-size: .78rem; font-weight: 700; }\n  .article-meta a { color: inherit; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; }\n  .article-meta a:hover { color: var(--white); }",
    'Resource author link CSS'
  );
  await write(path, content);
}

// 12) Analytics: include Facebook and useful service/pricing interaction events.
{
  const path = 'src/components/Analytics.astro';
  let content = await read(path);
  content = replaceOnce(
    content,
    "      } else if (/instagram\\.com/i.test(absoluteHref)) {\n        track('instagram_click', common);\n      } else if (/google\\.com\\/maps\\/dir/i.test(absoluteHref)) {",
    "      } else if (/instagram\\.com/i.test(absoluteHref)) {\n        track('instagram_click', common);\n      } else if (/facebook\\.com/i.test(absoluteHref)) {\n        track('facebook_click', common);\n      } else if (/google\\.com\\/maps\\/dir/i.test(absoluteHref)) {",
    'Analytics Facebook event'
  );
  content = replaceOnce(
    content,
    "      if (link.classList.contains('btn')) {\n        track('cta_click', {\n          ...common,\n          cta_destination: href\n        });\n      }",
    "      if (link.classList.contains('btn')) {\n        track('cta_click', {\n          ...common,\n          cta_destination: href\n        });\n      }\n\n      if (link.closest('.service-card')) {\n        track('service_card_click', common);\n      }\n\n      if (link.closest('.service-pricing')) {\n        track('pricing_cta_click', common);\n      }",
    'Analytics service and pricing events'
  );
  await write(path, content);
}

// 13) Clean architecture: visual page extras belong to BaseLayout/main, not Footer.
{
  const path = 'src/layouts/BaseLayout.astro';
  let content = await read(path);
  content = replaceOnce(
    content,
    "import Analytics from '../components/Analytics.astro';",
    "import Analytics from '../components/Analytics.astro';\nimport ServicePricing from '../components/ServicePricing.astro';\nimport RelatedCoaching from '../components/RelatedCoaching.astro';\nimport TrainingLocation from '../components/TrainingLocation.astro';\nimport Reviews from '../components/Reviews.astro';\nimport admin from '../data/admin-v2.json';",
    'BaseLayout extras imports'
  );
  content = replaceOnce(
    content,
    "const isResourceArticle = normalizedPath.startsWith('/resources/') || normalizedPath.startsWith('/pl/resources/');",
    "const pathname = Astro.url.pathname.replace(/\\/+$/, '') || '/';\nconst locationPages = new Set(['/', '/pl', '/services', '/pl/services', '/hybrid-coaching', '/pl/hybrid-coaching']);\nconst pricingPages = new Set(['/personal-training-cwmbran', '/online-coaching', '/hybrid-coaching', '/pl/personal-training-cwmbran', '/pl/online-coaching', '/pl/hybrid-coaching']);\nconst relatedPages = new Set(['/personal-training-cwmbran', '/online-coaching', '/hybrid-coaching', '/training-plan', '/pl/personal-training-cwmbran', '/pl/online-coaching', '/pl/hybrid-coaching', '/pl/training-plan']);\nconst showTrainingLocation = locationPages.has(pathname) && admin.location.enabled;\nconst showReviews = pathname === '/' || pathname === '/pl';\nconst showPricing = pricingPages.has(pathname);\nconst showRelated = relatedPages.has(pathname);\nconst isResourceArticle = normalizedPath.startsWith('/resources/') || normalizedPath.startsWith('/pl/resources/');",
    'BaseLayout extras routing'
  );
  content = replaceOnce(
    content,
    "    <slot />\n  </main>",
    "    <slot />\n    {showPricing && <ServicePricing lang={lang} pathname={pathname} />}\n    {showRelated && <RelatedCoaching lang={lang} pathname={pathname} />}\n    {showTrainingLocation && <TrainingLocation lang={lang} />}\n    {showReviews && <Reviews lang={lang} />}\n  </main>",
    'BaseLayout extras placement'
  );
  await write(path, content);
}

{
  const path = 'src/components/Footer.astro';
  let content = await read(path);
  content = replaceOnce(content, "import TrainingLocation from './TrainingLocation.astro';\nimport Reviews from './Reviews.astro';\nimport RelatedCoaching from './RelatedCoaching.astro';\n", '', 'Footer visual imports');
  content = replaceOnce(content, "import ServicePricing from './ServicePricing.astro';\n", '', 'Footer pricing import');
  content = replaceOnce(
    content,
    "const locationPages = new Set(['/', '/pl', '/services', '/pl/services', '/hybrid-coaching', '/pl/hybrid-coaching']);\nconst pricingPages = new Set(['/personal-training-cwmbran', '/online-coaching', '/hybrid-coaching', '/pl/personal-training-cwmbran', '/pl/online-coaching', '/pl/hybrid-coaching']);\nconst relatedPages = new Set(['/personal-training-cwmbran', '/online-coaching', '/hybrid-coaching', '/training-plan', '/pl/personal-training-cwmbran', '/pl/online-coaching', '/pl/hybrid-coaching', '/pl/training-plan']);\nconst showTrainingLocation = locationPages.has(pathname) && admin.location.enabled;\nconst showReviews = pathname === '/' || pathname === '/pl';\nconst showPricing = pricingPages.has(pathname);\nconst showRelated = relatedPages.has(pathname);\n",
    '',
    'Footer visual routing'
  );
  content = replaceOnce(
    content,
    "{showPricing && <ServicePricing lang={lang} pathname={pathname} />}\n{showRelated && <RelatedCoaching lang={lang} pathname={pathname} />}\n{showTrainingLocation && <TrainingLocation lang={lang} />}\n{showReviews && <Reviews lang={lang} />}\n\n",
    '',
    'Footer visual rendering'
  );
  await write(path, content);
}

// 14) Final static order: pricing after hero; Related -> Location -> Reviews -> true final CTA.
{
  const path = 'scripts/finalize-static-html.mjs';
  let content = await read(path);
  const oldFn = `function moveSectionInsideMain(html, className) {\n  const sectionStart = html.indexOf(\`<section class=\"\\${className}\`);\n  if (sectionStart < 0) return html;\n  const mainClose = html.indexOf('</main>');\n  if (mainClose < 0) throw new Error('Missing </main>');\n  if (sectionStart < mainClose) return html;\n\n  const sectionClose = html.indexOf('</section>', sectionStart);\n  if (sectionClose < 0) throw new Error(\`Unclosed \\${className} section\`);\n  const sectionEnd = sectionClose + '</section>'.length;\n  const section = html.slice(sectionStart, sectionEnd);\n  const withoutSection = html.slice(0, sectionStart) + html.slice(sectionEnd);\n  const updatedMainClose = withoutSection.indexOf('</main>');\n\n  return withoutSection.slice(0, updatedMainClose) + section + withoutSection.slice(updatedMainClose);\n}\n`;
  const newFn = `function moveSectionBeforeFinalCta(html, className) {\n  const sectionStart = html.indexOf(\`<section class=\"\\${className}\`);\n  if (sectionStart < 0) return html;\n  const sectionClose = html.indexOf('</section>', sectionStart);\n  if (sectionClose < 0) throw new Error(\`Unclosed \\${className} section\`);\n  const sectionEnd = sectionClose + '</section>'.length;\n  const section = html.slice(sectionStart, sectionEnd);\n  const withoutSection = html.slice(0, sectionStart) + html.slice(sectionEnd);\n  const mainClose = withoutSection.indexOf('</main>');\n  if (mainClose < 0) throw new Error('Missing </main>');\n  const finalCta = withoutSection.lastIndexOf('<section class=\"final-cta', mainClose);\n  const insertAt = finalCta >= 0 ? finalCta : mainClose;\n  return withoutSection.slice(0, insertAt) + section + withoutSection.slice(insertAt);\n}\n`;
  content = replaceOnce(content, oldFn, newFn, 'finalizer section movement function');
  content = replaceOnce(
    content,
    "const reviewRoutes = ['', 'pl'];",
    "const reviewRoutes = ['', 'pl'];\nconst relatedRoutes = ['personal-training-cwmbran', 'online-coaching', 'hybrid-coaching', 'training-plan', 'pl/personal-training-cwmbran', 'pl/online-coaching', 'pl/hybrid-coaching', 'pl/training-plan'];",
    'finalizer related routes'
  );
  content = replaceOnce(
    content,
    "  html = moveSectionInsideMain(html, 'training-location');",
    "  html = moveSectionBeforeFinalCta(html, 'training-location');",
    'finalizer location order'
  );
  content = replaceOnce(
    content,
    "  html = moveSectionInsideMain(html, 'reviews-section');",
    "  html = moveSectionBeforeFinalCta(html, 'reviews-section');",
    'finalizer reviews order'
  );
  content += `\nfor (const route of relatedRoutes) {\n  const file = outputFile(route);\n  let html = await readFile(file, 'utf8');\n  const before = html;\n  html = moveSectionBeforeFinalCta(html, 'related-coaching');\n  if (html !== before) {\n    await writeFile(file, html);\n    console.log(\`Moved related coaching before final CTA on /\\${route}\`);\n  }\n}\n`;
  await write(path, content);
}

console.log('Approved 11/10 SEO/CRO consistency pass applied.');
