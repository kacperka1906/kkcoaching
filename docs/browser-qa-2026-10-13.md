# Local browser QA — KK Coaching

Date: 13 October 2026. Built dist served at http://127.0.0.1:4321. Chromium headless.

## Coverage

English and Polish home, personal training, contact and services; widths 390 and 1440 px, height 900 px. Six Lighthouse mobile runs: home, personal training and contact in both languages. No actual lead submitted. Browser QA blocked requests to external hosts.

## Baseline findings

- All 16 layouts: one H1, no document horizontal overflow, no uncaught JavaScript page errors.
- WCAG axe findings: dark red eyebrows and active desktop navigation have 2.37:1 contrast; standard price lines 4.1:1 or lower with minor-card opacity; contact secondary text 3.81:1. Language switch visible EN/PL was absent from accessible label.
- Lighthouse heading-order finding: shared footer begins with Quick links H4 following page H2, and Contact/Legal also use H4.
- Mobile menu supports Enter and Escape. After opening from the toggle, forward Tab goes to the booking CTA because nav links precede toggle in DOM; recommend review of focus entry/return.
- Several inline/footer links measure 19px high. This is a size observation; spacing/inline-text exceptions mean it is not alone proof of a WCAG target-size failure. Primary CTA/language/toggle controls are larger.

## Baseline Lighthouse lab results

| Page | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---|---|---|---|
| / | 97 | 96 | 96 | 100 | 1.6 s | 1.7 s | 0 ms | 0.087 |
| /personal-training-cwmbran/ | 98 | 95 | 96 | 100 | 1.4 s | 1.5 s | 0 ms | 0.087 |
| /contact/ | 98 | 95 | 96 | 100 | 1.2 s | 1.3 s | 0 ms | 0.087 |
| /pl/ | 98 | 96 | 96 | 100 | 1.5 s | 1.7 s | 0 ms | 0.087 |
| /pl/personal-training-cwmbran/ | 98 | 95 | 96 | 100 | 1.4 s | 1.5 s | 0 ms | 0.087 |
| /pl/contact/ | 98 | 95 | 96 | 100 | 1.1 s | 1.4 s | 0 ms | 0.087 |

These are local synthetic measurements, not field Core Web Vitals or production performance. The static preview does not serve Netlify image transformation endpoints; logos return 404 and produce console errors. Home hero /images/kacper-hero.webp is intentionally served through a forced Netlify status-200 rewrite to /.netlify/images?url=/images/kacper.jpg&w=960&fm=webp&q=84; the plain local server lacks that edge transformation. Lazy image checks after scrolling confirm PT source images load. Full-page screenshots therefore have incomplete image content. Scores are optimistic while images are absent. Cache/compression findings apply to the local static server and require production recheck.

## Scoped remediation

Language switch labels now include visible EN/PL; dark-background eyebrow and active/hover navigation text use the existing pale brand tint #FFDDE1; standard-price and contact-small text use #5D626B. Global brand red, buttons, content and layout remain as authored. Verified against rebuilt dist: all 16 WCAG 2 A/AA + WCAG 2.1 A/AA axe scans now report zero violations. All still have one H1, no document horizontal overflow and no uncaught JavaScript errors. Fresh contact viewport screenshots visually confirm readable text and retained layout at 390/1440. No form was submitted.

Preserved local evidence: `/workspace/audit-artifacts/kkcoaching/` contains before/after browser JSON, baseline Lighthouse JSON, compact summary, final accessibility JSON, full-page and viewport screenshots. These are local artifacts outside the PR; the tables above are the reviewable summary.

## Final Lighthouse accessibility

| Page | Before | After |
|---|---:|---:|
| / | 96 | 99 |
| /personal-training-cwmbran/ | 95 | 98 |
| /contact/ | 95 | 99 |
| /pl/ | 96 | 99 |
| /pl/personal-training-cwmbran/ | 95 | 98 |
| /pl/contact/ | 95 | 99 |

Remaining Lighthouse finding is shared footer heading-order (H4). It is a best-practice finding outside the WCAG-tagged axe pass used above. Mobile nav focus-entry recommendation remains for review. Final results and viewport screenshots are preserved in the local artifact directory named above.
