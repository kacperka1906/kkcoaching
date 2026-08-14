import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const configPath = path.join(root, 'public/admin/config.yml');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const pair = (label, name, widget = 'string') => ({
  label,
  name,
  widget: 'object',
  collapsed: false,
  fields: [
    { label: 'English', name: 'en', widget },
    { label: 'Polski', name: 'pl', widget }
  ]
});

const paragraphList = {
  label: 'Akapity / Paragraphs',
  name: 'paragraphs',
  widget: 'list',
  collapsed: true,
  summary: '{{fields.en}} / {{fields.pl}}',
  fields: [
    { label: 'English', name: 'en', widget: 'text' },
    { label: 'Polski', name: 'pl', widget: 'text' }
  ]
};

const bulletList = {
  label: 'Punkty / Bullets',
  name: 'bullets',
  widget: 'list',
  required: false,
  collapsed: true,
  summary: '{{fields.en}} / {{fields.pl}}',
  fields: [
    { label: 'English', name: 'en', widget: 'string' },
    { label: 'Polski', name: 'pl', widget: 'string' }
  ]
};

const resourcesCollection = {
  name: 'resources_v1',
  label: 'Poradniki SEO / Resources — EN + PL',
  files: [
    {
      label: 'Poradniki SEO / Resources — EN + PL',
      name: 'resources_v1',
      file: 'src/data/resources-v1.json',
      format: 'json',
      fields: [
        { label: 'Włącz sekcję poradników', name: 'enabled', widget: 'boolean', default: true },
        {
          label: 'Strona główna poradników / Hub',
          name: 'hub',
          widget: 'object',
          collapsed: true,
          fields: [
            {
              label: 'SEO', name: 'seo', widget: 'object', collapsed: true,
              fields: [pair('Tytuł SEO / SEO title', 'title'), pair('Meta description', 'description', 'text')]
            },
            pair('Mały nagłówek / Eyebrow', 'eyebrow'),
            pair('Nagłówek / Heading', 'heading'),
            pair('Opis główny / Lead', 'lead', 'text'),
            pair('Przycisk do oferty', 'backToCoaching')
          ]
        },
        {
          label: 'Artykuły',
          name: 'articles',
          widget: 'list',
          collapsed: true,
          summary: '{{fields.title.en}} / {{fields.title.pl}}',
          fields: [
            { label: 'ID techniczne', name: 'id', widget: 'string', hint: 'Unikalne. Nie zmieniaj po publikacji bez potrzeby.' },
            { label: 'Widoczny / aktywny', name: 'enabled', widget: 'boolean', default: true },
            { label: 'Data publikacji', name: 'published', widget: 'string', hint: 'Format YYYY-MM-DD' },
            { label: 'Data aktualizacji', name: 'updated', widget: 'string', hint: 'Format YYYY-MM-DD' },
            pair('Slug URL', 'slug'),
            pair('Tytuł SEO', 'seoTitle'),
            pair('Meta description', 'seoDescription', 'text'),
            pair('Tytuł artykułu', 'title'),
            pair('Wstęp', 'intro', 'text'),
            { label: 'Zdjęcie', name: 'image', widget: 'image' },
            pair('Alt zdjęcia', 'imageAlt'),
            {
              label: 'Sekcje artykułu',
              name: 'sections',
              widget: 'list',
              collapsed: true,
              summary: '{{fields.heading.en}} / {{fields.heading.pl}}',
              fields: [
                pair('Nagłówek sekcji', 'heading'),
                paragraphList,
                bulletList
              ]
            },
            {
              label: 'CTA na końcu',
              name: 'cta',
              widget: 'object',
              collapsed: true,
              fields: [
                pair('Nagłówek', 'heading'),
                pair('Opis', 'body', 'text'),
                pair('Tekst przycisku', 'label'),
                pair('Link przycisku', 'href')
              ]
            }
          ]
        }
      ]
    }
  ]
};

config.collections = (config.collections ?? []).filter(collection => collection.name !== resourcesCollection.name);
config.collections.splice(Math.min(9, config.collections.length), 0, resourcesCollection);

fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
console.log('Admin 2.0 resources collection added.');
