# HeyCatch website audit — October 4, 2026

Source: https://app.heycatch.ai/audit/hck_pk_Vu7gSIhkxVCmtc6M8S_lkn4S_EQjzMOE?surface=website

All six dimension dialogs and the whole action plan were read before editing.
This is a website-copy/SEO phase, not a reopened Facility acceptance task.

## Immutable audit baseline

- Positioning 12/25: D1.1 3/6; D1.2 2/5; D1.3 2/4; D1.4 2/3; D1.5 0/3; D1.6 3/4.
- Conversion 16/25: D2.1 4/7; D2.2 4/5; D2.3 2/5; D2.4 3/4; D2.5 2/4; D2.B +1/2.
- Trust 2/20: D3.1 0/4; D3.2 0/5; D3.3 0/4; D3.4 2/4; D3.5 0/3.
- Pricing 10/15: D4.1 2/2 PASS (untouched); D4.2 3/4; D4.3 2/5; D4.4 3/4; D4.B +0/1.
- SEO 10/15: D5.1 2/3; D5.2 2/2 PASS (preserve); D5.3 1.5/4; D5.4 3/3 PASS (preserve); D5.5 1.5/3.
- Brief fit: FIT 8/10; brand and plan-schema corrections overlap D5.1/D5.5.

## Report action-plan order

Quick wins: founder section; real screenshots; personal-grower hero; four schema offers and brand; recommended tier/annual saving; self-referencing canonicals.

Quarter: five named user stories; /vs PLNTRK and Grow with Jane; pricing objections/data-ownership FAQ and schema; exact tier allowances.

Bigger bet: /customers proof page. Deferred until permissioned real stories exist.

## Evidence gates / intentionally unpublished stubs

The nullable founder fields and empty proof arrays in publicMarketing.json are
unpublished editorial slots, not a claim that content has been collected.

- Founder portrait and first-person origin story need owner material.
  Owner supplied https://youtube.com/@etgujay for the show; linked without its
  tracking query. No separate Exploring the Growing Universe site exists.
  The audit brief supports the public name Jay and show title; the conversation
  supports the Maryland company identity. No biography was invented.
- Real product screenshots and a no-login visual preview need reviewed crop-neutral,
  synthetic/permissioned product captures. The existing staging personal timeline
  is denied in the current Facility session; no account/mode changes were made for marketing.
- D3.1/D3.2: five permissioned user stories and verified count remain open.
- D3.5: dated Updates link improves recency, but press/reviews/awards remain unverified.
- D4.3: use “Recommended for growing beyond Free,” not unsupported “Most popular.”
- No unconditional refund, unlimited AI, complete media backup, offline-only storage,
  guaranteed yield, or automatic controller claim.

## Product sources

Backend entitlements.js: 1/10/50/200 grows; 1/50/500/2000 plants;
5/100/500/2000 weekly credits; 1/5/50/50 paid courses; 7/20/100/100 lessons.
config/freePolicy.js: assistant 1 credit, diagnosis 3.
Facility credits are a shared subscription pool. Existing plans/prices unchanged.
Current Terms: ownership retained. Privacy: cloud processing, Profile account-export requests.

## Comparison sources (read October 4, 2026)

- https://software.plntrk.com/ — Pro 25 $35/year, Pro 100 $90/year; plant limits.
- https://www.plntrk.com/Faq — CSV exports, cloud backup, privacy.
- https://www.plntrk.com/blogs/blogitem/new-feature-export-your-cannabis-plant-data-to-pdfcomplete-with-photos-logs-and-a-qr-code-66 — PDF/photos/logs.
- https://growithjane.com/ — mobile apps, growlogs and community.
- https://growithjane.com/about-jane-ai/ — user-selected context and AI limitations.
- https://social.growithjane.com/t/verbesserungs-vorschlag/71415 — provider support's browser print-to-PDF workaround.

No inference that either competitor lacks AI or exports. Grow with Jane prices
not independently verified; readers are directed to its current store listing.

## Release status

Application revision: e0faf6254c955e8b5ed96e7e62e4b4354ab8e13e.

Local verification: 55 tests in four Jest suites, three export tests, TypeScript,
scoped ESLint, whitespace/interface guards, production export, SEO verification,
and both Render routing manifests passed. No dependency or backend changes.

Staging deploy dep-db18vnnavr4c73ar05fg was live October 4 at 17:43:40Z.
The 13 public marketing rewrites were saved before the existing catch-all;
existing application fallback routes were retained. Direct pricing, About,
personal-grower and both comparison responses contain their own title/canonical.
Pricing contains the four actual offers and seven FAQ answers; llms.txt returns 200.
Rendered mobile pricing/About at 375px has no page-wide horizontal overflow;
the comparison table is a separately labeled, focusable horizontal scroll region.
Desktop navigation, both comparisons, founder YouTube link and SPA schema removal
were checked. Browser error log was empty.

Production deploy dep-db192d0u01pc73dd09d0 was LIVE October 4 at 17:49:40Z.
The same public routing rules were saved successfully on production. Eight direct
public routes returned their own expected canonical/title and one H1. Homepage
and pricing each contain four offers; pricing contains FAQ schema. Both comparison
URLs are in the sitemap and llms.txt returned 200. Rendered pricing, keyboard and
pointer navigation, founder YouTube link and the Website & plans Updates tab passed.
The Updates tab correctly says partially live and lists the missing proof work.
Production browser error log was empty. The existing signed-in session redirects
the homepage to its workspace as before; homepage raw HTML was verified separately.

W01 code/release work is CLOSED / LIVE. W02/W03 remain open for real proof assets.
No new audit score is claimed. Screenshot evidence is saved in the task outputs as
Website_Audit_Pricing_Production_2026-10-04.jpg. No backend, credentials, payments,
customer records or plan prices were changed. Existing completed phases stay closed.
