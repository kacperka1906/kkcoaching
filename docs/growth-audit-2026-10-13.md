# KK Coaching growth audit and review roadmap

Audit date: 13 October 2026 (Europe/London). Repository: `kacperka1906/kkcoaching`; website: https://kkcoaching.fit. Feature branch: `feat/evidence-based-growth-audit`. No merge, production deployment, real form submission, external profile change or outreach is authorised or performed.

## Executive assessment

The site already has a sound technical foundation and useful commercial pages. No critical/high technical SEO defect was confirmed. The strongest immediate engineering improvement is to prevent repeat contact submissions from creating duplicate email notifications and lead events, with strict validation of malformed enquiries. Those defects were reproduced locally and fixed in both languages. Browser evidence additionally justifies limited accessibility fixes; their final results are recorded below.

The homepage and Cwmbran PT page serve distinct useful purposes. There is no convincing evidence of harmful cannibalisation. Preserve both destinations, current metadata and existing contextual links. Growth now needs reliable lead measurement, accurate public business signals and practical owner-verified purchasing information more than a large SEO rewrite. No ranking, conversion-rate or AI-recommendation uplift has yet been measured.

## Baseline, access and rollback

- Initial branch `work`, clean working tree, commit `e51c747b4b1ef799fe2c5682d36e7b264f56679c` (13 October). Recent commits already preserve contact intent/add PT links and fix pricing, online commitment and expired September offers. No uncommitted user work was overwritten.
- Astro 4, static generation, EN default and PL routes, canonical `https://kkcoaching.fit`, trailing slashes. `netlify.toml` publishes `dist`, runs `npm run build`, and defines contact functions, security/cache headers, legacy-image redirects, sitemap redirect and real 404 fallback. GitHub PR build workflow exists; only main pushes run IndexNow.
- Build pipeline: CMS sync → Astro → HTML/home/PT metadata finalizers → resource visibility → URL normalization → SEO/promotion audits. Inspect final `dist`, not intermediate Astro HTML.
- Initial `npm run build` failed because Astro telemetry attempted to write outside the workspace. `ASTRO_TELEMETRY_DISABLED=1 npm run build` passed. This is an execution-environment limitation, not a website defect. Initial reviews regression passed. There is no configured lint script.
- Build scanned 31 HTML files including CMS admin; public audit counted 30 pages, 24 indexable (12 EN/12 PL). One nonblocking warning: Polish services title 69 characters. Character count is not a fixed Google display limit and does not justify a rewrite.
- CMS sync writes 11 tracked generated files, including locale data, service Markdown and admin config. Their unrelated build drift was reviewed and restored to the clean baseline after validation. Canonical inputs were not altered.
- Direct production HTTP/header access is denied by network destination policy (proxy HTTP 403). Web connector searches/page extracts are available but have uncertain freshness: they include September promotion text absent from current source. This is a verification gap, not proof of deployed expired offers. No field CWV, live Netlify headers/function execution, deployment revision, GBP management, live GA4 report or independent qualification documentation was inspected.
- Rollback: abandon the unmerged branch to retain the baseline. If later approved and merged, revert this PR's commit(s), rebuild and verify the same checks; do not change prices, routes or schema as part of rollback. Tests themselves make no external requests.

## Canonical source map

| Concern | Current source / generated output |
|---|---|
| Home/shared CMS copy and SEO, nav, contact and location | `src/data/admin-v2.json`; `scripts/sync-admin-v2.mjs` writes locale JSON; `scripts/finalize-home-seo.mjs` applies final home metadata |
| Service cards | `src/data/services-v2.json`; `scripts/sync-services-v2.mjs` generates service Markdown |
| Service detail copy | `src/data/service-details-v2.json`, `online-v2.json`, `hybrid-v2.json`, `training-plan-v2.json`; corresponding EN/PL pages |
| Standard prices/billing | `src/data/pricing.json`; `ServicePricing.astro` and `ServiceCard.astro`; plan pages/finalizers |
| Promotions | `src/data/promotions.json`; `Promotions.astro`, service cards/pricing and finalization; London date windows |
| Canonical/alternate/robots/social metadata | `BaseLayout.astro`, route props, `scripts/normalize-public-urls.mjs`; EN PT description also overridden by `set-personal-training-meta-description.mjs` |
| Entity/service schema | `BusinessEntity.astro`, `TrainingLocation.astro`, `AuthorProfilePageSchema.astro`, individual pages and finalizers |
| Lead form/email/analytics | EN/PL `contact.astro`, `netlify/functions/contact.js`, `Analytics.astro`, `CookieBanner.astro` |
| Reviews/transformations | `admin-v2.json` reviews, reviews components; approved testimonial Markdown and consent records |

The unused `TrainingPlanPage.astro` component must not be confused with the active EN/PL plan pages when auditing prices.

## Search evidence and homepage/PT decision

Read-only Search Console API calls reconfirmed the supplied 13 September–10 October 2026 baseline: **22 clicks, 347 impressions, CTR 6.34%, position 15.85**. Homepage: 8/97/5.27; local PT: 6/50/11.72; online: 4/83/12.41; training plan: 0/81/36.31 (clicks/impressions/position).

The exact query `personal trainer cwmbran` has homepage 14 impressions/0 clicks/position 7.86, and PT page 2/0/23. Only 16 impressions across two URLs do not establish a persistent problem. Page totals cover different query mixes and cannot be used to infer query-level clicks; anonymised queries prevent simple query/page reconciliation.

1. The homepage is relevant to local training and has a wider brand/hub role. Stronger accumulated authority or normal ranking variation could explain its selection; backlink authority was not measured.
2. No convincing harmful competition is established. Self-canonicals, distinct H1s, search intent and indexing signals are healthy.
3. Existing header/footer/service/location/about/results links already lead to PT. Adding repetitive anchors is unjustified.
4. Rewriting titles/H1s or stripping local relevance from the homepage risks useful visibility without a demonstrated benefit. No URL, canonical, hreflang or positioning changes are proposed for implementation.
5. Minimal intervention: preserve these roles, fix demonstrated enquiry/accessibility defects, and monitor query/page allocation and qualified enquiries over longer windows. Success means useful visits/leads, not forcing one URL to rank.

Live competitor research covered all requested query families. [The sourced research report](local-search-research-2026-10-13.md) compares local coaches, gym PT pages, adjacent group training and directories. Sources include [mvlifefit PT](https://www.mvlifefit.co.uk/personal-training), [Nuffield Cwmbran](https://www.nuffieldhealth.com/gyms/cwmbran/services/personal-training), [Nicola Doble](https://www.yourpersonaltraininguk.co.uk/trainers/nicola-doble), [Sugar Rogue](https://www.sugarrogue.fit/training), [SPT Wales](https://sptwales.uk/) and [Gower Training](https://www.gower-training.com/). These are source observations, not verified geolocated Google rankings, Maps positions, search volumes, backlink counts or market shares. Competitor policies/prices are never adopted as KK facts.

## Confirmed findings and prioritised action register

Cost estimates describe implementation effort, not financial quotations. No ranking effect is assumed.

| Action / status | Evidence and affected files or URLs | Severity / expected impact | Cost / risk / confidence | Validation |
|---|---|---|---|---|
| Prevent repeat submit — implemented | EN `src/pages/contact.astro`, PL equivalent: pending mocked fetch plus two rapid submits produced two requests and two lead events before fix | Medium; cleaner inbox and measurement; avoids repeated enquiry | Small / low / high | Both languages, every intent, concurrent submit and extra submit before redirect: one request/event; failed request permits retry |
| Validate request shape/required fields/consent — implemented | `netlify/functions/contact.js`: JSON null threw; whitespace name, object phone and consent string `false` reached mocked email provider | Medium validation gap; null crash low severity; reject malformed/nonaffirmative enquiries | Small / low / high | Null/scalars/arrays/invalid JSON return 400; nonempty string fields required; browser checkbox `on` and boolean true retained |
| Fix measured contrast and visible language labels — implemented | `BaseLayout.astro`, `Header.astro`: dark red small text 2.37:1 on dark sections/nav; `ServiceCard.astro`, `ServicePricing.astro` standard prices below 4.5:1; `ContactMethods.astro` small labels 3.81:1; EN/PL switch label lacked visible abbreviation | Medium accessibility barriers; clearer small text and voice-control targets | Small / low, scoped colour adjustments / high | Before/after axe at mobile/desktop, EN/PL; retain existing pale brand tint and global button colours |
| Add integrity regressions — implemented | Existing audit checked alternate presence/targets but not full reciprocity or reverse sitemap exclusion; `scripts/test-seo-integrity.mjs`, `tests/contact.test.cjs`, package/workflow | Low prevention; protects bilingual routes, venue representation and lead flow | Small / low / high | Final HTML checks + mocked contact suite + existing review tests in PR CI |
| Correct stale maintenance documentation — implemented | `docs/jd-qr-route.md` falsely described 302; README claimed no prices/GA setup/no deployment | Low; avoids future routing/config regressions | Small / low / high | Compared docs with actual JD route, pricing, analytics and build pipeline |
| Refresh static offers after expiry — recommendation | Promotions/pricing components and plan schema evaluate build date; browser hiding cannot refresh static HTML/JSON-LD | Medium future operational risk; avoids stale eligibility/prices for crawlers/non-JS visitors | Small scheduled operational task / production approval required / high | Owner-approved rebuild after 31 October, then inspect EN/PL visible prices and schema without JS |
| Clarify generic plan catalog pricing — recommendation before schema edit | `BusinessEntity.astro:70–78` global standard £30 Offer; active plan-page Service Offer £24. Standard £30 is visible honestly too | Low ambiguity; clearer standard vs new-client eligibility | Small / schema review risk / high evidence, medium benefit | Review removing catalog price or explicit eligibility; confirm against current offers in EN/PL final output |
| Verify booking/expiry/cancellation/onboarding details — owner input | PT already answers location/membership/beginners/prices, but block validity and rescheduling policy are not explicit | Medium potential purchase confidence; conversion effect unknown | Small content work / factual risk if invented / medium | Owner provides actual policy; bilingual review, natural FAQs, no copied competitor terms |
| Preserve interest during contact language switch — recommendation | Header uses static alternate path, dropping `?interest=pt` etc. on EN↔PL contact switch | Low; continuity/attribution for switching visitors | Small / low / high | Allowlist only service intent query; test both directions and unknown values |
| Improve menu focus entry and footer heading order — recommendation | `Header.astro` menu links precede toggle; forward Tab after opening proceeds past menu. `Footer.astro` H4 headings follow page H2 | Low accessibility/navigation polish; menu Enter/Escape already works | Small / interaction review / high | Keyboard walkthrough with sensible menu focus and return; semantic heading review without visual redesign |
| Label transformation modality — recommendation | PT page uses genuine Aneta case, canonical testimonial identifies Online Coaching; PT cards omit modality | Low; more precise service proof | Small / content review / medium | Add only verified labels/context in both languages; preserve genuine testimonial/consent |
| Consolidate metadata/entity data later — recommendation | EN PT hardcoded final description differs from CMS social/schema descriptions; shared Facebook metadata differs from admin; schema slashless URLs | Low maintenance; no present indexing defect | Medium / schema-ID and content risk / medium | Trace all consumers, preserve intent/IDs, post-build checks; avoid unrelated refactor |

## Technical, content, entity and AI-search audit

Confirmed healthy in final HTML: all indexable pages have one H1, unique titles/canonicals, description/robots/social metadata; canonical origin/trailing slashes match final routes. Reciprocal EN/PL/x-default alternates and sitemap completeness/exclusions pass. No broken internal page destinations or commercial orphan detected. Resources are intentionally unpublished and removed after build. Thank-yous, JD campaign, 404 and review previews are noindex and absent from sitemap. Source config has genuine 404 handling and legacy redirects; live status codes remain unverified.

JSON-LD parses on all pages. Organisation/Person identify KK Coaching/Kacper; services refer to the independent business; JD Gyms is a separate Place. The venue address is public gym information, not a residential address or KK premises. Credentials match existing visible site claims, but certificates were not independently inspected. [JD Gyms' own Cwmbran page](https://www.jdgyms.co.uk/gym/cwmbran/) supports the venue relationship/location; its gym hours are not coaching hours. No fabricated rating/reviews, LocalBusiness rewrite or endorsement claim was added. Full Rich Results/schema.org validator coverage was not obtained.

Standard pricing is preserved: PT £30 single, £114/4, £216/8, £300/12; online £80 per four weeks with no minimum commitment; hybrid £160/4 PT and £240/8 PT per four weeks; plan £30 one-off. Verified October promotion is 20% off first purchase/period for eligible new clients through 31 October; separate free taster. Active plan page schema £24 is already correct. No prices/offers changed.

Commercial pages explain differing support, personalised training, pricing and billing, practical nutrition scope, venue/membership and next steps. Genuine stories/reviews support trust. EN/PL content is meaningfully aligned; new generic FAQs or city doorway pages would add little. Plan visibility is weak in the tiny baseline, but zero clicks is insufficient evidence to rewrite its intent or chase broad informational keywords.

Accessible static HTML, named entities, clear practical answers and accurate services support established search practice and machine understanding. Credible off-site corroboration remains an owner task. Existing `public/llms.txt` is experimental and partly less detailed than current service copy; no new AI crawler files/markup were introduced, and no AI inclusion guarantee is claimed.

## Conversion, analytics and security

All five service intents (`pt`, `online`, `hybrid`, `training-plan`, `taster`) preselect correctly in EN/PL. Invalid URLs fall back to direct. Direct → `unsure` remains direct; changing selected interest retains original intent separately in JSON, lead email and GA parameters. Native form validation/status messaging/honeypot and separate WhatsApp/email paths exist.

Only successful form delivery emits `generate_lead`; thank-you pages do not duplicate it. GA injects once after accepted analytics consent. Visitors declining analytics can still enquire; therefore GA totals will not equal all real enquiries. Mocked call counts establish browser behaviour, not guaranteed collection by Google. Client submission locking is not server idempotency against API replay or ambiguous network retries; monitor actual duplicates before adding a store/provider.

Handler uses HTML escaping, value caps, intent allowlists and POST-only handling. No plaintext credential was added or exposed. Netlify source has `nosniff`, SAMEORIGIN, referrer/permissions policies, admin no-store/noindex and immutable Astro asset caching; response headers were not verified. Hosting abuse controls, log retention and durable rate limits are unknown. Honeypot is present; add complexity/new external services only if observed abuse warrants it and separately approved.

## Roadmap and owner actions

**Immediate:** review the scoped PR and accessibility evidence; independently check current deployed revision/offers/headers. Keep the known internal lead test excluded. Inspect the existing GBP/citations and accurate venue/contact representation; do not create duplicate profiles or automatically use the gym as a KK storefront. Arrange the separately approved promotion-expiry rebuild.

**Next 30 days:** publish only verified booking/expiry/cancellation and consultation logistics, align EN/PL; check qualification evidence/current genuine photos; verify eligible GBP category/name/contact/service area/availability against actual operations. Request authentic client feedback without incentives or gating. Investigate language-switch intent continuity and accurate transformation modality labels.

**Next 90 days:** review rolling query/page and qualified-lead data, then prioritise one substantial consented PT/local case study if evidence exists. Explore legitimate gym trainer listings/local relationships with agreement and truthful descriptions. Assess better content only where enquiries/search data reveal a real unanswered need; avoid bulk city pages, generic AI posts, paid directory sprawl or fabricated reviews.

Google's [local ranking guidance](https://support.google.com/business/answer/7091) describes relevance, distance and prominence. Its [business representation rules](https://support.google.com/business/answer/3038177) require accurate real operating circumstances. Check eligibility for a trainer at another venue; online UK service availability alone does not establish a service-area GBP. Never publish a private address or borrow gym hours. All profile/review/citation/outreach actions remain with the owner; none were executed.

## Measurement plan

Retain the verified baseline; after any approved deployment record revision/date and annotate engineering changes. Review weekly raw counts and comparable 28-day periods alongside rolling 90-day trends; do not infer causality from a handful of impressions/leads.

- **Qualified organic enquiries:** reconcile genuine inbox enquiries with GA consented conversions and landing-page attribution; define qualified as an authentic prospect for an offered service, excluding spam, duplicate messages and internal tests. No personal data belongs in GA events.
- **Real `generate_lead`:** exclude the confirmed internal test (direct/unsure, recorded on 13 October) and all future internal tests in a reporting reconciliation. Existing key event/custom dimensions are preserved; no duplicate events/dimensions created. Historical tests are not magically removed by source edits.
- **Landing-page organic traffic/conversion:** GA organic sessions and real consented leads for home/PT/services/online/hybrid/plan, EN/PL separately; show numerator/denominator and consent limits.
- **Nonbranded local queries:** GSC Cwmbran/Torfaen training/coaching impressions/clicks and exact query by page; separate brand variants. Use longer trends, not single-day ranks. Query anonymisation and query mix affect totals/average position.
- **Service demand:** original `lead_intent` versus final `interest`, preserving direct/unsure; conversion by service interest only with adequate counts. New custom dimensions need processing time and should not be assumed to backfill historical reports.
- **Contact interactions:** existing `consultation_start`, `cta_click`, `whatsapp_click`, phone/email events are intent signals, not completed enquiries. Confirm real WhatsApp leads separately; avoid double-counting an enquiry also sent through the form.

No business uplift can be reported until deployment is separately approved and enough subsequent data exists.

## Validation and adversarial review

Initial build/SEO/promotion/reviews checks passed as above. New mocked contact suite passed 20 tests; SEO integrity checks passed all 30 public pages/24 indexable URLs/eight service destinations. Four temporary fault injections rejected broken reciprocal alternates, noindex sitemap inclusion, wrong service provider and assigning venue premises to the business. All test emails/GA calls are local stubs. Final build, browser/a11y details and PR status are recorded in the completion section below.

Adversarial review: no duplicate analytics setup, homepage weakening, new competing local pages, unsupported business claims, prices/offers/routes/schema changes or lost EN/PL intent. Scope is deliberately small. The measurable engineering result is fewer duplicate requests/events in controlled tests and controlled rejection of bad requests, not a promised organic uplift. Automated accessibility checks and local performance estimates are limited; remaining issues are documented for review. New tests use existing tools/dependencies and no paid services.

## Completion evidence and changed-file inventory

Final `ASTRO_TELEMETRY_DISABLED=1 npm run build` passed the existing SEO and promotion audits with the same one PL title-length warning. `npm test` passed 20 contact tests, all rendered SEO integrity checks and the existing reviews regression. `git diff --check` passed. Build-generated drift was again restored; no canonical data/price/promotion files are in this PR.

Chromium checks covered home/PT/contact/services EN and PL, each at 390px and 1440px: 16/16 had one H1, no document overflow and no uncaught JS errors. Before fixes, axe reported repeated contrast and label-content failures; after the scoped changes, all 16 views had zero findings in the tested WCAG 2 A/AA and 2.1 A/AA axe rules. This is automated coverage, not a full WCAG certification. Footer heading order and mobile menu focus entry remain documented recommendations.

Six baseline mobile Lighthouse runs scored performance 97–98, accessibility 95–96, SEO 100 and best practices 96; LCP 1.3–1.7 seconds, TBT 0ms, CLS 0.087. These local results are optimistic because the plain static server lacks Netlify image transformations/rewrite handling (including hero and logos); they do not establish live field LCP/INP/CLS. Final accessibility-only Lighthouse reruns improved to 98–99, with the footer heading-order finding remaining. There is no measured field INP. See [browser evidence](browser-qa-2026-10-13.md) for individual rows and final accessibility rerun details.

Changed application files: EN/PL `src/pages/contact.astro` and `netlify/functions/contact.js` (submission/validation); `src/layouts/BaseLayout.astro`, `src/components/Header.astro`, `ServiceCard.astro`, `ServicePricing.astro`, `ContactMethods.astro` (scoped text contrast and accessible labels). Changed verification: `tests/contact.test.cjs`, `scripts/test-seo-integrity.mjs`, `package.json`, `.github/workflows/seo-build.yml`. Documentation: README, JD route correction, this report, sourced local research and browser report. No third-party or paid runtime dependency added.

Local full-page screenshots, before/after raw browser results and build/test logs are preserved outside the repository at `/workspace/audit-artifacts/kkcoaching/`; the reviewable reports are committed in `docs/`. Images affected by Netlify transformations are incomplete in these screenshots and require live verification. Production headers/GBP/GA collection freshness remain explicitly unverified. The feature branch targets unchanged remote main `e51c747`; the final unmerged PR is linked in the task completion response.
