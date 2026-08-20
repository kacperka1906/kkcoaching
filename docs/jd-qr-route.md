# JD Gyms QR route

Public QR URL to print on physical JD Gyms Cwmbran materials:

`https://kkcoaching.fit/jd/`

Both `/jd` and `/jd/` are configured at the Netlify edge as temporary redirects to the Cwmbran personal-training landing page with campaign tracking parameters:

`/personal-training-cwmbran/?utm_source=jd_gyms_cwmbran&utm_medium=qr&utm_campaign=jd_banner`

A 302 redirect is intentional so the printed QR can stay unchanged while the destination can be changed later without fighting permanent redirect caches.

Do not add `/jd/` to the sitemap. It is a campaign/vanity URL, not an indexable landing page.
