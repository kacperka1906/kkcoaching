import fs from 'node:fs';

const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const write = (p, data) => fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

const servicesPath = 'src/data/services-v2.json';
const onlinePath = 'src/data/online-v2.json';
const hybridPath = 'src/data/hybrid-v2.json';
const pricingPath = 'src/data/pricing.json';
const adminPath = 'src/data/admin-v2.json';

const services = read(servicesPath);
const online = read(onlinePath);
const hybrid = read(hybridPath);
const pricing = read(pricingPath);
const admin = read(adminPath);

const onlineService = services.items.find((item) => item.id === 'online-coaching');
const hybridService = services.items.find((item) => item.id === 'hybrid-coaching');
if (!onlineService || !hybridService) throw new Error('Online/Hybrid service data not found');

onlineService.tagline = {
  en: 'Complete remote coaching with an individual training programme, a personalised meal plan built around your goals and food preferences where practical, regular check-ins and ongoing support wherever you train.',
  pl: 'Pełne prowadzenie zdalne: indywidualny plan treningowy, rozpisany jadłospis z konkretnymi posiłkami i porcjami, regularne raporty i kontakt ze mną niezależnie od tego, gdzie mieszkasz.'
};
onlineService.bullets[1] = {
  en: 'Personalised meal plan with meals and portions matched to your calorie and macronutrient targets and food preferences where practical',
  pl: 'Indywidualny jadłospis z konkretnymi posiłkami i porcjami, dopasowany do kalorii, makro i w miarę możliwości do produktów, które lubisz'
};
hybridService.bullets[4] = {
  en: 'Personalised meal plan with meals and portions matched to your calorie and macronutrient targets and food preferences where practical',
  pl: 'Indywidualny jadłospis z konkretnymi posiłkami i porcjami, dopasowany do kalorii, makro i w miarę możliwości do produktów, które lubisz'
};

online.seo.description = {
  en: 'Online personal trainer and fitness coach across the UK. Individual training plan, personalised meal plan, check-ins, progress tracking and video feedback.',
  pl: 'Polski trener personalny online w UK. Indywidualny plan treningowy, rozpisany jadłospis, raporty, analiza postępów, ocena techniki i kontakt przez WhatsApp.'
};
online.hero.lead = {
  en: 'Get a personalised training plan, a full meal plan built around your calorie and macronutrient targets and food preferences where practical, regular accountability and ongoing support from an online coach.',
  pl: 'Dostajesz indywidualny plan treningowy oraz pełny jadłospis z konkretnymi posiłkami i porcjami, dopasowany do Twojego celu i w miarę możliwości do tego, co lubisz jeść. Do tego regularne raporty i kontakt ze mną między nimi.'
};
const nutritionCard = online.outcomes.cards.find((card) => card.title?.en === 'Nutrition you can use in real life');
if (nutritionCard) {
  nutritionCard.title = {
    en: 'A full meal plan, not just macro targets',
    pl: 'Pełny jadłospis, nie tylko kalorie i makro'
  };
  nutritionCard.body = {
    en: 'You receive a complete meal plan with specific meals and portions from breakfast through to your final meal of the day. I build it around your calorie and macronutrient targets and, where practical, the foods and meals you actually enjoy.',
    pl: 'Nie dostajesz samej tabelki z kaloriami i makro. Rozpisuję Ci cały jadłospis — konkretne posiłki i porcje od śniadania do ostatniego posiłku dnia. W miarę możliwości opieram go na produktach i daniach, które naprawdę lubisz.'
  };
}
online.included.body = {
  en: 'The goal is to know what is happening week to week, not find out a month later that the plan stopped fitting your life. Your training, meal plan, progress data and feedback stay connected.',
  pl: 'Trening, jadłospis, raporty i dane o postępach są częścią jednego systemu. Dzięki temu możemy na bieżąco oceniać, co działa, a co wymaga korekty.'
};
online.included.items[1] = {
  en: 'Personalised meal plan with specific meals and portions, matched to your calorie/macronutrient targets and food preferences where practical',
  pl: 'Indywidualny jadłospis z konkretnymi posiłkami i porcjami, dopasowany do kalorii, makro i Twoich preferencji żywieniowych'
};
online.process.steps[1].body = {
  en: 'You receive your individual training plan, personalised meal plan and the tracking structure we will use to judge progress.',
  pl: 'Dostajesz indywidualny plan treningowy i rozpisany jadłospis z konkretnymi posiłkami oraz porcjami. Do tego ustalamy, co będziemy śledzić, żeby rzetelnie oceniać postępy.'
};

hybrid.hero.lead = {
  en: 'You keep the complete Online Coaching service — individual training, a personalised meal plan, check-ins, progress tracking and support — and add regular face-to-face personal training sessions in Cwmbran.',
  pl: 'Masz pełne prowadzenie online — indywidualny plan treningowy, rozpisany jadłospis, regularne raporty, analizę postępów i kontakt ze mną — a do tego treningi 1:1 w Cwmbran.'
};
hybrid.onlineCore.items[1] = {
  en: 'Personalised meal plan with specific meals and portions matched to your calorie and macronutrient targets and food preferences where practical',
  pl: 'Indywidualny jadłospis z konkretnymi posiłkami i porcjami, dopasowany do kalorii, makro i w miarę możliwości do tego, co lubisz jeść'
};

pricing.online.section.intro = {
  en: 'You get the full coaching system from day one: individual training, a personalised meal plan, app access, progress tracking, check-ins, technique feedback and support between reviews.',
  pl: 'Od początku dostajesz pełne prowadzenie: indywidualny plan treningowy, rozpisany jadłospis z konkretnymi posiłkami i porcjami, aplikację, kontrolę postępów, regularne raporty, ocenę techniki i kontakt między raportami.'
};
pricing.hybrid.section.intro = {
  en: 'Hybrid gives you the complete Online Coaching system — including your personalised meal plan — plus face-to-face coaching in Cwmbran at a stronger package rate than buying both services separately.',
  pl: 'Hybrid łączy pełne prowadzenie online — w tym indywidualny jadłospis — z treningami na żywo w Cwmbran, a pakiet kosztuje mniej niż kupowanie obu usług osobno.'
};

if (admin.home?.seo?.description) {
  admin.home.seo.description = {
    en: 'Personal trainer in Cwmbran and online fitness coach across the UK. Individual training, personalised meal plans, progress tracking and ongoing support.',
    pl: 'Trener personalny w Cwmbran i coaching online w UK. Indywidualny trening, rozpisane jadłospisy, kontrola postępów i bieżące wsparcie.'
  };
}

write(servicesPath, services);
write(onlinePath, online);
write(hybridPath, hybrid);
write(pricingPath, pricing);
write(adminPath, admin);

console.log('Meal-plan positioning pass applied.');
