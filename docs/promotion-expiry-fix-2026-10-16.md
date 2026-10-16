# Promotion expiry fix — 16 October 2026

This change addresses the production audit of commit `b3c12ca83905e1f528f21ac023960c57015db8fe`. The audit found that grid declarations overrode `hidden`, expired offers remained in newly generated HTML, and old static plan schema retained the October price after expiry.

## Behaviour

- A shared `Europe/London` calendar rule is used by server rendering, client expiry, audits and the scheduled refresh function. Start and end dates are inclusive. GMT/BST conversion is handled by `Intl`; no fixed UTC offset is assumed.
- In an October build, the existing three homepage cards appear once, in their existing order, with the existing terms, prices and EN/PL destinations. The eligible plan Service Offer remains £24; the standard catalogue stays £30.
- A build dated 1 November omits the October promotional article, price branches and notes entirely. They are not merely hidden. Plan schema is £30. Both permanent offers remain available and unmodified.
- The global `hidden` rule wins over grid/flex styling. A single browser module handles cached October pages, switches to standard pricing and updates the plan Service Offer in rendered JSON-LD. It runs on load, once per minute and when the tab becomes visible. An open tab therefore handles midnight without reloading. This does not rewrite the original server response.
- Standard pricing, promotion configuration, terms, eligibility, checkout URLs, SEO metadata, canonical/hreflang rules, service content and business/venue definitions are unchanged.

## Automatic production refresh and release prerequisite

`npm run build` emits `/promotion-state.json` after the static finalizers. It records the build instant, London date and active offer IDs. The JSON response is no-store/noindex; it contains no secrets. The final audits check output against this build state.

`netlify/functions/promotion-refresh.js` is scheduled at minute 5 of every UTC hour. Netlify Scheduled Functions run on published production deployments, not deploy previews. The function calculates the current London offer set and compares it with the published manifest, bypassing cache. It requests a build only when the sets differ. Once the refreshed deployment is published, subsequent checks do nothing. A rejected hook or failed build leaves the old manifest in place, so a later hourly invocation retries. Requests have timeouts and hook failures do not log the secret URL.

**Automation is implemented but deliberately disabled unless configured. No production setting or deployment was changed in this task.** Before the separately approved production release:

1. In the existing Netlify project, reuse an appropriate existing build hook for branch **main**, or create one if necessary. Do not create a hook targeting a preview branch. This preparation does not require invoking it.
2. Securely set `PROMOTION_BUILD_HOOK_URL` to that hook URL in Netlify's **Functions** environment scope, for production. Never commit it or paste its value into chat or CI output. The function accepts only HTTPS `api.netlify.com/build_hooks/<id>` destinations.
3. Set production Functions variable `PROMOTION_REFRESH_ENABLED=true`. Leave it absent/false to keep refresh disabled.
4. Review and explicitly approve the production deployment separately. The first published deployment must contain both this function and its manifest. Verify the manifest and scheduled-function registration in Netlify. Do not invoke the real hook as a test without deployment approval.
5. Monitor function/build failures and confirm the first expiry refresh. A successful mocked test is not evidence that production credentials or scheduling have been activated.

For the current offer, the normal first refresh check after expiry is **1 November 2026 at 00:05 Europe/London**, followed by build/publish time. In summer the same hourly UTC schedule covers London midnight without a hardcoded offset. Scheduler delays or build failures can extend this window; raw/no-JS HTML remains the previous static artifact until successful publication. The browser safeguard protects JS-rendered pricing/schema during that interval. This is not a guarantee of instantaneous server-side removal at exactly midnight. Once activated, no person needs to remember the expiry rebuild.

The new scheduled mechanism only checks promotion state; it does not edit content, prices or Git, submit IndexNow requests, or poll a paid service. No real build hook was called during verification.

## Regression commands

Use an audit copy to avoid `admin:sync` overwriting tracked generated data in a development checkout:

```bash
npm ci
PROMOTION_TEST_INSTANT=2026-10-31T23:59:59Z \
NODE_OPTIONS=--require=./tests/support/freeze-build-clock.cjs \
ASTRO_TELEMETRY_DISABLED=1 npm run build
npm test
npx playwright install chromium
npm run test:browser
```

Repeat in a separate copy with `PROMOTION_TEST_INSTANT=2026-11-01T00:00:00Z`. The override is a test-only Node preload; production code does not read it. CI runs both dates on Node 20, including the complete production build/SEO/promotion pipeline and browser preview. If using an already installed Chromium locally, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable.

The browser suite exercises EN/PL home, services, PT, online, hybrid and plan pages at 390px/1440px, with the artifact's build date and a 1 November browser clock. It checks computed visibility, permanent offers, destinations, multiplicity/order, current plan schema, H1, overflow and uncaught errors. Initial HTML is also tested with JavaScript disabled. An October-only test keeps a plan tab open across midnight. External traffic is blocked, so tests do not send leads, analytics or purchases. This is browser verification of a running static preview, not a claim about field Core Web Vitals or production function activation.

`npm test` includes London/DST boundary and mocked scheduler tests, static HTML/schema checks and temporary negative injections. Duplicated trial/taster cards, deleted permanent records, taster expiry, wrong trial checkout language and a wrong plan schema price are rejected. A November run additionally injects expired markup and verifies rejection. Injection files are restored and the temporary copy is removed.

## Separate secondary findings

`/index.html` and `/pl/index.html` currently return 200 with canonical hints to the homepages. An optional, separate PR could add explicit 301 aliases in `netlify.toml`, with redirect/loop tests. There is no demonstrated wrong Google-selected canonical requiring a risky URL change in this fix.

Repeated `@id` entity definitions remain compatible graph fragments, with older representational differences. Consolidating them is a separate maintenance task, not an established ranking defect. This PR leaves business/venue/schema identity and the standard-price catalogue untouched. It changes only the existing plan Service Offer's date-dependent price, including the cached-page safeguard.

## Rollback

Before release, decline/close the PR; production is unchanged. After an approved release, set `PROMOTION_REFRESH_ENABLED=false` to stop automatic refresh requests, then use an explicitly approved Netlify rollback if the application change must be reverted. Do not change prices or permanent offer data as a rollback. Rolling back to the audited commit reintroduces the expiry defect; remove/disable the scheduler before restoring an older artifact without a manifest, and treat that rollback as temporary. Corrective rollout/rollback itself still requires deployment approval.

## Validation evidence

The implementation was tested against isolated builds dated 31 October and 1 November. The full build, existing contact/SEO/reviews suites, expanded promotion audits, static schema checks and negative tests pass. Browser previews passed **53 tests for the October artifact and 28 for the November artifact**, with no skips or failures. Both date builds passed **20 contact tests and 15 date/scheduler tests**, plus the SEO integrity/reviews suites. The negative suite rejected 7 faults on October output and 8 on November output. The one existing PL services title-length warning remains; metadata was not rewritten to chase a score.

All 30 public pages were compared with the audited production baseline: title, description, H1, canonical and robots values are unchanged on both simulated dates. Production pricing and promotion JSON files are byte-identical to the base commit. A local packaging check using Netlify's `@netlify/zip-it-and-ship-it` verified that the shared helper and configuration are included and the packaged handler can request a mocked rebuild. No live function or hook was invoked.

Raw local artifacts are retained outside Git at `/workspace/expiry-fix-validation/` (date-specific build/test/browser logs, generated HTML and metadata comparison). These are current-machine artifacts, not a promise of retention in a new task.
