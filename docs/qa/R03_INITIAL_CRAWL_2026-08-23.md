# R-03 initial crawl evidence

Date: 2026-08-23  
Matrix row: `R-03`  
Status: partial — initial automated and signed-in Personal slices passed; the complete
cross-role crawl, proof-based cleanup, post-cleanup freeze and final full pass remain open.

## Candidate identity

- Frontend production bundle exercised: `d3babaff35570564e849379fab2f68f391931b9c`.
- Frontend canonical `main` after the documentation-only P-02/P-03–P-06/Nature evidence
  merge: `85c16f5b1dae2ff2d820b75ff8b4ccfb0f1a6bea`.
- Backend production fingerprint exercised:
  `growpath-backend|git=3baaae9fcd55aa567a37e8c7499d33a3517c0287|ts=2026-08-23T05:06:25.460Z`.

The `85c16f5b` frontend merge changes acceptance documentation only; it does not replace or
invalidate the `d3babaff` served UI evidence. It is not the final frozen release SHA.

## Automated initial-crawl gates

The following commands passed from a clean frontend worktree:

- `node scripts/verify-live-urls.cjs`
  - privacy, terms, support and communities;
  - Personal grow deep link;
  - delete-account, workspace-choice/switch and gift-claim routes;
  - API health, readiness and API-health routes;
  - retained output:
    `tmp/spec/live-url-checks/2026-08-23T05-19-41-962Z.json`.
- `npm run scan:release`: 1,126 files scanned; two allowlisted URLs; passed.
- `npm run audit:full-surface`: 335 route files, 322 frontend routes and 225 backend
  route declarations; zero errors and zero warnings.
- `npm run audit:growpath-system`: all 32 registered modules present; decision checks
  passed.
- `npm run verify:codex-workflow`: all 11 workflow requirements passed.
- `npm run validate:v1-matrix`, `npm run validate:v1-ui-surface`,
  `npm run validate:frontend-runtime-contract`, and
  `npm run validate:backend-route-contract`: passed.
- `npm run guard`: passed every enforced contract, contamination check, delivery scan,
  and the seed-ready Diagnosis/IPM and Facility planning lanes.

The guard correctly retained, rather than hiding, these non-code evidence gates:

- Plant Identification needs the remaining reviewed real-world media records before its QA
  catalog can enter strict seed-ready mode.
- Living Soil Labs commerce needs owner-supplied product evidence and exact commercial
  configuration before its QA catalog can enter strict mode.
- The Facility simulator is seed-ready but still needs its 27 named staging/browser
  acceptance records.

These are not reasons to rebuild their existing product assemblies.

## Signed-in Personal production slices

Account/workspace: owner Personal workspace, Pro plan.  
Theme observed: Night.  
Viewport: current Codex in-app Browser desktop viewport.

Verified without changing account settings or publishing content:

- Personal Home loaded a populated active-grow command center with working, grow-scoped
  links for grow, journal/photo entry, AI tools, diagnosis, tasks and integrations.
- The Home mini globe rendered with an honest zero-public-observation state, explicit
  location-off explanation, Globe and Plant ID links, and no fabricated pins.
- Profile loaded real plan, AI-credit, notification, theme, billing/data-rights and
  workspace controls.
- Profile loaded real video quota from the protected backend: `673.7 MB used of 10.0 GB`
  and `9.3 GB` remaining.
- `Manage My Videos` opened `/videos?tab=library`, which showed the same approximately
  674 MB / 10 GB quota and two workspace videos. The route exposed discover/library tabs,
  hosted-versus-external storage copy, provider choices and visibility controls.
- The Personal grow list persisted four current grows after its loading state and exposed
  search, archive, journal, tasks, AI Tools, Timeline, integrations and PDF export paths.
- The known disposable Plant-ID grow opened with its persisted crop identity, Grow Calendar,
  Plants, Journal, Tasks, AI Tools, Automation, Timeline, Compare, integrations, report and
  share paths.

## Mutation and cleanup note

The two known disposable Plant-ID grow IDs remain:

- `6a8a27ee0ad1a2c8f9e57fa6`
- `6a8a27d80ad1a2c8f9e57f95`

The in-app Archive control was reached, but its JavaScript confirmation blocked browser
automation before a result could be observed. No archive success is claimed and the records
must be presumed active. Resume through the product UI at a later mutation checkpoint;
do not use this failed interaction as evidence or rewrite the archive implementation without
a reproduced product defect.

## Exact remaining R-03 work

1. Complete authenticated Personal, Commercial, Facility and Admin role/state/action
   scenarios, including populated, empty, denied, retry, persistence and cleanup evidence.
2. Complete provider/device gates already named by their owning matrix rows. Record an exact
   blocker where an owner credential, physical device or fresh real-world observation is
   required.
3. Run the complete responsive/theme/keyboard/focus/accessibility and professional visual
   presentation crawl on the candidate.
4. Classify cleanup candidates only with route/import/provider/worker/webhook/migration/data
   compatibility proof; remove only proven unreachable, superseded or duplicate code in
   small reversible commits.
5. Freeze new frontend/backend SHAs, run affected plus full release gates, deploy those exact
   SHAs, and repeat the complete crawl. Only that final post-cleanup pass may close `R-03`.

