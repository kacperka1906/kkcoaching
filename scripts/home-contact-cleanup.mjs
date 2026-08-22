import fs from 'node:fs';

const adminPath = 'src/data/admin-v2.json';
const admin = JSON.parse(fs.readFileSync(adminPath, 'utf8'));

if (!admin.home?.hero || !admin.home?.servicesIntro || !admin.home?.story || !admin.home?.process || !admin.home?.transformations) {
  throw new Error('Expected Admin 2.0 home structure was not found.');
}

// Homepage: make it a concise routing/sales page instead of repeating the same
// "custom plan / no guesswork / real life" message in every section.
admin.home.hero.lead = {
  en: 'Choose 1:1 personal training in Cwmbran, full online coaching, or a combination of both. We start with your goal and build the level of support around what you actually need.',
  pl: 'Wybierz treningi 1:1 w Cwmbran, pełne prowadzenie online albo połączenie obu. Zaczynamy od Twojego celu i dobieramy taki poziom wsparcia, jakiego naprawdę potrzebujesz.'
};
admin.home.hero.trustLine = {
  en: '1:1 at JD Gyms Cwmbran • Online coaching across the UK • English & Polish',
  pl: 'Treningi 1:1 w JD Gyms Cwmbran • coaching online w UK i poza UK • po polsku i angielsku'
};
admin.home.servicesIntro.body = {
  en: 'Choose the way you want to work with me. Open any option to see the full details, current pricing and exactly what is included.',
  pl: 'Wybierz formę współpracy, która pasuje do Ciebie. W każdej opcji znajdziesz osobno zakres, aktualną cenę i wszystkie szczegóły.'
};
admin.home.story.bodyShort = {
  en: "I'm Kacper Kaszowski, founder of KK Coaching and a personal trainer in Cwmbran. I started at around 117 kg and reached 76 kg before rebuilding my physique, so I know the difference between another short-term fix and a plan you can actually keep following.",
  pl: 'Nazywam się Kacper Kaszowski i prowadzę KK Coaching. Sam zszedłem z około 117 kg do 76 kg, a później przebudowałem sylwetkę, więc z własnego doświadczenia wiem, jaka jest różnica między kolejnym krótkim zrywem a planem, który da się naprawdę realizować.'
};
if (Array.isArray(admin.home.story.stats) && admin.home.story.stats[2]) {
  admin.home.story.stats[2].value = 'EN + PL';
}
admin.home.process.body = {
  en: 'Four simple steps: understand your starting point, choose the right setup, track what matters and adjust when your results give us a reason.',
  pl: 'Cztery proste kroki: poznajemy punkt startowy, ustalamy sposób działania, śledzimy to, co ma znaczenie, i zmieniamy plan wtedy, kiedy wyniki dają ku temu powód.'
};
admin.home.transformations.body = {
  en: 'See what clients have achieved with 1:1 and online coaching. Different starting points and different goals, with one focus: measurable progress.',
  pl: 'Zobacz efekty osób prowadzonych stacjonarnie i online. Różne punkty startowe i różne cele, ale ten sam priorytet: postęp, który da się zmierzyć.'
};

fs.writeFileSync(adminPath, `${JSON.stringify(admin, null, 2)}\n`, 'utf8');

const homepagePaths = ['src/pages/index.astro', 'src/pages/pl/index.astro'];
for (const pagePath of homepagePaths) {
  let source = fs.readFileSync(pagePath, 'utf8');

  // Detailed goal cards repeat content now covered better on the service pages.
  // Keep the homepage focused on offer -> proof -> coach -> process -> CTA.
  source = source.replace(
    /\n  <section aria-labelledby="who-heading">[\s\S]*?\n  <\/section>\n\n  <section id="services"/,
    '\n\n  <section id="services"'
  );

  // Home cards are previews, not copies of the full service pages.
  source = source.replace(
    'bullets={service.data.bullets}',
    'bullets={service.data.bullets.slice(0, 3)}'
  );

  if (pagePath.includes('/pl/')) {
    source = source.replace('<span>Formy współpracy</span>', '<span>Języki</span>');
  } else {
    source = source.replace('<span>Coaching options</span>', '<span>Languages</span>');
  }

  fs.writeFileSync(pagePath, source, 'utf8');
}

const contactMethodsPath = 'src/components/ContactMethods.astro';
let contactMethods = fs.readFileSync(contactMethodsPath, 'utf8');

contactMethods = contactMethods.replace(
  "  instagramUrl: string;\n}",
  "  instagramUrl: string;\n  facebookUrl?: string;\n}"
);
contactMethods = contactMethods.replace(
  'const { lang, whatsappNumber, contactEmail, instagramUrl } = Astro.props;',
  "const { lang, whatsappNumber, contactEmail, instagramUrl, facebookUrl = '' } = Astro.props;"
);
contactMethods = contactMethods.replace(
  "      instagram: 'Instagram',\n      instagramHint: 'Otwórz profil'",
  "      instagram: 'Instagram',\n      instagramHint: 'Otwórz profil',\n      facebook: 'Facebook',\n      facebookHint: 'Otwórz stronę KK Coaching'"
);
contactMethods = contactMethods.replace(
  "      instagram: 'Instagram',\n      instagramHint: 'View profile'",
  "      instagram: 'Instagram',\n      instagramHint: 'View profile',\n      facebook: 'Facebook',\n      facebookHint: 'View KK Coaching page'"
);

const socialTail = `    </a>\n  </div>\n</aside>`;
if (!contactMethods.includes('copy.facebook')) {
  contactMethods = contactMethods.replace(
    socialTail,
    `    </a>\n\n    {facebookUrl && (\n      <a class="contact-method" href={facebookUrl} target="_blank" rel="noopener">\n        <span class="contact-icon" aria-hidden="true">\n          <svg viewBox="0 0 24 24" fill="currentColor">\n            <path d="M13.5 21v-8h2.8l.4-3h-3.2V8.1c0-.9.3-1.5 1.6-1.5H17V4a24 24 0 0 0-2.4-.1c-2.4 0-4.1 1.5-4.1 4.2V10H8v3h2.5v8h3z" />\n          </svg>\n        </span>\n        <span class="contact-copy">\n          <strong>{copy.facebook}</strong>\n          <span class="contact-value">KK Coaching</span>\n          <small>{copy.facebookHint}</small>\n        </span>\n        <span class="contact-arrow" aria-hidden="true">→</span>\n      </a>\n    )}\n  </div>\n</aside>`
  );
}

fs.writeFileSync(contactMethodsPath, contactMethods, 'utf8');

const enContactPath = 'src/pages/contact.astro';
let enContact = fs.readFileSync(enContactPath, 'utf8');
enContact = enContact.replace(
  '        instagramUrl={admin.contact.instagramUrl}\n      />',
  '        instagramUrl={admin.contact.instagramUrl}\n        facebookUrl={admin.contact.facebookUrl}\n      />'
);
fs.writeFileSync(enContactPath, enContact, 'utf8');

const plContactPath = 'src/pages/pl/contact.astro';
let plContact = fs.readFileSync(plContactPath, 'utf8');
plContact = plContact.replace(
  '<ContactMethods lang="pl" whatsappNumber={admin.contact.whatsapp} contactEmail={admin.contact.email} instagramUrl={admin.contact.instagramUrl} />',
  '<ContactMethods lang="pl" whatsappNumber={admin.contact.whatsapp} contactEmail={admin.contact.email} instagramUrl={admin.contact.instagramUrl} facebookUrl={admin.contact.facebookUrl} />'
);
fs.writeFileSync(plContactPath, plContact, 'utf8');

console.log('Homepage and contact cleanup applied.');
