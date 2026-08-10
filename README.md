# KK Coaching &mdash; kkcoaching.fit

Static frontend (Astro) + Decap CMS (client-editable content) + a serverless contact
form function. Built against `KK_Coaching_Brief_Strony_Internetowej_260806_150135.pdf`.
No deployment has been done - this is the codebase only.

## Stack

- **Astro** &mdash; static site generator, outputs plain HTML/CSS/minimal JS.
- **Decap CMS** &mdash; gives Kacper a form-based editor (`/admin`) for text, services,
  testimonials and FAQ, without touching code or raw JSON.
- **Netlify Functions** &mdash; one serverless function (`netlify/functions/contact.js`)
  handles the contact form and sends an email via the Resend API.

## Project structure

```
src/
  content/
    services/en/*.md       # Personal Training, Online Coaching, Hybrid, Plan (EN)
    services/pl/*.md       # same, Polish
    testimonials/*.md      # transformations - each needs consentOnFile: true
    faq/*.md                # FAQ entries
  data/
    site.en.json           # hero, about intro, process steps, contact details (EN)
    site.pl.json            # same, Polish
  components/               # Header, Footer, Hero, ServiceCard, CookieBanner, Analytics
  layouts/BaseLayout.astro  # SEO meta, hreflang, Open Graph, structured data, global CSS
  pages/                    # EN pages at /, PL pages at /pl/*
netlify/functions/contact.js
public/
  admin/                   # Decap CMS UI + config.yml
  images/placeholder.png   # swap for real photos
  robots.txt
```

## Local development

```bash
npm install
npm run dev
```

## Testing the CMS locally (before Netlify is set up)

`/admin` uses the `git-gateway` backend, which only works once the site is deployed
on Netlify with Identity enabled. To try the CMS UI locally and have it write directly
to your local files (no Netlify, no login):

```bash
# terminal 1
npx decap-server

# terminal 2
npm run dev
```

Then open `http://localhost:4321/admin`. `local_backend: true` in `public/admin/config.yml`
makes Decap CMS talk to the proxy server on `localhost:8081` instead of git-gateway, and
saves are written straight to the matching files under `src/content/` and `src/data/`.
This flag is ignored once deployed - production still requires the Netlify Identity setup
described below.

## What still needs real values before launch

These are placeholders on purpose - fill them in once confirmed (brief section 12.1 / 12.4):

- `src/data/site.en.json` / `site.pl.json` &rarr; `meta.contactEmail`, `whatsappNumber`,
  `instagramUrl`, `facebookUrl`, `trainingLocation`.
- All `public/images/placeholder.png` references &rarr; real photos (hero, About, services,
  transformations). Update the matching `imageAlt` text too.
- `src/content/testimonials/kacper-own-story.md` &rarr; replace the lorem ipsum quote with
  Kacper's real story. Do not add client testimonials without signed consent
  (`consentOnFile: true` must be genuinely true, not just flipped for convenience).
- `src/pages/privacy.astro`, `cookies.astro`, `terms.astro` (and `/pl/` versions) &rarr;
  every section is lorem ipsum. Get real legal text reviewed before publishing - do not
  ship these as-is.
- `astro.config.mjs` &rarr; confirm `SITE_URL` is correct before building the sitemap.
- Level 4 Sports Nutrition: only mark as completed on the About page once the certificate
  exists (see comment in `src/pages/about.astro`).
- Pricing: intentionally not included anywhere. Add a `price` field to the services
  content schema (`src/content/config.ts`) once prices are decided.

## Setting up the contact form (backend)

The form posts JSON to `/.netlify/functions/contact`, which validates it and sends an
email via [Resend](https://resend.com).

1. Create a Resend account, verify the sending domain.
2. In the Netlify dashboard, set environment variables (see `.env.example`):
   `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`.
3. Spam protection: a hidden honeypot field (`company`) is checked both client-side and
   server-side. No CAPTCHA is wired up - add one (e.g. Turnstile) if spam becomes a problem.

To use a different email provider (SendGrid, Mailgun, SES) instead of Resend, only the
`sendEmail`-equivalent block inside `netlify/functions/contact.js` needs to change - the
rest of the validation logic stays the same.

## Setting up Decap CMS (client editing)

1. Enable **Netlify Identity** and **Git Gateway** on the Netlify site (Site settings →
   Identity).
2. Invite Kacper's email as a user under Identity.
3. He logs in at `kkcoaching.fit/admin`, edits content through forms, and saving commits
   directly to the `main` branch - which triggers a rebuild automatically.

## SEO / analytics checklist mapped to the brief (section 11)

- [x] Unique title + meta description per page (`BaseLayout` props)
- [x] One `<h1>` per page
- [x] hreflang EN/PL on every page
- [x] Open Graph tags
- [x] `sitemap.xml` via `@astrojs/sitemap` (generated at build)
- [x] `robots.txt`
- [x] `LocalBusiness` structured data on both homepages
- [x] Cookie banner gates GA4 until consent (`CookieBanner.astro` + `Analytics.astro`)
- [ ] GA4 property ID &rarr; fill in `Analytics.astro` (`GA_MEASUREMENT_ID`)
- [ ] Google Search Console &rarr; verify once deployed
- [ ] Meta Pixel &rarr; brief says not yet, only when ads launch

## Accessibility

- Skip-to-content link, visible focus outline, labelled form fields, `aria-live` status
  on the contact form, `aria-hidden`/`tabindex="-1"` honeypot field.
- Colours meet WCAG AA contrast at the sizes used - re-check after any palette change.
