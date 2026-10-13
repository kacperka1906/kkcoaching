# Local search, competitor, entity and intent research

Research date: 13 October 2026. Independent read-only review of current repository and public web sources. No external edits, contact submissions, review actions or outreach were performed.

## Evidence limits

The available web search tool returned genuine search results and readable public pages. Searches were executed for all requested query families, including Cwmbran PT, personal training, near me interpreted as Cwmbran, JD Gyms Cwmbran PT, weight loss, strength training, online fitness coaching, Torfaen and beginner discovery. This is a search-provider snapshot, not a geolocated Google SERP, Google Maps audit or rank tracker. Results from batched queries are merged, so assigning exact positions or per-query result order would be misleading. No verified search volumes, backlink counts or keyword difficulty are available. Maps/local pack visibility, GBP ownership, GBP categories, current Google review count and Search Console accounts were not accessible. Their absence from these observations does not establish absence in reality.

Public website extraction is also potentially stale: homepage/PT extraction returned expired September promotions alongside October pricing, whereas current source contains only October promotions. A direct curl request failed because the environment proxy was unreachable. Treat this as a production verification gap, not a confirmed deployed defect. Verify with a current browser/HTTP capture before claiming expired live offers.

## Search landscape

The searches surfaced several different result classes:

- Local individual coaches/service sites: KK Coaching, mvlifefit/Matt Vallis, Gower Training, SPT Wales.
- Commercial gym PT pages and trainer platforms: Nuffield Health Cwmbran, JD Gyms Cwmbran, Your Personal Training profiles for Nicola Doble, Meredydd Coghlan and Ross Gower.
- Adjacent coached fitness: Sugar Rogue, Polarity Wellbeing and small-group PT.
- Directories/lead marketplaces: Yell, Bark, Superprof and PersonalTrainerUK.
- Some irrelevant broad coaching results, making clear trainer/entity identification useful.

KK Coaching homepage, dedicated PT page, online page, hybrid page and Polish PT page were all visible in the result set. This establishes discoverability in this tool; it does not establish current Google positions or comprehensive index coverage. Both the homepage and PT page appearing is normal and is not proof of harmful cannibalisation.

Directory caution: [PersonalTrainerUK's Cwmbran directory](https://www.personaltraineruk.co.uk/personal-trainers-cwmbran/) mixes gyms and other businesses and includes a dog-training entry in its discussion of top-rated trainers. Its review totals should not be treated as validated competitor Google metrics. [Yell](https://www.yell.com/s/personal%2Btrainers-cwmbran.html) includes sponsored distant providers serving the area; a listing is not necessarily a nearby physical competitor. [Bark](https://www.bark.com/en/gb/personal-trainer/torfaen/cwmbran/) is a quote marketplace, not evidence of a particular trainer's ranking or authority.

## Primary-site competitor assessment

| Business/source | Commercial intent and useful information | Trust/local evidence visible on source | Pricing/conversion assessment | Lesson for KK Coaching |
|---|---|---|---|---|
| [mvlifefit PT](https://www.mvlifefit.co.uk/personal-training) | One-to-one training at a private Pontypool/Torfaen studio; consultation, programme, nutrition and lifestyle coaching; step-by-step onboarding | Named trainer; private studio distinction; service area; story links. Credentials are claims on their site, not independently authenticated here | PT page displays 30-minute £17.50 and 60-minute £30 sessions; blocks include 5 hours £140 and 10 hours £260. Free consultation; WhatsApp, email and booking form | Strong practical onboarding and transparent format. KK already offers comparable clarity and clearer dedicated Cwmbran intent; no price changes justified |
| [mvlifefit pricing](https://www.mvlifefit.co.uk/pricing) | Overview connects PT, online consultation and group training to deeper service information | Explicit nearby area coverage and named trainer | Starting prices describe differing durations; online £150/8 weeks. Details pages distinguish formats | Compare equivalent scope and duration, not raw headline prices |
| [Nuffield Health Cwmbran PT](https://www.nuffieldhealth.com/gyms/cwmbran/services/personal-training) | Gym member PT with 30/60-minute flexibility; 1/4/8/12-hour packs; extensive scheduling, expiry, cancellation and purchase FAQs | Established gym brand; trainer registration statements; specific Cwmbran gym page | Purchase/log-in/join flow; 90-day pack validity and 24-hour cancellation guidance visible. No verified current local £ price extracted | KK can improve purchase confidence by publishing its own verified booking/cancellation/block-validity facts, rather than copying Nuffield's policies |
| [Nicola Doble profile](https://www.yourpersonaltraininguk.co.uk/trainers/nicola-doble) | Individual trainer at Cwmbran Stadium; beginner confidence, fat loss and strength; qualification/specialism tabs | Named trainer, venue, detailed qualifications and client reviews visible on platform; review authenticity not independently verified | Contact form describes callback; asks preferred contact time/day. No session price visible in extracted profile | Relevant local alternative. KK's explicit pricing and bilingual choice are strengths; verified qualifications can be presented prominently without invented credentials |
| [Sugar Rogue training](https://www.sugarrogue.fit/training) | Coached CrossFit, Hyrox, weightlifting and open gym; all levels welcomed | Named operating entity; claimed CrossFit affiliation and British Weightlifting coaches; cannot infer personal trainer equivalence | Repeated registration-of-interest CTAs; pricing not visible on this page | Adjacent strength/community alternative. Explain 1:1 coaching's actual benefits; do not claim specialist weightlifting credentials |
| [SPT Wales](https://sptwales.uk/) | Small-group PT and fitness for busy Torfaen adults; nutrition, goal setting, monitoring and support | Team identity and Griffithstown/Pontypool location | Join link visible; no pricing extracted on homepage | Different group format. KK's 1:1/online/hybrid choice should remain clear |
| [Gower Training](https://www.gower-training.com/) | One-to-one and online links, trainer personal journey, weight-loss and nutrition messaging | Named Ross and claimed Cwmbran location; not independently credential-verified | Form exists; homepage phone text contains an unfilled placeholder; prices absent from extracted homepage | Do not reproduce unsubstantiated team/health or guaranteed-equivalence claims. KK already gives stronger specific service and contact information |

Competitor pages show positioning and conversion approaches, not validated market share or causal ranking advantages. Differentiation for KK is concrete: independent named trainer, JD Gyms Cwmbran venue, English/Polish coaching, explicit fees and the clear distinction between PT, complete online coaching, hybrid and a one-off plan.

## Homepage versus local PT page

Source evidence: `/workspace/kkcoaching/src/pages/index.astro`, `src/data/site.en.json`, `src/pages/personal-training-cwmbran.astro`, `src/data/service-details-v2.json`, `src/components/Header.astro`, `src/components/Footer.astro`, `src/components/TrainingLocation.astro`.

Homepage title targets both local personal training and online coaching; its H1 presents the combined offer, services cover four coaching choices, and its story and process establish trainer identity. PT title/H1 target a personal trainer in Cwmbran, mention JD Gyms, and the page answers beginner suitability, nutrition scope, membership requirements, pricing and how to start. Both are legitimate relevant destinations with distinct commercial roles. [Homepage](https://kkcoaching.fit/) and [PT page](https://kkcoaching.fit/personal-training-cwmbran/) public extraction broadly supported these roles, subject to freshness limits above.

Why Google might prefer the homepage: its wider brand role, likely stronger accumulated internal/external authority, relevance to the query, or normal sampling variation. External authority is a hypothesis, not measured. The supplied exact-query 14 versus 2 impressions cannot prove a persistent allocation problem. Homepage page-level position 5.27 and PT page-level position 11.72 are across different query mixes and are not interchangeable with exact-query rankings. Query-level clicks cannot be deduced from page totals.

There is no convincing evidence here of harmful cannibalisation. Do not weaken homepage local relevance, change canonicals, consolidate URLs, or rewrite titles to force PT ranking. The dedicated PT page remains a good local conversion destination even if Google sometimes chooses the homepage.

Strengthening links would only be justified if a meaningful gap were found. Header/footer already link explicitly to PT; homepage service card links to the PT destination, and the shared venue component on non-local-service pages links to it. The PT page links to story/results/hybrid/training plan. Additional repeated anchors would add little. The highest-confidence minimal intervention is to preserve intent and links, fix only demonstrated regressions, and measure longer query/page trends.

## Entity/local trust

Repository representation is sensible: Organisation and Person nodes identify KK Coaching/Kacper; local PT Service provider is the independent organisation; availableChannel.serviceLocation identifies JD Gyms as a Place. The shared location component similarly uses a separate Place identity. No evidence supports recasting KK as owner of JD Gyms or adding a public office/24-hour coaching opening hours. Existing organisation schema may be appropriate without a LocalBusiness rewrite; that choice is not a confirmed defect.

Public training-venue facts are substantiated by [JD Gyms' own Cwmbran page](https://www.jdgyms.co.uk/gym/cwmbran/): Gwent Square address, 24/7 gym, 250+ machines, free parking arrangements and approximate station walks. These are gym facts, not trainer-hours claims. Do not import current gym membership price as a permanent coaching fact. Website wording correctly says gym membership is separate and coaching appointments are agreed directly.

Contact phone/email match between `site.en.json` and `admin-v2.json`. Minor source drift: site metadata Facebook URL is empty while admin contact Facebook URL is populated and footer supports it; homepage sameAs reads site metadata and therefore omits Facebook. Omitting one profile is not a validity problem, but consolidating verified contact data is a future consistency improvement. User brief requires recommendations before significant schema changes; avoid unrelated patching.

The PT results cards do not display service attribution although canonical Aneta testimonial is explicitly Online Coaching. This is not a fabricated result, but visitors could assume PT-specific evidence. A small bilingual label clarifying actual service type, or introducing examples as results across KK Coaching, would improve precision if implemented consistently. Do not relabel a client's service without evidence.

## Useful content gaps, not permission to invent policies

Current PT page already covers who it serves, included support, price blocks, beginner suitability, venue, separate membership, nutrition scope and starting process. Current source FAQ now describes session blocks instead of outdated 4-week PT-package wording. Avoid adding another generic local/weight-loss FAQ layer.

Potential additions requiring owner verification:

1. Session-block usage/expiry, scheduling and cancellation/rescheduling rules. Current website terms say detailed service terms may be supplied separately. Publish confirmed policy only; competitor rules are not KK rules.
2. Consultation logistics (format/duration) and first-session expectations, including how a new gym member meets the coach. Do not invent response-time promises.
3. Availability windows or accessibility arrangements only if actually known; JD Gyms 24/7 availability is not trainer 24/7 availability.
4. If a real PT-specific case study exists with consent, choose it for PT page or clearly label coaching modality. Existing online cases remain useful general trainer evidence.

AI-assisted discovery needs accurate server-rendered identity, service distinctions, direct practical answers and genuine third-party corroboration. Source already provides these foundations; no evidence justifies speculative crawler files or promises of AI recommendations.

## Off-site owner action plan

Google's [local ranking guidance](https://support.google.com/business/answer/7091) describes relevance, distance and prominence; complete accurate profile information and authentic reviews can matter. Website optimisation alone cannot establish Maps eligibility or guarantee position.

Before any GBP change, owner should inspect the actual profile and compare real business name, direct contact, website, coaching availability and venue relationship. Google's [business representation rules](https://support.google.com/business/answer/3038177) require accurate address/service-area information, appropriate categories and actual operating circumstances. Check eligibility and venue/signage arrangements for an independent trainer at another business; do not automatically set the gym as a KK storefront or assume a service-area profile qualifies merely because online coaching serves the UK. Never publish a private residential address or borrow gym opening hours.

Immediate: confirm production offers in a fresh browser; record deployment revision; inspect existing GBP rather than create duplicates. Audit selected existing citations for consistent KK name, phone, site and clear independent-trainer venue description. Request genuine review feedback from real clients without incentives, review gating or fabricated content; owner handles any communication.

30 days: verified practical FAQs, complete actual trainer/profile details and current genuine photos; pursue legitimate trainer listing on the gym's own channels if available and agreed; prioritise reputable relevant listings over bulk directory submissions.

90 days: one useful consented local/PT case study if evidence exists; genuine local relationships or community contributions with truthful references. No outreach was sent and no profiles were changed.

## Measurement

Retain supplied GSC/GA4 baseline. Review 28-day windows alongside a rolling 90-day view; separate branded versus non-branded local terms and English/Polish pages. Segment the exact Cwmbran PT query by page without making the goal 'PT must replace homepage'. Compare qualified organic enquiries and conversion rate by landing page/service interest. Exclude the known internal generate_lead test. Report raw small counts alongside percentages; no measured SEO or conversion uplift can be claimed before post-deployment data exists.
