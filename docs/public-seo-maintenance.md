# Public SEO maintenance

`src/seo/publicPageModified.json` records reviewed dates of significant public-page
changes, not build or deployment times. The October 8, 2026 entries record the
addition of complete linked WebSite/Organization/logo structured data on these
pages. They do not claim a pricing, legal-policy or product-function change.

Update only an affected page's date when its main content, meaningful links or
structured data changes. A rebuild, copyright-year change or private app change
must not advance every date. Preserve dates on unchanged pages. Do not supply a
lastmod for dynamic catalogs, forums, feeds or registration without trustworthy
page-level modification evidence; their sitemap entries deliberately omit it.

Keep organization identity separate from the founder's personal social profiles.
Add company sameAs only for confirmed company-owned URLs. Do not invent Article
dates/authors, reviews, aggregate ratings, user counts or testimonials to satisfy
an audit. Genuine approved feedback is deferred, not replaced with synthetic proof.

The export reuses the existing 1024x1024 brand icon as a stable logo URL. Staging
remains noindex and does not publish a sitemap or IndexNow key. Changes here do
not by itself change the Render dashboard's routing or HTTP response headers.

## Route safety

The export discovers literal web routes from the existing Expo router, in addition
to preserving older explicit fallback shells. All dynamic route prefixes retain
their application-shell rewrites, including public grow-timeline and creator links.
Only after deploying that export and verifying deep links may the Render dashboard's
global `/*` rewrite be removed. Both checked-in YAML files describe that desired
configuration, but are not proof that the Dashboard has applied it.

Unknown top-level paths can then return the CDN's real 404 instead of homepage HTML.
Unknown record IDs inside retained application prefixes still require the app/API's
existing unavailable handling; this is not a promise of server-side record-aware
404s. Do not delete known-prefix rewrites or change publication/access rules to
raise an SEO score. New dynamic route families must pass routing coverage tests.

## Bounded response headers

HSTS is host-only (one year), without preload or includeSubDomains: unrelated or
unverified subdomains must not inherit a new HTTPS requirement. Referrer policy
is strict-origin-when-cross-origin; MIME sniffing is disabled.

The initial CSP enforces same-origin base URLs, blocks object/embed plugins and
allows framing GrowPath pages only by the same origin, with SAMEORIGIN for older
browsers. This controls inbound framing, not the outbound media iframes used by
courses and live players. OBS uses its existing top-level Browser Source URL.
No supported third-party GrowPath iframe-publishing contract was found in the
existing code/methods. This is a bounded baseline, not a strict script/XSS policy:
there is deliberately no default-src, script-src, connect-src or frame-src rule
until their complete dependency/nonce review. Camera, microphone, geolocation,
analytics consent, payments and public share links are not disabled by this policy.

Apply and verify on the existing staging site first. Verify actual response
headers after configuring the existing production site; checked-in YAML alone
is never a hosted-evidence receipt. Do not provision a replacement service.
