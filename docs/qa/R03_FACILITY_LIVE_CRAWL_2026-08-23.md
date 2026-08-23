# R-03 Facility live-crawl evidence and repairs

Date: 2026-08-23  
Matrix rows exercised: `F-04`, `F-05`, `F-06`, `B-02`, `B-03`, `R-03`  
Status: partial production evidence plus two focused frontend repairs.

## Production identity and role

- Frontend bundle exercised: `d3babaff35570564e849379fab2f68f391931b9c`.
- Backend fingerprint exercised:
  `growpath-backend|git=3baaae9fcd55aa567a37e8c7499d33a3517c0287|ts=2026-08-23T05:06:25.460Z`.
- Signed-in identity shown by the product: `EtGU_Jay` /
  `headiescannabiscompany@gmail.com`, account role `User`, Personal plan `Pro`.
- Selected Facility: `Triple Bag Genetics, llc`, ID
  `6a563bec2fb9f669d2319fa5`, Facility plan `FACILITY (trialing)`.
- The product exposed a read-only/non-owner Facility membership boundary. The UI did not
  display the exact Facility membership-role label, so this evidence does not invent one.

## Passed live slices

- Workspace selection offered only the signed-in identity's real Personal and Facility
  choices. Selecting Facility opened the named Triple Bag Genetics workspace; selecting
  Personal after the checks restored the original Personal workspace.
- Facility Dashboard loaded populated counts and deep links for 15 rooms, one active grow,
  one SOP, four team members and 85 audit events, plus tasks, compliance, inventory,
  reports, analytics, AI Tools, sensors, community, courses, Lives, Live Studio, storefront
  and licensed-transfer entries.
- Facility Grow Intelligence loaded the Facility-owned `2000 / 2000` AI-credit balance and
  truthfully separated AI suggestions from assignments, SOP approvals, inventory writes and
  compliance claims.
- Its visible tools included Ask AI, Facility AI Templates, Plant Diagnose, Plant & Crop
  Identification, IPM Scout, Environment Review, Crop & Room Plan, both mix builders,
  Harvest Readiness without a required grow, Saved AI Runs, Facility records, reports and
  the pH/EC, nutrient, soil and label-library tools.
- Direct navigation to `/home/facility/business-desk` was denied with a clear recovery path
  for this non-owner/non-manager member. This proves the negative role boundary; an
  OWNER/MANAGER live pass remains required before `B-03` can close.
- Facility Inventory loaded its canonical empty state, search, import explanation and
  explicit read-only mutation boundary. The server correctly rejected a full-audit export
  from this member with `AUDIT_READ_REQUIRED`.
- Facility Integrations loaded Pulse, TrolMaster, reviewed controller-CSV import, an exact
  grow-selection requirement, and honest request-only states for Growlink, AROYA,
  SensorPush, Aranet, HOBOlink and Monnit. Connect/import actions were correctly disabled
  for this member.

## Reproduced defects and bounded repairs

### Raw nested tool routes leaked into the Facility bottom tabs

Production displayed eight tabs instead of the intended six. The two extra labels were raw
route IDs: `tools/ph-ec` and `tools/auto-grow-calendar`.

Repair branch `codex/facility-hidden-tool-tabs` explicitly registers both nested routes with
`href: null`, preserving their working deep links while excluding them from the tab bar.
Regression coverage proves the six intended destinations remain Dashboard, Grows, Tasks,
Compliance, More and Profile.

### STAFF audit-export capability drift

The frontend offered an enabled `Full Audit CSV` control, while the canonical backend
correctly rejected it with `AUDIT_READ_REQUIRED`. The role overlay had granted
`AUDIT_READ` to every Facility role, even though the backend contract grants the full audit
export to Facility OWNER, MANAGER and VIEWER—not STAFF.

The repair replaces stale role-derived `AUDIT_READ` with that backend boundary. STAFF no
longer sees the unsupported export; OWNER, MANAGER and VIEWER retain it. Server authorization
remains the enforcement boundary.

## Local verification for the repair

- Facility navigation, responsive-tab, entitlement and Inventory route lanes:
  **4 suites / 55 assertions passed**.
- TypeScript: passed.
- Touched source lint: passed.
- `git diff --check`: passed.

## Remaining acceptance

- Deploy the exact merged repair SHA and repeat the Facility Dashboard/AI/Inventory checks,
  proving six tabs and no STAFF full-audit control.
- Exercise OWNER and MANAGER mutation, full-audit, Business Desk, Horticulture Operations,
  integrations and populated Inventory flows; exercise VIEWER full-audit and denied writes.
- Exercise a second Facility with similar names to prove record and export isolation.
- Complete provider-backed Pulse/TrolMaster or controller-import acceptance with owner keys
  or reviewed files. No credential or device result is claimed here.
