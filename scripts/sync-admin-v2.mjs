import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourcePath = path.join(root, 'src/data/admin-v2.json');
const admin = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

const localize = (lang) => {
  const h = admin.home;
  const storyStats = h.story.stats ?? [];
  return {
    meta: {
      siteName: admin.brand.siteName,
      tagline: admin.brand.tagline[lang],
      contactEmail: admin.contact.email,
      whatsappNumber: admin.contact.whatsapp,
      instagramUrl: admin.contact.instagramUrl,
      facebookUrl: admin.contact.facebookUrl,
      trainingLocation: `${admin.location.city}, South Wales`
    },
    transformations: {
      eyebrow: h.transformations.eyebrow[lang],
      heading: h.transformations.heading[lang],
      body: h.transformations.body[lang],
      cta: h.transformations.cta[lang]
    },
    servicesIntro: {
      eyebrow: h.servicesIntro.eyebrow[lang],
      heading: h.servicesIntro.heading[lang],
      body: h.servicesIntro.body[lang]
    },
    process: {
      eyebrow: h.process.eyebrow[lang],
      heading: h.process.heading[lang],
      body: h.process.body[lang],
      steps: h.process.steps.map((step) => ({ title: step.title[lang], body: step.body[lang] }))
    },
    story: {
      heading: h.story.heading[lang],
      eyebrow: h.story.eyebrow[lang],
      imageAlt: h.story.imageAlt[lang],
      statStart: storyStats[0]?.value ?? '',
      cta: h.story.cta[lang],
      bodyFull: h.story.bodyFull[lang],
      statLoss: storyStats[1]?.value ?? '',
      bodyShort: h.story.bodyShort[lang],
      image: h.story.image,
      statQualification: storyStats[2]?.value ?? ''
    },
    finalCta: {
      heading: h.finalCta.heading[lang],
      body: h.finalCta.body[lang],
      cta: h.finalCta.cta[lang]
    },
    hero: {
      heading: h.hero.heading[lang],
      lead: h.hero.lead[lang],
      ctaPrimary: h.hero.ctaPrimary[lang],
      ctaSecondary: h.hero.ctaSecondary[lang],
      trustLine: h.hero.trustLine[lang],
      image: h.hero.image,
      imageAlt: h.hero.imageAlt[lang]
    },
    whoItsFor: {
      eyebrow: h.whoItsFor.eyebrow[lang],
      heading: h.whoItsFor.heading[lang],
      body: h.whoItsFor.body[lang],
      cards: h.whoItsFor.cards.map((card) => ({ title: card.title[lang], body: card.body[lang] }))
    }
  };
};

for (const lang of ['en', 'pl']) {
  const target = path.join(root, `src/data/site.${lang}.json`);
  fs.writeFileSync(target, `${JSON.stringify(localize(lang), null, 2)}\n`, 'utf8');
}

console.log('Admin 2.0 locale data synced.');
