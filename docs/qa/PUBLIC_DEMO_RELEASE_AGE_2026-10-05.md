# W08 — account-type demo, genuine feedback placement and release age

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
is unchanged and not waived. Production-format export and hosted acceptance pending.
Release stays open until exact-revision staging and production verification.

## Browser acceptance checklist

- All four account-type choices select the right content and rendered image.
- Full-size image and public role links point to the selected role's destinations.
- 375px layout fits without horizontal overflow; ordinary keyboard buttons work.
- Five-entry reading/selection and fixed public demo sharing remain available.
- Empty approved-feedback feed does not show fabricated/placeholder proof.
- Updates shows release ages and exact dates; Course gifts has no release count.
- Production deploy revision and canonical URLs checked; grouped note and private
  TODO/queue updated only after these gates pass.
