import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const configPath = path.join(root, 'public/admin/config.yml');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const pair = (label, name, widget = 'string', required = true, hint) => ({
  label,
  name,
  widget: 'object',
  collapsed: true,
  fields: [
    { label: 'English', name: 'en', widget, required, ...(hint ? { hint } : {}) },
    { label: 'Polski', name: 'pl', widget, required, ...(hint ? { hint } : {}) }
  ]
});

const promotionFields = [
  {
    label: 'Promocje / kampanie',
    name: 'offers',
    widget: 'list',
    collapsed: true,
    summary: '{{fields.internalName}} · {{fields.service}} · priority {{fields.priority}}',
    hint: 'Każdy wpis to osobna promocja. Możesz mieć kilka aktywnych jednocześnie.',
    fields: [
      { label: 'AKTYWNA — pokaż promocję', name: 'enabled', widget: 'boolean', default: true, hint: 'Główny przełącznik ON/OFF dla tej kampanii.' },
      { label: 'Nazwa wewnętrzna — tylko dla Ciebie', name: 'internalName', widget: 'string', hint: 'Np. September 2026 — Online Coaching. Nie jest pokazywana klientowi.' },
      {
        label: 'Usługa, której dotyczy promocja',
        name: 'service',
        widget: 'select',
        options: [
          { label: 'Online Coaching', value: 'online' },
          { label: 'Hybrid Coaching', value: 'hybrid' },
          { label: 'Personal Training 1:1', value: 'personal-training' },
          { label: 'Ogólna / tylko Home', value: 'general' },
          { label: 'Wszystkie podstrony usług', value: 'all' }
        ]
      },
      {
        label: 'Gdzie ma się wyświetlać',
        name: 'display',
        widget: 'object',
        collapsed: false,
        fields: [
          { label: 'Pokaż na stronie głównej', name: 'homepage', widget: 'boolean', default: true },
          { label: 'Pokaż na podstronie usługi', name: 'servicePage', widget: 'boolean', default: true }
        ]
      },
      { label: 'Wyróżniona promocja', name: 'featured', widget: 'boolean', default: false, hint: 'Wyróżniona kampania dostaje mocniejszy akcent wizualny i pierwszeństwo przy tym samym priorytecie.' },
      { label: 'Priorytet wyświetlania', name: 'priority', widget: 'number', value_type: 'int', default: 0, hint: 'Wyższa liczba = promocja pojawia się wcześniej. Zwykle nie musisz tego zmieniać.' },

      pair('Mały nagłówek promocji', 'headline', 'string', true, 'Np. September Special Offer / Wrześniowa Oferta Specjalna.'),

      { label: 'Pokaż cenę promocyjną', name: 'showPrice', widget: 'boolean', default: true, hint: 'Jeśli ON, głównym komunikatem karty będzie cena. Dodatkowy tytuł i opis poniżej nie są wtedy wyświetlane.' },
      { label: 'Cena promocyjna (£)', name: 'promotionalPrice', widget: 'number', value_type: 'float', min: 0 },
      { label: 'Cena standardowa (£)', name: 'standardPrice', widget: 'number', value_type: 'float', min: 0, hint: 'Wartość referencyjna kampanii.' },
      pair('Okres ceny promocyjnej', 'promotionalPeriod', 'string', true, 'Np. First 4 weeks / Pierwsze 4 tygodnie.'),
      pair('Linia po cenie promocyjnej', 'standardPriceText', 'string', true, 'Np. Then £80 every 4 weeks / Następnie £80 co 4 tygodnie.'),

      { label: 'Pokaż limit miejsc', name: 'showSpaces', widget: 'boolean', default: true },
      { label: 'Łączna liczba miejsc', name: 'totalSpaces', widget: 'number', value_type: 'int', min: 0 },
      { label: 'Pozostałe miejsca', name: 'remainingSpaces', widget: 'number', value_type: 'int', min: 0, hint: 'Zmniejszaj ręcznie, gdy zajmujesz kolejne miejsce.' },

      pair('Tekst przycisku CTA', 'ctaText'),
      pair('Link przycisku CTA', 'ctaDestination', 'string', true, 'Np. /contact i /pl/contact.'),

      { label: 'Data startu', name: 'startDate', widget: 'datetime', date_format: 'YYYY-MM-DD', time_format: false, format: 'YYYY-MM-DD', required: false },
      { label: 'Data zakończenia', name: 'endDate', widget: 'datetime', date_format: 'YYYY-MM-DD', time_format: false, format: 'YYYY-MM-DD', required: false },
      { label: 'Automatycznie ukryj po dacie zakończenia', name: 'autoDisableAfterEndDate', widget: 'boolean', default: true },

      pair('Krótki dopisek / warunki', 'smallPrint', 'text', true, 'Tylko informacje, których klient nie widzi już wyżej. Nie powtarzaj ceny ani liczby miejsc.'),

      {
        label: 'Opcjonalny tytuł promocji bez ceny',
        name: 'title',
        widget: 'object',
        collapsed: true,
        hint: 'Używane tylko wtedy, gdy „Pokaż cenę promocyjną” jest wyłączone.',
        fields: [
          { label: 'English', name: 'en', widget: 'string' },
          { label: 'Polski', name: 'pl', widget: 'string' }
        ]
      },
      {
        label: 'Opcjonalny opis promocji bez ceny',
        name: 'offerText',
        widget: 'object',
        collapsed: true,
        hint: 'Używane tylko wtedy, gdy „Pokaż cenę promocyjną” jest wyłączone.',
        fields: [
          { label: 'English', name: 'en', widget: 'text' },
          { label: 'Polski', name: 'pl', widget: 'text' }
        ]
      },
      { label: 'Techniczne ID kampanii — nie zmieniaj po publikacji', name: 'id', widget: 'string', hint: 'Unikalny identyfikator używany w kodzie i audycie.' }
    ]
  }
];

const index = config.collections.findIndex((collection) => collection.name === 'promotions');
if (index === -1) throw new Error('Promotions collection not found in generated admin config.');

config.collections[index] = {
  name: 'promotions',
  label: 'Promotions & Offers — campaigns',
  editor: { preview: false },
  files: [
    {
      label: 'Promotions & Offers — campaigns',
      name: 'promotions',
      file: 'src/data/promotions.json',
      format: 'json',
      fields: promotionFields
    }
  ]
};

fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
console.log('Promotions admin schema simplified and preview disabled.');
