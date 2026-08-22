import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const abs = (file) => path.join(root, file);
const read = (file) => fs.readFileSync(abs(file), 'utf8');
const write = (file, value) => fs.writeFileSync(abs(file), value, 'utf8');
const readJson = (file) => JSON.parse(read(file));
const writeJson = (file, value) => write(file, `${JSON.stringify(value, null, 2)}\n`);

function replaceOnce(file, from, to) {
  let text = read(file);
  if (text.includes(to)) return;
  if (!text.includes(from)) throw new Error(`Expected text not found in ${file}: ${from.slice(0, 120)}`);
  text = text.replace(from, to);
  write(file, text);
}

function upsertFaq(items, questionEn, item, { afterEn, beforeEn } = {}) {
  const existing = items.findIndex((entry) => entry.q?.en === questionEn || entry.q?.pl === item.q.pl);
  if (existing >= 0) {
    items[existing] = item;
    return;
  }
  if (afterEn) {
    const at = items.findIndex((entry) => entry.q?.en === afterEn);
    if (at >= 0) {
      items.splice(at + 1, 0, item);
      return;
    }
  }
  if (beforeEn) {
    const at = items.findIndex((entry) => entry.q?.en === beforeEn);
    if (at >= 0) {
      items.splice(at, 0, item);
      return;
    }
  }
  items.push(item);
}

// 1:1 PT: clarify gym access, local pricing intent and the distinction from Online/Hybrid.
{
  const file = 'src/data/service-details-v2.json';
  const data = readJson(file);
  const items = data.personalTraining.faq.items;

  const support = items.find((entry) => entry.q.en === 'What if I need support between face-to-face sessions?');
  if (!support) throw new Error('Missing PT support-between-sessions FAQ');
  support.a.en = 'If you want structured support outside the gym, Hybrid or Online Coaching adds regular check-ins, a personalised meal plan with specific meals and portions, progress analysis, technique feedback and WhatsApp support between reviews.';
  support.a.pl = 'Jeśli chcesz mieć pełne wsparcie również poza siłownią, coaching hybrydowy lub online dodaje regularne raporty, indywidualny jadłospis z konkretnymi posiłkami i porcjami, analizę postępów, ocenę techniki i kontakt przez WhatsApp między raportami.';

  upsertFaq(items, 'Do I need to be a member of JD Gyms Cwmbran?', {
    q: { en: 'Do I need to be a member of JD Gyms Cwmbran?', pl: 'Czy muszę mieć karnet do JD Gyms Cwmbran?' },
    a: {
      en: 'Yes. Personal training sessions take place inside JD Gyms Cwmbran, so you need an active JD Gyms membership that gives you access to the club. My coaching fee covers the personal training service; your gym membership is paid separately.',
      pl: 'Tak. Treningi 1:1 odbywają się na terenie JD Gyms Cwmbran, dlatego potrzebujesz aktywnego członkostwa JD Gyms umożliwiającego wejście do klubu. Opłata za moje treningi obejmuje usługę trenerską; karnet na siłownię opłacasz osobno.'
    }
  }, { afterEn: 'Where do the 1:1 sessions take place?' });

  upsertFaq(items, 'How much does personal training in Cwmbran cost?', {
    q: { en: 'How much does personal training in Cwmbran cost?', pl: 'Ile kosztuje trening personalny w Cwmbran?' },
    a: {
      en: 'The price depends on how often you want to train. You can book a single session or choose a 4-week package, with a lower rate per session at higher training frequencies. The current prices are shown in the pricing section on this page.',
      pl: 'Cena zależy od tego, jak często chcesz trenować. Możesz wybrać pojedynczy trening albo pakiet na 4 tygodnie, a przy większej częstotliwości cena jednej sesji jest niższa. Aktualny cennik znajdziesz wyżej na tej stronie.'
    }
  }, { beforeEn: 'How do I get started?' });

  writeJson(file, data);
}

// Online: remove the old contradiction that implied macros instead of the full meal plan.
{
  const file = 'src/data/online-v2.json';
  const data = readJson(file);
  const item = data.faq.items.find((entry) => entry.q.en === 'Do I get a fixed meal plan?' || entry.q.en === 'Do I get a full meal plan?');
  if (!item) throw new Error('Missing Online meal-plan FAQ');
  item.q.en = 'Do I get a full meal plan?';
  item.q.pl = 'Czy dostanę pełny jadłospis?';
  item.a.en = 'Yes. Online Coaching includes a personalised meal plan with specific meals and portions from breakfast through to your final meal of the day. I build it around your calorie and macronutrient targets and, where practical, the foods and meals you enjoy. The plan can be adjusted as your progress, schedule and preferences change.';
  item.a.pl = 'Tak. W coachingu online dostajesz indywidualny jadłospis z konkretnymi posiłkami i porcjami — od śniadania do ostatniego posiłku dnia. Układam go pod Twoje kalorie, makroskładniki i w miarę możliwości produkty oraz dania, które lubisz. W razie potrzeby jadłospis korygujemy wraz z postępami, grafikiem i zmianami preferencji.';
  writeJson(file, data);
}

// Hybrid: unique PL intent + full-meal-plan wording + JD membership requirement.
{
  const file = 'src/data/hybrid-v2.json';
  const data = readJson(file);
  data.seo.title.pl = 'Coaching hybrydowy Cwmbran | Trening 1:1 + Online | KK Coaching';

  const diff = data.faq.items.find((entry) => entry.q.en === 'What is the difference between Hybrid Coaching and Online Coaching?');
  if (!diff) throw new Error('Missing Hybrid vs Online FAQ');
  diff.a.en = 'Hybrid Coaching includes the full Online Coaching service and adds scheduled face-to-face 1:1 personal training sessions in Cwmbran. Your app, programme, personalised meal plan, check-ins, progress tracking, video feedback and WhatsApp support all remain part of the service.';
  diff.a.pl = 'Coaching hybrydowy obejmuje całe prowadzenie online i dodaje regularne treningi personalne 1:1 w Cwmbran. Nadal masz aplikację, plan treningowy, indywidualny jadłospis, raporty, analizę postępów, ocenę techniki i kontakt przez WhatsApp.';

  const location = data.faq.items.find((entry) => entry.q.en === 'Where do the face-to-face sessions take place?');
  if (!location) throw new Error('Missing Hybrid location FAQ');
  location.a.en = 'The 1:1 sessions are delivered at JD Gyms Cwmbran, 17–18 Gwent Square, Cwmbran, NP44 1PW. An active JD Gyms membership is required for the face-to-face sessions and is paid separately. Exact coaching availability is confirmed during your consultation.';
  location.a.pl = 'Treningi 1:1 prowadzę w JD Gyms Cwmbran przy 17–18 Gwent Square, NP44 1PW. Do udziału w sesjach na żywo potrzebujesz aktywnego członkostwa JD Gyms, które opłacasz osobno. Dostępne godziny ustalamy podczas bezpłatnej konsultacji.';

  writeJson(file, data);
}

// Service cards: keep the short homepage/services copy aligned with the real Online/Hybrid scope.
{
  const file = 'src/data/services-v2.json';
  const data = readJson(file);
  const online = data.items.find((item) => item.id === 'online-coaching');
  const hybrid = data.items.find((item) => item.id === 'hybrid-coaching');
  if (!online || !hybrid) throw new Error('Missing Online/Hybrid service records');

  online.imageAlt.en = 'KK Coaching online coaching with an individual training programme, personalised meal plan and regular progress check-ins';
  online.imageAlt.pl = 'Coaching online KK Coaching z indywidualnym planem treningowym, rozpisanym jadłospisem i regularną analizą postępów';
  online.detailImageAlt.en = 'KK Coaching online coaching app with training, personalised meal planning and progress tracking';
  online.detailImageAlt.pl = 'Aplikacja KK Coaching do prowadzenia online z treningiem, indywidualnym jadłospisem i kontrolą postępów';

  hybrid.tagline.en = 'The most complete coaching option: the full Online Coaching service — including your personalised meal plan — plus regular face-to-face 1:1 sessions in Cwmbran for hands-on technique work and extra accountability.';
  hybrid.tagline.pl = 'Najszersza forma współpracy: pełne prowadzenie online — razem z indywidualnym jadłospisem — połączone z regularnymi treningami personalnymi 1:1 w Cwmbran i pracą nad techniką na żywo.';

  writeJson(file, data);
}

// Pricing/location: make the JD membership condition impossible to miss at the point of purchase.
{
  const file = 'src/data/pricing.json';
  const data = readJson(file);
  data.personal.section.note.en = 'All packages are built around scheduled 1:1 sessions at JD Gyms Cwmbran. An active JD Gyms membership is required and is paid separately.';
  data.personal.section.note.pl = 'Wszystkie pakiety obejmują ustalone treningi 1:1 w JD Gyms Cwmbran. Aktywne członkostwo JD Gyms jest wymagane i opłacane osobno.';
  data.hybrid.section.note.en = 'Both Hybrid options include the complete Online Coaching service plus scheduled 1:1 sessions at JD Gyms Cwmbran. An active JD Gyms membership is required for the face-to-face sessions and is paid separately.';
  data.hybrid.section.note.pl = 'Oba warianty zawierają pełne prowadzenie online oraz ustalone treningi 1:1 w JD Gyms Cwmbran. Do sesji na żywo potrzebujesz aktywnego członkostwa JD Gyms, które opłacasz osobno.';
  writeJson(file, data);
}

{
  const file = 'src/data/admin-v2.json';
  const data = readJson(file);
  data.location.copy.note.en = 'The gym is open 24/7, but personal training sessions are arranged with me at agreed times. An active JD Gyms membership is required for 1:1 sessions and is paid separately.';
  data.location.copy.note.pl = 'Siłownia działa 24/7, ale treningi personalne odbywają się w terminach ustalonych bezpośrednio ze mną. Do sesji 1:1 potrzebujesz aktywnego członkostwa JD Gyms, które opłacasz osobno.';
  writeJson(file, data);
}

// Resources remain OFF, but make the drafts accurate before later review/publication.
{
  const file = 'src/data/resources-v1.json';
  const data = readJson(file);
  const article = data.articles.find((item) => item.id === 'online-personal-training-uk');
  if (!article) throw new Error('Missing Online Personal Training Resource article');
  article.seoDescription.en = 'How online personal training works in the UK: programming, a personalised meal plan, check-ins, video feedback, progress tracking and who online coaching suits best.';
  article.seoDescription.pl = 'Jak działa trener personalny online w UK: plan treningowy, indywidualny jadłospis, raporty, analiza nagrań, kontrola postępów i dla kogo coaching online ma sens.';
  article.intro.en = 'Online coaching should be more than receiving a workout PDF. Done properly, it is an ongoing system: your training is planned, you receive a personalised meal plan, your progress is reviewed, and training and nutrition are adjusted when the data and your real life give us a reason to change them.';
  article.intro.pl = 'Coaching online powinien być czymś więcej niż wysłaniem PDF-a z treningiem. Dobrze prowadzona współpraca to stały system: masz indywidualny plan treningowy, rozpisany jadłospis z konkretnymi posiłkami i porcjami, regularnie raportujesz postępy, możesz przesyłać nagrania techniki, a trening i żywienie korygujemy wtedy, kiedy są ku temu konkretne powody.';
  writeJson(file, data);
}

// Shared SEO/entity/internal-link copy.
replaceOnce('src/components/BusinessEntity.astro',
  "description: 'Personal training in Cwmbran and online fitness coaching with individual training, practical nutrition support and regular progress tracking.',",
  "description: 'Personal training in Cwmbran and online fitness coaching with individual training programmes, personalised meal plans for online and hybrid clients, and regular progress tracking.',");
replaceOnce('src/components/RelatedCoaching.astro',
  "{ href: '/pl/online-coaching', title: 'Coaching online', body: 'Plan treningowy, żywienie, raporty, analiza postępów i stałe wsparcie.' },",
  "{ href: '/pl/online-coaching', title: 'Coaching online', body: 'Plan treningowy, indywidualny jadłospis, raporty, analiza postępów i stałe wsparcie.' },");
replaceOnce('src/components/RelatedCoaching.astro',
  "{ href: '/online-coaching', title: 'Online Coaching', body: 'Individual training, nutrition targets, check-ins, progress analysis and ongoing support.' },",
  "{ href: '/online-coaching', title: 'Online Coaching', body: 'Individual training, a personalised meal plan, check-ins, progress analysis and ongoing support.' },");
replaceOnce('docs/SEO_KEYWORD_MAP.md',
  '| `/online-coaching` | online personal trainer UK / online fitness coaching | personalised training, nutrition guidance, check-ins, app, video feedback | National online commercial landing page |',
  '| `/online-coaching` | online personal trainer UK / online fitness coaching | personalised training, personalised meal plan, check-ins, app, video feedback | National online commercial landing page |');

// Keep source homepage schema/meta aligned with the Admin-driven published metadata.
replaceOnce('src/pages/index.astro',
  "description: 'Personal training in Cwmbran and online fitness coaching with individual training, practical nutrition support and progress tracking.',",
  "description: 'Personal training in Cwmbran and online fitness coaching with individual training programmes, personalised meal plans for online and hybrid clients, and progress tracking.',");
replaceOnce('src/pages/index.astro',
  '  description="Personal trainer in Cwmbran and online fitness coach across the UK. Individual training, nutrition support and progress tracking. Book a free consultation."',
  '  description="Personal trainer in Cwmbran and online fitness coach across the UK. Individual training, personalised meal plans, progress tracking and ongoing support."');
replaceOnce('src/pages/pl/index.astro',
  "description: 'Trening personalny w Cwmbran i coaching online z indywidualnym planem treningowym, praktycznym wsparciem żywieniowym i monitoringiem postępów.',",
  "description: 'Trening personalny w Cwmbran i coaching online z indywidualnym planem treningowym, pełnym jadłospisem w prowadzeniu online i hybrydowym oraz kontrolą postępów.',");
replaceOnce('src/pages/pl/index.astro',
  '  title="Trener personalny w Cwmbran | Coaching online | KK Coaching"',
  '  title="Trener Personalny Cwmbran i Online | KK Coaching"');
replaceOnce('src/pages/pl/index.astro',
  '  description="Trener personalny w Cwmbran i coaching online w UK. Indywidualny trening, wsparcie żywieniowe i kontrola postępów. Umów bezpłatną konsultację."',
  '  description="Trener personalny w Cwmbran i coaching online w UK. Indywidualny trening, rozpisane jadłospisy, kontrola postępów i bieżące wsparcie."');

// One-off plan comparison must describe the Online product accurately.
replaceOnce('src/pages/training-plan.astro',
  "a: 'No. The personalised training plan is a one-off programme for independent training. Online Coaching includes ongoing check-ins, progress analysis, nutrition guidance, technique feedback and continued support.'",
  "a: 'No. The personalised training plan is a one-off programme for independent training. Online Coaching includes ongoing check-ins, progress analysis, a personalised meal plan, technique feedback and continued support.'");
replaceOnce('src/pages/pl/training-plan.astro',
  "a: 'Nie. Indywidualny plan treningowy jest usługą jednorazową do samodzielnej realizacji. Coaching online obejmuje bieżące raporty, analizę postępów, wskazówki żywieniowe, ocenę techniki i regularne korekty.'",
  "a: 'Nie. Indywidualny plan treningowy jest usługą jednorazową do samodzielnej realizacji. Coaching online obejmuje regularne raporty, analizę postępów, indywidualny jadłospis, ocenę techniki, bieżące korekty i kontakt między raportami.'");

// Author/profile connection for future Resources publication.
replaceOnce('src/components/ResourceArticleBody.astro',
  "const authorLabel = lang === 'pl' ? 'Kacper Kaszowski · Personal Trainer' : 'Kacper Kaszowski · Personal Trainer';",
  "const authorLabel = lang === 'pl' ? 'Kacper Kaszowski · Personal Trainer' : 'Kacper Kaszowski · Personal Trainer';\nconst authorHref = lang === 'pl' ? '/pl/about' : '/about';");
replaceOnce('src/components/ResourceArticleBody.astro',
  '<div class="article-meta"><span>{authorLabel}</span><span>{updatedLabel}: {article.updated}</span></div>',
  '<div class="article-meta"><a class="article-author" href={authorHref}>{authorLabel}</a><span>{updatedLabel}: {article.updated}</span></div>');
replaceOnce('src/components/ResourceArticleBody.astro',
  '  .article-meta { display: flex; gap: 12px 24px; flex-wrap: wrap; margin-top: 24px; color: #AEB4BC; font-size: .78rem; font-weight: 700; }',
  '  .article-meta { display: flex; gap: 12px 24px; flex-wrap: wrap; margin-top: 24px; color: #AEB4BC; font-size: .78rem; font-weight: 700; }\n  .article-author { color: inherit; text-decoration: none; text-underline-offset: 3px; }\n  .article-author:hover { color: var(--white); text-decoration: underline; }');

// Conversion analytics: social clicks are now symmetric.
replaceOnce('src/components/Analytics.astro',
  "      } else if (/instagram\\.com/i.test(absoluteHref)) {\n        track('instagram_click', common);\n      } else if (/google\\.com\\/maps\\/dir/i.test(absoluteHref)) {",
  "      } else if (/instagram\\.com/i.test(absoluteHref)) {\n        track('instagram_click', common);\n      } else if (/facebook\\.com/i.test(absoluteHref)) {\n        track('facebook_click', common);\n      } else if (/google\\.com\\/maps\\/dir/i.test(absoluteHref)) {");

// Client-results pages are client proof only; Kacper's transformation remains on About/coach story.
for (const file of ['src/pages/index.astro', 'src/pages/pl/index.astro']) {
  replaceOnce(file,
    'const consentedTestimonials = testimonials.filter(t => t.data.consentOnFile);',
    "const consentedTestimonials = testimonials.filter(t => t.data.consentOnFile && !t.id.includes('kacper-own-story'));");
}
for (const file of ['src/pages/transformations.astro', 'src/pages/pl/transformations.astro']) {
  let text = read(file);
  const to = ".filter(t => t.data.consentOnFile && !t.id.includes('kacper-own-story'))";
  if (!text.includes(to)) {
    const from = '.filter(t => t.data.consentOnFile)';
    if (!text.includes(from)) throw new Error(`Transformation consent filter not found in ${file}`);
    text = text.replace(from, to);
    write(file, text);
  }
}

// Public HTML semantics: keep Footer as source orchestrator, but move support blocks
// into <main> and directly before the true final CTA during the existing build finalizer.
{
  const file = 'scripts/finalize-static-html.mjs';
  const oldFunction = `function moveSectionInsideMain(html, className) {
  const sectionStart = html.indexOf(\`<section class="\${className}\`);
  if (sectionStart < 0) return html;
  const mainClose = html.indexOf('</main>');
  if (mainClose < 0) throw new Error('Missing </main>');
  if (sectionStart < mainClose) return html;

  const sectionClose = html.indexOf('</section>', sectionStart);
  if (sectionClose < 0) throw new Error(\`Unclosed \${className} section\`);
  const sectionEnd = sectionClose + '</section>'.length;
  const section = html.slice(sectionStart, sectionEnd);
  const withoutSection = html.slice(0, sectionStart) + html.slice(sectionEnd);
  const updatedMainClose = withoutSection.indexOf('</main>');

  return withoutSection.slice(0, updatedMainClose) + section + withoutSection.slice(updatedMainClose);
}`;

  const newFunction = `function moveBlockBeforeFinalCta(html, className, tagName = 'section') {
  const blockStart = html.indexOf(\`<\${tagName} class="\${className}\`);
  if (blockStart < 0) return html;
  const closeTag = \`</\${tagName}>\`;
  const blockClose = html.indexOf(closeTag, blockStart);
  if (blockClose < 0) throw new Error(\`Unclosed \${className} \${tagName}\`);
  const blockEnd = blockClose + closeTag.length;
  const block = html.slice(blockStart, blockEnd);
  const withoutBlock = html.slice(0, blockStart) + html.slice(blockEnd);
  const mainClose = withoutBlock.indexOf('</main>');
  if (mainClose < 0) throw new Error('Missing </main>');
  const finalCtaAt = withoutBlock.lastIndexOf('<section class="final-cta', mainClose);
  const insertAt = finalCtaAt >= 0 ? finalCtaAt : mainClose;
  return withoutBlock.slice(0, insertAt) + block + withoutBlock.slice(insertAt);
}`;
  replaceOnce(file, oldFunction, newFunction);

  replaceOnce(file,
    "const reviewRoutes = ['', 'pl'];",
    "const reviewRoutes = ['', 'pl'];\nconst relatedRoutes = ['personal-training-cwmbran', 'online-coaching', 'hybrid-coaching', 'training-plan', 'pl/personal-training-cwmbran', 'pl/online-coaching', 'pl/hybrid-coaching', 'pl/training-plan'];");

  const oldLoops = `for (const route of locationRoutes) {
  const file = outputFile(route);
  let html = await readFile(file, 'utf8');
  const before = html;
  html = moveSectionInsideMain(html, 'training-location');
  if (html !== before) {
    await writeFile(file, html);
    console.log(\`Moved training location into <main> on /\${route}\`);
  }
}

for (const route of reviewRoutes) {
  const file = outputFile(route);
  let html = await readFile(file, 'utf8');
  const before = html;
  html = moveSectionInsideMain(html, 'reviews-section');
  if (html !== before) {
    await writeFile(file, html);
    console.log(\`Moved reviews into <main> on /\${route}\`);
  }
}`;

  const newLoops = `for (const route of relatedRoutes) {
  const file = outputFile(route);
  let html = await readFile(file, 'utf8');
  const before = html;
  html = moveBlockBeforeFinalCta(html, 'related-coaching', 'aside');
  if (html !== before) {
    await writeFile(file, html);
    console.log(\`Moved related coaching before final CTA on /\${route}\`);
  }
}

for (const route of locationRoutes) {
  const file = outputFile(route);
  let html = await readFile(file, 'utf8');
  const before = html;
  html = moveBlockBeforeFinalCta(html, 'training-location');
  if (html !== before) {
    await writeFile(file, html);
    console.log(\`Moved training location before final CTA on /\${route}\`);
  }
}

for (const route of reviewRoutes) {
  const file = outputFile(route);
  let html = await readFile(file, 'utf8');
  const before = html;
  html = moveBlockBeforeFinalCta(html, 'reviews-section');
  if (html !== before) {
    await writeFile(file, html);
    console.log(\`Moved reviews before final CTA on /\${route}\`);
  }
}`;
  replaceOnce(file, oldLoops, newLoops);
}

// Make semantic order a build-breaking regression in the existing SEO audit.
{
  const file = 'scripts/seo-audit.mjs';
  const anchor = `  const trainingLocationAt = html.indexOf('<section class="training-location');
  const mainCloseAt = html.indexOf('</main>');
  if (trainingLocationAt >= 0 && (mainCloseAt < 0 || trainingLocationAt > mainCloseAt)) {
    addError(path, 'training location section sits outside <main>');
  }`;
  const replacement = `${anchor}

  const relatedCoachingAt = html.indexOf('<aside class="related-coaching');
  if (relatedCoachingAt >= 0 && (mainCloseAt < 0 || relatedCoachingAt > mainCloseAt)) {
    addError(path, 'related coaching section sits outside <main>');
  }

  const finalCtaAt = html.lastIndexOf('<section class="final-cta');
  if (finalCtaAt >= 0 && mainCloseAt > finalCtaAt) {
    const finalCtaEnd = html.indexOf('</section>', finalCtaAt);
    if (finalCtaEnd >= 0) {
      const trailingMain = html.slice(finalCtaEnd + '</section>'.length, mainCloseAt);
      if (/<(?:section|aside)\\b/i.test(trailingMain)) addError(path, 'content appears after the final CTA inside <main>');
    }
  }`;
  replaceOnce(file, anchor, replacement);
}

// Safety: Resources must remain unpublished until manual approval.
{
  const publish = readJson('src/data/resources-publish.json');
  if (publish.enabled !== false) throw new Error('Resources publish switch unexpectedly enabled');
}

console.log('Approved 11/10 site audit v2 applied successfully.');
