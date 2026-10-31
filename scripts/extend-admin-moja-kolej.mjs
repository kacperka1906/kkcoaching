import fs from 'node:fs';
import path from 'node:path';

// Isolated Decap collection for the first Polish MOJA KOLEJ edition.
// This runs after the existing admin config generators and does not edit other collections.
const root = process.cwd();
const configFile = path.join(root, 'public/admin/config.yml');
const contentFile = path.join(root, 'src/data/moja-kolej-2027.json');
const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
const content = JSON.parse(fs.readFileSync(contentFile, 'utf8'));
const text = (label, name, long = false, hint) => ({
  label, name, widget: long ? 'text' : 'string', required: true,
  ...(hint ? { hint } : {})
});
const multiline = (label, name) => text(label, name, true);
const strings = (label, name) => ({
  label, name, widget: 'list', collapsed: true,
  field: { label: 'Treść punktu', name: 'value', widget: 'string' }
});
const group = (label, name, fields) => ({
  label, name, widget: 'object', collapsed: true, fields
});
const sectionNames = {
  hero: '01 · Hero / pierwszy ekran',
  intro: '02 · Wprowadzenie i przekaz',
  community: '03 · Społeczność i moduły',
  coaching: '04 · Indywidualne prowadzenie',
  roadmap: '05 · Plan 16 tygodni',
  rhythm: '06 · Rytm tygodnia',
  fit: '07 · Dla kogo jest program',
  coach: '08 · Trener i wiarygodność',
  price: '09 · Cena i zasady',
  application: '10 · Podgląd formularza (NIEAKTYWNY)',
  faq: '11 · Częste pytania',
  final: '12 · Zakończenie i CTA'
};
const sections = Object.entries(content.copy.sections).map(([name, values]) =>
  group(sectionNames[name] ?? name, name, Object.entries(values).map(([key, value]) => {
    const excerpt = value.length > 75 ? value.slice(0, 72) + '…' : value;
    return text(excerpt, key, value.length > 85,
      'Wpisz po polsku. Układ, styl i sposób działania przycisków pozostają bez zmian.');
  }))
);
const attributes = Object.entries(content.copy.attributes).map(([name, value]) => {
  const clean = name.startsWith('aria_label') ? 'Opis dostępności' : 'Tekst podpowiedzi pola';
  return text(clean + ' — ' + value.slice(0, 52), name, value.length > 90);
});
const identifier = (name) => ({
  label: 'Identyfikator elementu — NIE ZMIENIAJ', name,
  widget: 'hidden', required: true
});
const common = {
  name: 'moja_kolej_2027',
  label: 'MOJA KOLEJ 2027 — polska strona kampanii',
  editor: { preview: false },
  files: [{
    label: 'MOJA KOLEJ 2027 — wszystkie treści i media',
    name: 'moja_kolej_2027',
    file: 'src/data/moja-kolej-2027.json',
    format: 'json',
    fields: [
      group('00 · SEO i udostępnianie', 'seo', [
        text('Tytuł SEO', 'title'),
        multiline('Opis SEO', 'description'),
        { label: 'Grafika przy udostępnianiu', name: 'socialImage', widget: 'image' },
        text('Opis grafiki do udostępniania', 'socialImageAlt')
      ]),
      group('00 · Obrazy i podpisy', 'media', [
        { label: 'Główna grafika HERO', name: 'heroImage', widget: 'image' },
        text('Opis dostępności zdjęcia HERO', 'heroAlt'),
        { label: 'Zdjęcie w sekcji trenera', name: 'coachImage', widget: 'image' },
        text('Opis dostępności zdjęcia trenera', 'coachAlt')
      ]),
      group('00 · Informacje o programie / liczby i daty', 'facts', [
        text('Rok edycji', 'year'),
        {label:'Czas trwania (tygodnie)',name:'durationWeeks',widget:'number',value_type:'int',min:1},
        {label:'Liczba miejsc w pierwszej edycji',name:'maxPlaces',widget:'number',value_type:'int',min:1},
        text('Data startu — krótki zapis do hero', 'startShort'),
        text('Data startu — pełny zapis na osi czasu', 'startFull'),
        text('Data końca — pełny zapis na osi czasu', 'endFull')
      ]),
      group('00 · Proponowana cena w GBP', 'pricing', [
        { label: 'Cena całego programu (£)', name: 'total', widget: 'number', value_type: 'int', min: 1 },
        { label: 'Etap rezerwacji (£)', name: 'reservation', widget: 'number', value_type: 'int', min: 0 },
        { label: 'Przed pierwszym blokiem (£)', name: 'firstBlock', widget: 'number', value_type: 'int', min: 0 },
        { label: 'Przed drugim blokiem (£)', name: 'secondBlock', widget: 'number', value_type: 'int', min: 0 }
      ]),
      group('Treści sekcji — nagłówki, CTA, objaśnienia, podgląd formularza', 'copy', [
        group('Opisy pól i dostępność', 'attributes', attributes),
        group('Sekcje strony', 'sections', sections)
      ]),
      {
        label: 'Sześć modułów programu — edytuj i przestawiaj',
        name: 'features', widget: 'list', collapsed: true, min: 6, max: 6,
        summary: '{{fields.title}}',
        fields: [
          identifier('id'),
          {label:'Ikona — techniczna',name:'icon',widget:'hidden',required:true},
          text('Mały nagłówek', 'eyebrow'),
          text('Nazwa modułu', 'title'),
          multiline('Opis modułu', 'detail'),
          strings('Korzyści / punkty', 'items')
        ]
      },
      strings('Indywidualne prowadzenie — lista korzyści', 'coaching'),
      {
        label: 'Plan czterech etapów / 16 tygodni',
        name: 'phases', widget: 'list', collapsed: true, min: 4, max: 4,
        summary: '{{fields.title}}',
        fields: [
          {label:'Numer etapu',name:'number',widget:'hidden'},
          text('Nazwa etapu', 'title'),
          text('Zakres tygodni', 'range'),
          strings('Tematy czterech tygodni', 'weeks')
        ]
      },
      {
        label: 'Harmonogram tygodnia — spotkania w NIEDZIELĘ',
        name: 'week', widget: 'list', collapsed: true, min: 7, max: 7,
        summary: '{{fields.day}} · {{fields.title}}',
        fields: [
          {label:'Dzień tygodnia',name:'day',widget:'string',hint:'Zostaw siedem dni od poniedziałku do niedzieli; niedziela pozostaje dniem spotkania.'},
          text('Aktywność', 'title'),
          multiline('Opis', 'body')
        ]
      },
      strings('Dla kogo jest program — przykłady', 'people'),
      {
        label: 'FAQ — pytania i odpowiedzi',
        name: 'faqs', widget: 'list', collapsed: true,
        summary: '{{fields.question}}',
        fields: [
          text('Pytanie', 'question'),
          multiline('Odpowiedź', 'answer')
        ],
        hint: 'Kwoty aktualizują się automatycznie, jeśli pozostawisz znaczniki {{total}}, {{reservation}}, {{firstBlock}}, {{secondBlock}}.'
      }
    ]
  }]
};
config.collections = (config.collections ?? []).filter(c => c.name !== common.name);
config.collections.push(common);
fs.writeFileSync(configFile, JSON.stringify(config, null, 2) + '\n', 'utf8');
console.log('MOJA KOLEJ 2027 isolated Polish Decap collection generated.');
