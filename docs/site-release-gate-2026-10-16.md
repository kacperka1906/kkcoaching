# KK Coaching — production stability and release gate

Date: 16 October 2026. Branch: `fix/promotion-expiry-seo`, PR #75. This document authorises **nothing**; the owner must explicitly approve the merge and production deployment.

## Automated checks (required green on the **latest** PR head)

- GitHub Actions **Build and SEO audit**: full Astro build, link/canonical/hreflang/robots/sitemap integrity, bilingual contact tests, reviews and promotion tests.
- GitHub Actions **Promotion expiry regressions**: both controlled build dates (31 October and 1 November), browser desktop/mobile EN/PL, no-JS markup, price JSON-LD, DST and open-tab expiry. Also check mobile navigation keyboard focus, contact language-switch intent and footer headings.
- Netlify Deploy Preview reports ready. Preview ready is **not** proof that production has deployed.
- **Production release smoke** is read-only. It runs after a `main` push, can be started manually and is scheduled daily at 08:17 UTC. It validates both homepages, current promotion IDs/order, Trial/Taster destinations, contact forms, training-plan structured-data prices, the promotion-state manifest/cache/noindex headers, robots and sitemap. Failed runs mean the release is **not** verified.

## Production verification (owner / Netlify access required)

1. In Netlify, identify the **published** deploy of `kkcoaching.fit` and its commit. Verify that the production branch is `main`, automatic publishing is enabled where intended, and the published commit matches the approved `main` release. A successful PR preview alone does not answer this.
2. In a fresh private/incognito browser, inspect `/` and `/pl/` on mobile and desktop. Confirm one permanent free 7-day Trial, one permanent free 1:1 Taster, and one October 20% offer **only during October**. Trial should lead to the appropriate EN/PL MyPTHub marketplace page.
3. Open both MyPTHub destinations as a visitor, ensure the package is genuinely £0, has 7-day access and no unexpected mandatory payment/renewal. Real marketplace behaviour cannot be proven from source code.
4. Confirm the JD Gyms access rule for the free taster (membership or other access requirements) and whether any extra gym charges apply. Do not claim no gym-access cost without checking the venue policy. The training session itself is advertised as free.
5. Verify real Resend delivery using one **explicitly approved** test enquiry and a checked mailbox. Mocked contact-function tests do not prove live provider/Netlify environment configuration. Avoid generating fake leads without explicit agreement.
6. Test cookie banner acceptance and rejection in a clean browser, check that analytics only loads after opt-in, and confirm events in GA4 when appropriate. The repository tests the consent logic but cannot validate the live GA4 property.
7. Verify Netlify production variables `PROMOTION_REFRESH_ENABLED=true` and `PROMOTION_BUILD_HOOK_URL` only after owner-approved rollout. On Netlify Free leave default **All scopes** with production context; the Functions-only scope selector is available on paid plans. Never send hook URLs or tokens in chat or commit them.
8. Confirm `/promotion-state.json` matches active offers and is served with `Cache-Control: no-store` and `X-Robots-Tag: noindex`. Verify the scheduled function displays a Scheduled badge after publication.

## 1 November expiry confirmation

- October promotion is valid through 31 October (Europe/London). First scheduled refresh after expiry normally checks at approximately **00:05 London on 1 November**, followed by actual Netlify build/publish time.
- After a successful post-expiry deployment, check EN/PL **original page source without JavaScript**: expired promotion and discounted price branches must be absent. Training Plan structured-data price must be £30 and permanent Trial/Taster offers must remain.
- Function retries have bounded windows, not a global quota. Inspect Netlify logs and build history if the manifest remains stale. The daily GitHub production smoke will report persistent drift but does not itself repair the site or send a guaranteed notification.

## Subsequent low-maintenance mode

- Keep production updates behind PR + tests + owner approval; do not rewrite titles, routes, or entity schema to chase superficial SEO scores.
- Review failed GitHub Actions runs and set up account notification preferences. GitHub can disable scheduled workflows in **public repositories after 60 days without repository activity**. Daily monitoring is therefore a helpful safeguard, not a guaranteed permanent service.
- Review Search Console and the actual consultation/lead outcomes rather than making changes without evidence. Most further growth work should focus on visibility, content and qualified enquiries.
- Unresolved low-impact findings (69-character PL services title, alias `/index.html` canonical hints, compatible repeated entity IDs) are tracked, not a release blocker without demonstrated errors.

## Rollback principle

Keep a known-good published Netlify deploy and record the released Git SHA. If a deployment breaks functionality, review the correct recovery path and explicitly approve a Netlify rollback. Rolling back to a pre-fix build can reintroduce the expiry defect; verify current offers and prices in either case.
