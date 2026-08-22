import fs from 'node:fs';

const writeJson = (file, data) => {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
};

const ptPath = 'src/data/service-details-v2.json';
const onlinePath = 'src/data/online-v2.json';
const hybridPath = 'src/data/hybrid-v2.json';
const pricingPath = 'src/data/pricing.json';

const pt = JSON.parse(fs.readFileSync(ptPath, 'utf8'));
const online = JSON.parse(fs.readFileSync(onlinePath, 'utf8'));
const hybrid = JSON.parse(fs.readFileSync(hybridPath, 'utf8'));
const pricing = JSON.parse(fs.readFileSync(pricingPath, 'utf8'));

// One consistent hero pattern across 1:1, Online and Hybrid:
// four short product features, no personal story/proof inside the feature pills.
pt.personalTraining.hero.trustAria = {
  en: 'What 1:1 Personal Training includes',
  pl: 'Co obejmuje trening personalny 1:1'
};
pt.personalTraining.hero.trustPoints = [
  { en: '1:1 at JD Gyms Cwmbran', pl: 'Treningi 1:1 w JD Gyms Cwmbran' },
  { en: 'Personalised programme', pl: 'Plan dopasowany do Ciebie' },
  { en: 'Technique coaching', pl: 'Korekta techniki na żywo' },
  { en: 'Progress tracking', pl: 'Kontrola postępów' }
];

// Keep the early PT sections moving the sales story forward instead of repeating
// the same "custom plan / no random workouts" promise three times.
pt.personalTraining.fit.body = {
  en: 'Whether you are starting from scratch, returning after a break or already training without the progress you want, we start from where you are now and build from there.',
  pl: 'Nieważne, czy zaczynasz od zera, wracasz po przerwie, czy trenujesz już od dawna bez efektów, na których Ci zależy. Zaczynamy od tego, gdzie jesteś teraz, i dobieramy kolejne kroki do Twojej sytuacji.'
};
pt.personalTraining.process.body = {
  en: 'Four clear steps from understanding your starting point to reviewing real progress and adjusting the plan when needed.',
  pl: 'Cztery proste etapy: poznaję Twój punkt startowy, układam plan, pracujemy nad wykonaniem i regularnie sprawdzamy, co działa oraz co warto zmienić.'
};

online.hero.trustAria = {
  en: 'What Online Coaching includes',
  pl: 'Najważniejsze elementy prowadzenia online'
};
online.hero.trustPoints = [
  { en: 'Personalised programme', pl: 'Plan dopasowany do Ciebie' },
  { en: 'Coaching app', pl: 'Aplikacja coachingowa' },
  { en: 'Regular check-ins', pl: 'Regularne raporty' },
  { en: 'WhatsApp + video feedback', pl: 'WhatsApp + ocena techniki' }
];

hybrid.hero.trustAria = {
  en: 'What Hybrid Coaching includes',
  pl: 'Najważniejsze elementy coachingu hybrydowego'
};
hybrid.hero.trustPoints = [
  { en: 'Full Online Coaching', pl: 'Pełne prowadzenie online' },
  { en: '1:1 at JD Gyms Cwmbran', pl: 'Treningi 1:1 w JD Gyms' },
  { en: 'Coaching app', pl: 'Aplikacja coachingowa' },
  { en: 'Regular check-ins', pl: 'Regularne raporty' }
];

pricing.personal.section.intro = {
  en: 'Start with a single session or choose a 4-week package. More frequent training means a lower rate per session.',
  pl: 'Możesz zacząć od pojedynczego treningu albo wybrać pakiet na 4 tygodnie. Im częściej trenujemy, tym niższa cena jednej sesji.'
};

writeJson(ptPath, pt);
writeJson(onlinePath, online);
writeJson(hybridPath, hybrid);
writeJson(pricingPath, pricing);

const pagePaths = [
  'src/pages/personal-training-cwmbran.astro',
  'src/pages/pl/personal-training-cwmbran.astro',
  'src/pages/online-coaching.astro',
  'src/pages/pl/online-coaching.astro',
  'src/pages/hybrid-coaching.astro',
  'src/pages/pl/hybrid-coaching.astro'
];

for (const pagePath of pagePaths) {
  let source = fs.readFileSync(pagePath, 'utf8');

  // PT was the odd one out on mobile (1 column). All three service heroes now use 2x2 pills.
  source = source.replace(
    '.trust-row { display: grid; grid-template-columns: 1fr; }',
    '.trust-row { display: grid; grid-template-columns: 1fr 1fr; }'
  );

  // Equal tap targets and vertical alignment for all hero feature pills on mobile.
  source = source.replace(
    '.trust-row span { text-align: center; }',
    '.trust-row span { text-align: center; display: flex; align-items: center; justify-content: center; min-height: 48px; }'
  );

  fs.writeFileSync(pagePath, source, 'utf8');
}

console.log('Service-page consistency pass applied.');
