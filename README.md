# KK Coaching &mdash; kkcoaching.fit

Static frontend (Astro) + Decap CMS (client-editable content) + a serverless contact
form function. Built against `KK_Coaching_Brief_Strony_Internetowej_260806_150135.pdf`.
Production website: https://kkcoaching.fit. Changes require review before merging or deploying.

## Stack and technology

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
    admin-v2.json          # canonical shared/home/contact CMS data
    services-v2.json       # canonical service cards (EN/PL)
    pricing.json           # standard prices and billing periods
    promotions.json        # time-limited offers and eligibility
    site.en.json           # generated locale copy plus retained metadata (EN)
    site.pl.json            # same, Polish
  components/               # Header, Footer, Hero, ServiceCard, CookieBanner, Analytics
  layouts/BaseLayout.astro  # SEO meta, hreflang, Open Graph, structured data, global CSS
  pages/                    # EN pages at /, PL pages at /pl/*
netlify/functions/contact.js
public/
  admin/                   # Decap CMS UI + config.yml
  images/                  # approved photos and service artwork
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

## Content sources and verification

`npm run admin:sync` runs before development/build and writes locale data,
service Markdown and CMS configuration. Edit the canonical JSON source rather
than generated Markdown or locale fields that the sync replaces. Service detail
copy lives in `service-details-v2.json`, `online-v2.json`, `hybrid-v2.json` and
`training-plan-v2.json`. Home SEO comes from `admin-v2.json`; the final English
PT meta description currently also has a dedicated finalizer.

`pricing.json` contains standard fees. `promotions.json` controls current offer
eligibility/date windows; components and finalizers apply the promotional prices.
Verify both rendered HTML and JSON-LD after all build steps. Expired offers are
omitted from fresh builds. The scheduled refresh requires secure production
configuration; see [expiry behaviour, activation and rollback](docs/promotion-expiry-fix-2026-10-16.md).

Preserve real testimonials and consent records. Publish credentials only when
substantiated; the Level 4 qualification must not be marked complete without its
certificate. JD Gyms Cwmbran is the training venue, not a KK Coaching-owned office
or gym. Never add a private residential address.

## Checks

```bash
ASTRO_TELEMETRY_DISABLED=1 npm run build
npm test
```

The build runs SEO and promotion audits on final output. Tests cover mocked-only
contact submissions/analytics, reciprocal EN/PL metadata and sitemap integrity,
and reviews/consent/rating rules. No test sends enquiries, email or GA events.
`npm test` needs a completed build; there is no separate lint script.

The build can change tracked generated files. Review that diff and keep unrelated
regenerated content out of a scoped PR. The October 2026 audit and roadmap are in
[docs/growth-audit-2026-10-13.md](docs/growth-audit-2026-10-13.md).

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
- [x] `sitemap-index.xml` via `@astrojs/sitemap`; legacy `sitemap.xml` redirects
- [x] `robots.txt`
- [x] Organization, Person and separate training-venue Place structured data
- [x] Cookie banner gates GA4 until consent (`CookieBanner.astro` + `Analytics.astro`)
- [x] GA4 configured in `Analytics.astro`; `generate_lead` on successful form delivery
- [x] Search Console connected; GA4 link/key event confirmed by owner
- [ ] Meta Pixel &rarr; brief says not yet, only when ads launch

## Accessibility

- Skip-to-content link, visible focus outline, labelled form fields, `aria-live` status
  on the contact form, `aria-hidden`/`tabindex="-1"` honeypot field.
- Re-check contrast and keyboard behaviour after changes; source inspection alone does not establish WCAG compliance.
