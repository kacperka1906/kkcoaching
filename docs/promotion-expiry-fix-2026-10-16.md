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

`netlify/functions/promotion-refresh.js` is scheduled at minute 5 of every UTC hour. Netlify Scheduled Functions run on published production deployments, not deploy previews. The function calculates the current London offer set and compares it with the published manifest, bypassing cache. It requests a build only when the sets differ. Once the refreshed deployment is published, subsequent checks do nothing. An unsuccessful build leaves the old manifest in place. To limit repeated paid/build-consuming requests during an outage, the function permits automatic rebuild requests only at London hours **00, 01, 03, 06, 12** on the first day when the published offer IDs become stale, then **once per following London day at hour 00**. The UTC hourly schedule still performs lightweight state checks, but outside these retry windows it does not call the build hook. A retry is not a guarantee of build completion. The gate is stateless and is **not** a hard request quota for manually duplicated invocations. Requests have timeouts; hook failures do not log the secret URL. Invalid or future-dated manifest dates fail closed without a build request.

**Automation is implemented but deliberately disabled unless configured. No production setting or deployment was changed in this task.** Before the separately approved production release:

1. In the existing Netlify project, reuse an appropriate existing build hook for branch **main**, or create one if necessary. Do not create a hook targeting a preview branch. This preparation does not require invoking it.
2. Securely set `PROMOTION_BUILD_HOOK_URL` to that hook URL in Netlify's **production** environment context, with access available to **Functions**. On Netlify **Free**, use the default **All scopes** (the ability to select only Functions scope is available on higher plans); do not look for a Functions-only selector on Free. Never commit it or paste its value into chat or CI output. The function accepts only HTTPS `api.netlify.com/build_hooks/<id>` destinations.
3. Set `PROMOTION_REFRESH_ENABLED=true` in the **production** environment context, likewise available to Functions (All scopes on Free). Leave it absent/false to keep refresh disabled. Store the actual secret only in Netlify's environment-variable UI, never in Git or messages.
4. Review and explicitly approve the production deployment separately. The first published deployment must contain both this function and its manifest. Verify the manifest and scheduled-function registration in Netlify. Do not invoke the real hook as a test without deployment approval.
5. Check that the main-branch production deploy actually contains the new Trial/Taster offers and the expected October offer before activating the expiry refresh. Inspect both EN and PL pages (including the original page source) and verify `https://kkcoaching.fit/promotion-state.json` responds with the published active offer IDs and no-store/noindex headers. Verify the production URL and Netlify deployment identifier are in sync; a green Deploy Preview alone is insufficient.
6. After an owner-approved merge to `main`, check the GitHub Actions **Production release smoke** workflow. It polls production read-only for up to about six minutes, checking EN/PL homepage cards, trial/taster destinations, contact forms, current training-plan structured-data prices, published `promotion-state.json`/cache headers, robots and sitemap. A red run means **do not consider production verified**; investigate the deploy before marketing the new offer. The workflow never submits enquiries, sends mail or triggers Netlify builds.
7. Monitor function/build failures and confirm the first expiry refresh. Inspect build logs if the manifest remains stale at 00:05/01:05 after expiry, and confirm the eventual new HTML (including no-JS) removes the October promotion and sets the plan structured-data price back to £30. A successful mocked test is not evidence that production credentials or scheduling have been activated.

For the current offer, the normal first refresh check after expiry is **1 November 2026 at 00:05 Europe/London**, followed by build/publish time. If the published October state remains stale, additional first-day retries may occur at **01:05, 03:05, 06:05 and 12:05 London**, then **00:05 London on subsequent days**. In summer, the same hourly UTC scheduler and the London-hour gate cover local midnight without a hardcoded offset. Scheduler delays or build failures can extend this window; raw/no-JS HTML remains the previous static artifact until successful publication. The browser safeguard protects JS-rendered pricing/schema during that interval. This is not a guarantee of instantaneous server-side removal at exactly midnight. Owners should check the Netlify build history and published manifest after expiry; do not assume a hook request means the new build reached production.

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

`npm test` includes London/DST boundary tests, a bounded retry-window / invalid-manifest / mocked scheduler suite, static HTML/schema checks and temporary negative injections. Duplicated trial/taster cards, deleted permanent records, taster expiry, wrong trial checkout language and a wrong plan schema price are rejected. A November run additionally injects expired markup and verifies rejection. Injection files are restored and the temporary copy is removed.

## Separate secondary findings

`/index.html` and `/pl/index.html` currently return 200 with canonical hints to the homepages. An optional, separate PR could add explicit 301 aliases in `netlify.toml`, with redirect/loop tests. There is no demonstrated wrong Google-selected canonical requiring a risky URL change in this fix.

Repeated `@id` entity definitions remain compatible graph fragments, with older representational differences. Consolidating them is a separate maintenance task, not an established ranking defect. This PR leaves business/venue/schema identity and the standard-price catalogue untouched. It changes only the existing plan Service Offer's date-dependent price, including the cached-page safeguard.

## Rollback

Before release, decline/close the PR; production is unchanged. After an approved release, use an explicitly approved Netlify rollback if the application change must be reverted. Set `PROMOTION_REFRESH_ENABLED=false` for the next function deployment; a Netlify variable edit may require redeployment and must not be assumed to update a running function immediately. For an immediate pause before that deployment, revoke a dedicated refresh build hook (do not disrupt a hook shared with other workflows), and inspect/cancel any already queued refresh builds as part of the approved rollback. Do not change prices or permanent offer data as a rollback. Rolling back to the audited commit reintroduces the expiry defect; remove/disable the scheduler before restoring an older artifact without a manifest, and treat that rollback as temporary. Corrective rollout/rollback itself still requires deployment approval.

## Validation evidence

The implementation was tested against isolated builds dated 31 October and 1 November. The full build, existing contact/SEO/reviews suites, expanded promotion audits, static schema checks and negative tests pass. Browser previews passed **53 tests for the October artifact and 28 for the November artifact**, with no skips or failures. Both date builds passed **20 contact tests and 15 date/scheduler tests**, plus the SEO integrity/reviews suites. The negative suite rejected 7 faults on October output and 8 on November output. The one existing PL services title-length warning remains; metadata was not rewritten to chase a score.

All 30 public pages were compared with the audited production baseline: title, description, H1, canonical and robots values are unchanged on both simulated dates. Production pricing and promotion JSON files are byte-identical to the base commit. A local packaging check using Netlify's `@netlify/zip-it-and-ship-it` verified that the shared helper and configuration are included and the packaged handler can request a mocked rebuild. No live function or hook was invoked.

Raw local artifacts are retained outside Git at `/workspace/expiry-fix-validation/` (date-specific build/test/browser logs, generated HTML and metadata comparison). These are current-machine artifacts, not a promise of retention in a new task.

## Finishing quality gate and maintenance pause

Before granting permission to merge/deploy, confirm the most recent PR HEAD has green **Build and SEO audit** and **Promotion expiry regressions** (both controlled date jobs), and a ready Deploy Preview. The browser regression suite additionally checks the contact-intent EN/PL switch, mobile menu keyboard focus/Escape return, and footer semantic heading hierarchy. The live production deployment revision and real MyPTHub checkout flows cannot be inferred from green unit/browser tests or a green Deploy Preview.

After publication, verify the latest `main` production deploy in Netlify and compare it to the website in a **fresh browser window** in both languages. Confirm Trial, permanent Taster, current discounts, prices and links. The automatic read-only GitHub post-deploy smoke is a required secondary check; it does not replace the owner's checkout review. Do not send dummy customer enquiries to test a live form. Instead, validate form delivery with an explicitly agreed controlled test when needed.

The October discount expires inclusively on 31 October, Europe/London time. After the first successful build and publication on/after 1 November, inspect the original HTML without relying on JavaScript: October markup and discounted JSON-LD pricing must be absent, the regular £30 training-plan Offer must remain, and Trial/Taster must still appear.

The current branch deliberately leaves SEO metadata, routes, permanent pricing, legal text, public testimonials and all real client data unchanged. Known low-severity observations (one long PL services title, /index.html aliases and duplicated compatible entity fragments) are not established ranking defects and do **not** justify speculative changes before launch. Focus subsequent work on Search Console evidence, enquiries and conversions. Any future pricing/promotion updates should be made through canonical data and accompanied by a new audited build.
