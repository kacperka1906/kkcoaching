# Facebook capability and preview integration

Checked 3 October 2026 against official Meta documentation, Graph API **v26.0** (released 29 July 2026). No Page token or live recommendation request was used.

## Decision: current recommendation reading is unavailable

The [Recommendation reference](https://developers.facebook.com/docs/graph-api/reference/recommendation/) explicitly says recommendation-returning fields/edges are deprecated from **v22.0** and return **error code 12**. The [Page Ratings reference](https://developers.facebook.com/docs/graph-api/reference/page/ratings/) still presents `GET /v26.0/{page-id}/ratings`, a list of Recommendation nodes. These pages conflict: the specific Recommendation deprecation prevents treating the legacy edge listing as working current support. This project therefore does **not** implement or call that edge. A Page Access Token alone cannot remove the deprecation. Do not downgrade API versions to evade it.

The [Graph API changelog](https://developers.facebook.com/docs/graph-api/changelog/) identifies v26.0 as current. Official pages were read in the browser; search results and obsolete third-party tutorials were not used to infer capabilities.

## Fields and authorization: documented legacy behavior, not current availability

| Requirement | Official documentation / decision |
| --- | --- |
| Endpoint | Legacy Page `/ratings` edge returns Recommendation nodes; current versions are subject to error 12. No working replacement verified. |
| Token | Legacy edge requires a Page Access Token requested by a person with CREATE_CONTENT, MANAGE or MODERATE task on that Page. Parent Page token does not authorize a child Page. |
| Permissions | Legacy edge lists `pages_read_user_content`. Current permission reference lists its dependency `pages_show_list`. These do not override deprecation. |
| App Review | Current permission reference requires App Review for accessing data not owned/managed by the app user. Requirements depend on app/access mode and actual Page relationship; no approval or access has been verified here. |
| Business verification | Required for apps requesting Advanced Access; Meta may require data-handling answers and annual Data Use Checkup. |
| Reviewer name | Legacy `reviewer` is described as User information. This is not proof of a current available name response; no response tested. |
| Avatar | No avatar field documented on Recommendation. Do not infer avatar access from unrelated Page engagement permissions. |
| Text | Legacy `review_text`; unavailable through deprecated current recommendation reads. |
| Date | Legacy `created_time`; preserve null when not available. Screenshot dates without year stay null. |
| Recommendation | Legacy `recommendation_type` positive/negative and `has_review`; no live normalization inferred. |
| Stars | Legacy `rating`/`has_rating` existed, but these five recommendations are not star ratings. Facebook rating always null. |
| Stable review ID | No stable recommendation ID field in the documented field table; do not repurpose reviewer IDs. |
| Permalink | No direct permalink field documented. `open_graph_story` is not a verified review permalink/identity. |

Permission source: [Meta permissions reference](https://developers.facebook.com/documentation/development/permissions), updated 29 September 2026, specifically Requirements, `pages_read_user_content`, `pages_show_list`, and `pages_read_engagement`.

## Owner actions

1. **First obtain official Meta confirmation of a supported replacement or applicable exception** for reading this Page's recommendations in a current API. Tokens, App Review and business verification alone are not a demonstrated solution to error 12. Keep manual/local fallback until this is resolved.
2. Only if a supported endpoint is confirmed: configure `FACEBOOK_PAGE_ID`, `FACEBOOK_PAGE_ACCESS_TOKEN`, and a documented supported version in a future server adapter. These variables are intentionally unused in this phase. Grant only the confirmed endpoint permissions and Page tasks. Complete any required App Review, Advanced Access/business verification and data-use requirements. No App secret is needed by this disabled adapter.
3. For the protected preview control, set **`REVIEWS_REFRESH_SECRET`**, randomly generated with at least 32 characters, in Netlify **Deploy Previews / Functions only**, never production, repository, PR, logs, or public HTML. The password field accepts it for a same-origin Authorization header and immediately clears the input; no browser storage is used. It is an admin credential, not a provider token. Without it requests fail 401. With it the disabled Facebook provider fails 503 safely.
4. Before enabling a future transport, perform an authorized live response/permission test, complete pagination, verify field semantics, and validate deploy-store write/read/CAS across fresh invocations. Obtain a separate decision for any production rollout; this PR does not authorize one.

## Preview architecture

- `sync.mjs` is transport-neutral. `SyncProvider` accepts already-normalized records and a completeness flag; no Facebook network transport exists. A local provider is explicitly `local-test` and never claims a live connection.
- The engine acquires an atomic store lease, times out after at most 10 seconds, uses a 30-second lease and 60-second manual cooldown. Conditional writes fence expired writers. Daily mode requires at least 24 hours since both last success and last attempt; errors therefore cannot create repeated automatic retries. No production cron or automatic schedule is installed.
- Only a nonempty complete valid response replaces the snapshot. Failure/partial response/timeout retain the previous success. Empty data is conservatively treated as incomplete to protect the fallback. Daily mode is available to protected orchestration and a mock trigger; no visitor invokes it.
- Identity uses source + external ID, otherwise normalized client/text/date. Existing local identities and avatars enrich matches; repeated records are deduplicated. Quotes are never paraphrased. The original JSON and screenshots/avatars are unchanged.
- `BlobReviewStore` uses `getDeployStore('reviews-phase2-preview')`, strong reads and atomic `onlyIfMatch` / `onlyIfNew` writes, via `@netlify/blobs` 10.7.13. No site-wide store, paid database, personal access token, or production setting is introduced.
- Deployment-scoped storage persists across function invocations **within that deployment**, but does not carry over to new deployments and is cleaned up when the deployment is deleted. Platform-provided Blobs access is required. Missing access fails safely. Live persisted writes are **not claimed as tested**; the adapter's CAS behavior is tested with a fake SDK store.
- Edge middleware reads this cache on preview HTML requests with a 250ms fallback budget; it never calls a provider. It injects sanitized inert JSON into the existing widget. The small client adapter replaces cards before the existing controller initializes. No visitor fetch, polling, spinner, rebuild or provider dependency is added. Local-test snapshots are explicitly refused by this public path.
- Missing/corrupt/unavailable cache returns the original five local reviews. Valid cached Facebook records take priority; approved manual records merge without duplicates. Google is excluded, and WhatsApp needs both approval and consent.
- Functions require trusted platform context `deploy-preview` and `published === false`. The admin route is noindex/nofollow, excluded from sitemap and unlinked from navigation; middleware returns 404 outside Deploy Previews. Static local testing remains possible. Public homepage metadata and approved placement are unchanged.
- Google: disabled, awaiting Business Profile verification; no OAuth/API calls. WhatsApp: disabled for ingestion, no webhook; explicit approval plus consent remains mandatory.

Storage/platform sources: [Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/), [Functions context](https://docs.netlify.com/build/functions/api/), [Edge context](https://docs.netlify.com/build/edge-functions/api/).

## What was actually tested

Run `node --test scripts/test-reviews-sync.mjs` after the normal build. Tests exercise successful mock persistence, failed/partial/timeout fallback, dedup/update, 24-hour boundaries, rate limiting, concurrent/expired leases, protected endpoint errors, production rejection, SDK CAS contract, consent, SEO isolation and credential-free bundles. The admin page's local simulation uses an in-memory store and never writes public storage.

**Live Facebook sync: not tested, disabled due to current documented API deprecation. Live Netlify persisted writes: not tested.** A readable storage status alone does not prove write persistence. See the task delivery report for observed Deploy Preview and browser QA results.
