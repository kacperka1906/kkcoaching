import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const dataFiles = [
  { label: 'Admin 2.0 — Global, Home, Menu, Footer, Map & Reviews', name: 'admin_v2', file: 'src/data/admin-v2.json' },
  { label: 'Core pages — Services, About, Contact, Transformations', name: 'pages_v2', file: 'src/data/pages-v2.json' },
  { label: 'Personal Training page — EN + PL', name: 'personal_training_v2', file: 'src/data/service-details-v2.json' },
  { label: 'Online Coaching page — EN + PL', name: 'online_v2', file: 'src/data/online-v2.json' },
  { label: 'Hybrid Coaching page — EN + PL', name: 'hybrid_v2', file: 'src/data/hybrid-v2.json' },
  { label: 'Training Plan page — EN + PL', name: 'training_plan_v2', file: 'src/data/training-plan-v2.json' },
  { label: 'Service cards — EN + PL', name: 'services_v2', file: 'src/data/services-v2.json' },
  { label: 'Pricing — EN + PL', name: 'pricing_v2', file: 'src/data/pricing.json' },
  { label: 'Service page media', name: 'service_media_v2', file: 'src/data/service-pages.json' }
];

const labelMap = {
  brand: 'Marka / Brand',
  contact: 'Kontakt i social media',
  header: 'Menu i nagłówek',
  footer: 'Stopka',
  location: 'Lokalizacja i mapa',
  reviews: 'Opinie klientów',
  home: 'Strona główna / Home',
  seo: 'SEO',
  title: 'Tytuł',
  heading: 'Nagłówek',
  eyebrow: 'Mały nagłówek',
  body: 'Opis',
  lead: 'Lead / opis główny',
  description: 'Opis',
  tagline: 'Opis / tagline',
  image: 'Zdjęcie',
  imageAlt: 'Alt zdjęcia',
  heroImage: 'Zdjęcie hero',
  heroAlt: 'Alt zdjęcia hero',
  logo: 'Logo',
  footerLogo: 'Logo w stopce',
  enabled: 'Widoczne / aktywne',
  featured: 'Wyróżnij',
  order: 'Kolejność',
  items: 'Elementy',
  cards: 'Karty',
  facts: 'Atuty / punkty',
  steps: 'Kroki',
  bullets: 'Punkty',
  href: 'Link',
  cta: 'CTA',
  ctaLabel: 'Tekst przycisku',
  ctaTarget: 'Link przycisku',
  primaryCta: 'Główne CTA',
  primaryHref: 'Link głównego CTA',
  secondaryCta: 'Drugie CTA',
  secondaryHref: 'Link drugiego CTA',
  phone: 'Telefon',
  whatsapp: 'WhatsApp',
  email: 'Email',
  instagramUrl: 'Instagram URL',
  instagramLabel: 'Instagram — nazwa',
  facebookUrl: 'Facebook URL',
  siteName: 'Nazwa firmy',
  ownerName: 'Imię i nazwisko właściciela',
  venueName: 'Nazwa miejsca',
  addressLine1: 'Adres',
  city: 'Miasto',
  postcode: 'Kod pocztowy',
  country: 'Kod kraju',
  mapQuery: 'Google Maps — lokalizacja',
  directionsUrl: 'Link: wyznacz trasę',
  showInteractiveMap: 'Pokaż interaktywną mapę',
  stickyMobile: 'Sticky menu na telefonie',
  compactOnScroll: 'Kompaktowy header po scrollu',
  showHeaderCta: 'Pokaż CTA w headerze',
  homeLimit: 'Liczba opinii na Home',
  client: 'Imię klienta',
  quote: 'Treść opinii',
  source: 'Źródło',
  screenshot: 'Screenshot oryginalnej opinii',
  rating: 'Ocena 1–5',
  googleReviewsUrl: 'Google — link do wszystkich opinii',
  leaveGoogleReviewUrl: 'Google — link Dodaj opinię',
  googlePlaceId: 'Google Place ID — na przyszłość',
  detail: 'Opis pakietu',
  price: 'Cena',
  currency: 'Symbol waluty',
  name: 'Nazwa',
  num: 'Numer',
  label: 'Etykieta',
  value: 'Wartość',
  scopeNote: 'Notatka pod ofertą',
  fallbackImage: 'Zdjęcie zapasowe',
  trustPoints: 'Punkty zaufania',
  trustAria: 'ARIA label',
  sectionLabels: 'Nagłówki sekcji',
  quickLinks: 'Szybkie linki',
  legalLinks: 'Linki prawne',
  copyright: 'Copyright',
  seoLine: 'Dolna linia SEO',
  credentials: 'Kwalifikacje',
  locationSummary: 'Opis lokalizacji / zasięgu'
};

const prettify = (name) => labelMap[name] || name
  .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  .replace(/[-_]/g, ' ')
  .replace(/^./, (char) => char.toUpperCase());

const isPair = (value) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === 2 && Object.hasOwn(value, 'en') && Object.hasOwn(value, 'pl');

const isImageName = (name) => /(^|)(image|logo|screenshot|photo)$/i.test(name) || /(Image|Logo|Screenshot|Photo)$/.test(name);
const isLongTextName = (name) => /body|description|lead|tagline|intro|note|answer|quote|story|copy|info/i.test(name);
const isUrlName = (name) => /url|href|target/i.test(name);

function scalarField(name, value, required = true) {
  const field = { label: prettify(name), name };
  if (typeof value === 'boolean') return { ...field, widget: 'boolean', default: value };
  if (typeof value === 'number') return { ...field, widget: 'number', value_type: Number.isInteger(value) ? 'int' : 'float' };
  if (isImageName(name)) return { ...field, widget: 'image', required };
  if (name === 'source') {
    return {
      ...field,
      widget: 'select',
      options: [
        { label: 'Google', value: 'google' },
        { label: 'WhatsApp', value: 'whatsapp' },
        { label: 'Messenger', value: 'messenger' },
        { label: 'MyPTHub', value: 'mypthub' },
        { label: 'Instagram', value: 'instagram' },
        { label: 'Facebook', value: 'facebook' },
        { label: 'Email', value: 'email' },
        { label: 'Inne', value: 'other' }
      ]
    };
  }
  const widget = isLongTextName(name) || String(value ?? '').length > 110 ? 'text' : 'string';
  const result = { ...field, widget, required };
  if (isUrlName(name)) result.hint = 'Pełny URL lub ścieżka strony, np. /contact.';
  return result;
}

function pairField(name, value) {
  const long = isLongTextName(name) || String(value.en ?? '').length > 110 || String(value.pl ?? '').length > 110;
  const childWidget = isImageName(name) ? 'image' : long ? 'text' : 'string';
  return {
    label: prettify(name),
    name,
    widget: 'object',
    collapsed: false,
    fields: [
      { label: 'English', name: 'en', widget: childWidget },
      { label: 'Polski', name: 'pl', widget: childWidget }
    ]
  };
}

function reviewItemsField(name) {
  return {
    label: 'Opinie',
    name,
    widget: 'list',
    collapsed: true,
    summary: '{{fields.client}} — {{fields.source}}',
    hint: 'Minimum: imię, treść i źródło. Screenshot i gwiazdki są opcjonalne.',
    fields: [
      { label: 'Widoczna', name: 'enabled', widget: 'boolean', default: true },
      { label: 'Imię klienta', name: 'client', widget: 'string' },
      { label: 'Treść opinii', name: 'quote', widget: 'text' },
      scalarField('source', 'google'),
      { label: 'Screenshot oryginalnej wiadomości', name: 'screenshot', widget: 'image', required: false, hint: 'Usuń lub zasłoń prywatne dane, jeśli nie masz zgody na ich publikację.' },
      { label: 'Ocena 1–5', name: 'rating', widget: 'number', value_type: 'int', min: 1, max: 5, required: false },
      { label: 'Pokaż na stronie głównej', name: 'featured', widget: 'boolean', default: true }
    ]
  };
}

function fieldFromValue(name, value, parents = []) {
  if (parents.at(-1) === 'reviews' && name === 'items' && Array.isArray(value)) return reviewItemsField(name);
  if (isPair(value)) return pairField(name, value);
  if (Array.isArray(value)) {
    if (value.length === 0) return { label: prettify(name), name, widget: 'list', field: { label: 'Element', name: 'value', widget: 'string' }, collapsed: true };
    const first = value[0];
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      if (isPair(first)) {
        return {
          label: prettify(name), name, widget: 'list', collapsed: true,
          summary: '{{fields.en}} / {{fields.pl}}',
          fields: [
            { label: 'English', name: 'en', widget: isLongTextName(name) ? 'text' : 'string' },
            { label: 'Polski', name: 'pl', widget: isLongTextName(name) ? 'text' : 'string' }
          ]
        };
      }
      const fields = Object.entries(first).map(([childName, childValue]) => fieldFromValue(childName, childValue, [...parents, name]));
      let summary = '{{fields.title.en}} / {{fields.title.pl}}';
      if (Object.hasOwn(first, 'client')) summary = '{{fields.client}} — {{fields.source}}';
      else if (Object.hasOwn(first, 'name') && isPair(first.name)) summary = '{{fields.name.en}} / {{fields.name.pl}}';
      else if (Object.hasOwn(first, 'label') && isPair(first.label)) summary = '{{fields.label.en}} / {{fields.label.pl}}';
      else if (Object.hasOwn(first, 'value')) summary = '{{fields.value}}';
      else if (!Object.hasOwn(first, 'title')) summary = '{{fields.id}}';
      return { label: prettify(name), name, widget: 'list', collapsed: true, summary, fields };
    }
    return { label: prettify(name), name, widget: 'list', collapsed: true, field: scalarField('value', first) };
  }
  if (value && typeof value === 'object') {
    return {
      label: prettify(name), name, widget: 'object', collapsed: true,
      fields: Object.entries(value).map(([childName, childValue]) => fieldFromValue(childName, childValue, [...parents, name]))
    };
  }
  const optional = value === '' || value === null;
  return scalarField(name, value, !optional);
}

function fileCollection(spec) {
  const absolute = path.join(root, spec.file);
  const data = JSON.parse(fs.readFileSync(absolute, 'utf8'));
  return {
    name: spec.name,
    label: spec.label,
    files: [{
      label: spec.label,
      name: spec.name,
      file: spec.file,
      format: 'json',
      fields: Object.entries(data).map(([name, value]) => fieldFromValue(name, value, []))
    }]
  };
}

const testimonialsCollection = {
  name: 'testimonials',
  label: 'Przemiany / Transformations',
  folder: 'src/content/testimonials',
  create: true,
  slug: '{{slug}}',
  fields: [
    { label: 'Imię / inicjał — EN', name: 'name', widget: 'string' },
    { label: 'Imię / inicjał — PL', name: 'namePl', widget: 'string', required: false },
    { label: 'Wiek ujawniony?', name: 'ageDisclosed', widget: 'boolean', default: false },
    { label: 'Wiek', name: 'age', widget: 'number', required: false },
    { label: 'Rodzaj współpracy — EN', name: 'serviceType', widget: 'string' },
    { label: 'Rodzaj współpracy — PL', name: 'serviceTypePl', widget: 'string', required: false },
    { label: 'Czas — EN', name: 'duration', widget: 'string' },
    { label: 'Czas — PL', name: 'durationPl', widget: 'string', required: false },
    { label: 'Punkt startowy — EN', name: 'startingPoint', widget: 'string' },
    { label: 'Punkt startowy — PL', name: 'startingPointPl', widget: 'string', required: false },
    { label: 'Wynik — EN', name: 'result', widget: 'string' },
    { label: 'Wynik — PL', name: 'resultPl', widget: 'string', required: false },
    { label: 'Zgoda na publikację', name: 'consentOnFile', widget: 'boolean', default: false, hint: 'Włącz dopiero, gdy masz zgodę klienta.' },
    { label: 'Zdjęcie', name: 'image', widget: 'image' },
    { label: 'Alt zdjęcia — EN', name: 'imageAlt', widget: 'string' },
    { label: 'Alt zdjęcia — PL', name: 'imageAltPl', widget: 'string', required: false },
    { label: 'Wyróżnij na Home', name: 'featured', widget: 'boolean', default: false },
    { label: 'Historia / cytat — EN', name: 'body', widget: 'markdown' },
    { label: 'Historia / cytat — PL', name: 'storyPl', widget: 'text', required: false }
  ]
};

const faqLegacyCollection = {
  name: 'faq_legacy',
  label: 'FAQ — starsze wpisy',
  folder: 'src/content/faq',
  create: true,
  slug: '{{slug}}',
  fields: [
    { label: 'Pytanie', name: 'question', widget: 'string' },
    { label: 'Kolejność', name: 'order', widget: 'number' },
    { label: 'Język', name: 'language', widget: 'select', options: [{ label: 'English', value: 'en' }, { label: 'Polski', value: 'pl' }] },
    { label: 'Odpowiedź', name: 'body', widget: 'markdown' }
  ]
};

const config = {
  local_backend: true,
  backend: { name: 'git-gateway', branch: 'main' },
  media_folder: 'public/images',
  public_folder: '/images',
  publish_mode: 'simple',
  collections: [...dataFiles.map(fileCollection), testimonialsCollection, faqLegacyCollection]
};

const output = path.join(root, 'public/admin/config.yml');
fs.writeFileSync(output, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
console.log(`Admin 2.0 config generated with ${config.collections.length} collections.`);
