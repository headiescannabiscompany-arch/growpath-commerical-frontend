# W08 — account-type demo, genuine feedback placement and release age

**CLOSED / LIVE — October 5, 2026.** Final frontend revision
`80f49b1a7dbafca8a6cdcabdcd9823353090eb0b`; production
`dep-db1r0m8u01pc73fmrsq0` LIVE at 14:15:00Z. Earlier OPEN statements below
record the caught defect, not current status.

Owner-requested follow-up, not an invented HeyCatch audit finding. Scope: public
demo only, plus relative dates on Updates; no signed-in workflow, plan, billing,
credential, private analytics or account changes.

## Implemented

- Free, Pro, Commercial and Facility guided highlights with current limits and one
  reviewed screenshot each. Free emphasizes one tracked plant and available tools
  for household care, not unlimited records or AI. Existing five-point timeline,
  list view and fixed `/demo` share path remain unchanged.
- Matching static crawler/no-JavaScript highlights and public links. Demo-only
  metadata updated for the broader scope. Removed duplicated screenshot gallery
  from demo; the same screenshots remain on their existing other public pages.
- Existing dynamic approved-only testimonial feed reused on demo. Empty feed
  hidden; withdrawal refresh removes proof. No quote is baked into exported HTML,
  no testimonial published, and website consent does not grant outside ad rights.
- Updates counts local calendar days since each milestone's latest actual Released
  note in the live section. No count from planning/review dates; planned features
  remain unreleased. Exact dates remain displayed; the count refreshes each minute.

## Screenshot provenance

Commercial image is the owner's October 1 Storefront Offers screenshot, copied
without pixel edits. Only labeled synthetic QA products/data are visible. PNG
chunks inspected: IHDR, sRGB, gAMA, pHYs, IDAT, IEND; no text/EXIF/GPS chunks.
Dimensions 944×1245. Free timeline screenshot 1280×1000; Pro intake and Facility
dashboard 836×1100. Their existing synthetic disclosures remain explicit. Ratings
in the Commercial screenshot are QA fixture values, not customer endorsements.

## Gates

134 focused Jest tests and 20 static-marketing tests passed. TypeScript,
touched-source lint, contamination and diff checks passed. Interface guard against
current production d76ada95 passed; existing cumulative Admin/Profile budget debt
is unchanged and not waived. Production-format export passed with asset
`index-07bb614dd780f3ee4679f92ae8dfb092.js`.

Staging revision `7c837f03777a9d2030ce5e701ee923ac9fd5390b`, deploy
`dep-db1qpd2d0e5s7390076g`, LIVE October 5 at 13:58:52Z. All four role
selections, correct image dimensions/loaded pixels, full-size/public-role link
destinations and explicit limits verified. At 375×812 both demo and Updates have
document width 375 (no horizontal overflow). Pro selection works by Enter; ordinary
Chrome clicks switch the five-entry list correctly. Chrome invoked the share handoff;
Escape canceled it with the truthful canceled/unavailable fallback and fixed address
remaining. No external social post was sent. IAB share is unavailable, also correctly
labeled rather than claiming a copied link. Browser error logs empty. Empty public
feedback shows no quote or placeholder section. Updates shows October 4 = 1 day,
October 5 = 0 days, and Course gifts = Not released yet with no release counter.

Production deploy `dep-db1qs0ugekts73f2v280` started for the same revision.
Initial production revision became LIVE at 14:04:54Z. Canonical demo/Updates HTTP
200 and interactive role selection passed, but the saved desktop screenshot exposed
vertical card overflow: inherited grid `flexBasis: 280` capped the standalone role
card at 280px while its children extended beyond it. Earlier horizontal-only
acceptance was insufficient. Release remains OPEN, not accepted.

Narrow correction: standalone demo card uses `flexBasis: auto; flexGrow: 0`, with
a regression assertion. Re-run hosted desktop and 375px containment checks for
every role (last child inside card, next journal below card), then promote and
replace the screenshot. No global card or theme changes.

Correction `80f49b1a7dbafca8a6cdcabdcd9823353090eb0b` passed all 134 Jest tests,
20 static tests, TypeScript/lint/diff checks. Staging `dep-db1qujcs728c73dpe0e0`
LIVE October 5 14:10:27Z. All 8 role/viewport containment checks passed:
desktop role cards 1301.6/1600/1745/1600px tall; 375px cards
1247.3/1350.0/1446.9/1350.0px tall. Last child inside card and next journal below
card in every case, no horizontal document overflow.

Final canonical production `/demo` verified on the corrected deployment: all four
roles passed vertical containment, journal placement and no-horizontal-overflow
checks at both 1280px and 375px (8/8). Screenshot replaced with corrected production
evidence: `outputs/W08_Production_Demo_2026-10-05.jpg` in the private workspace.
Browser error log empty. Canonical `/updates` shows October 4 = 1 day and October 5
= 0 days; Course gifts remains Not released yet without an age. No backend,
customer records, billing settings, real quotes or external advertisements changed.
Master TODO, execution pointer and dated plan reconciled; next is A05-08 plus the
approved linked course-Q&A acceptance, not another W07/W08 pass.

## Browser acceptance checklist

- All four account-type choices select the right content and rendered image.
- Full-size image and public role links point to the selected role's destinations.
- 375px layout fits without horizontal overflow; ordinary keyboard buttons work.
- Five-entry reading/selection and fixed public demo sharing remain available.
- Empty approved-feedback feed does not show fabricated/placeholder proof.
- Updates shows release ages and exact dates; Course gifts has no release count.
- Production deploy revision and canonical URLs checked; grouped note and private
  TODO/queue updated only after these gates pass.
