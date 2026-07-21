# Harvest Readiness Production Evidence - 2026-07-21

## Scope and status

This record covers the production Harvest Readiness release, authenticated Personal Pro UI behavior, the incomplete-photo no-charge boundary, AI-evidence disclosure, and owner-supplied video review. It does not claim a successful provider-backed trichome estimate because a truthful top/middle/lower macro set plus a wider context photo was not available in this session.

- Production site: `https://growpathai.com`
- Production API: `https://api.growpathai.com`
- Account/role: `headiescannabiscompany@gmail.com`, Personal Pro, trialing
- Grow context: `6a551a9d2fb9f669d2319c06`
- Browser evidence: authenticated Codex in-app Browser semantic inspection and live screenshots
- Harvest Readiness frontend SHA: `8ebf26a9fbe3986ec9c518c76c7471c7d8b379e6`
- Harvest Readiness backend SHA: `bb0968f3b25d9dd62541cdfb2aff6479f1392be0`

## Releases

| Area                                                                           | PR              | Merge SHA                                  | Render deploy              | Production evidence                                               |
| ------------------------------------------------------------------------------ | --------------- | ------------------------------------------ | -------------------------- | ----------------------------------------------------------------- |
| Private harvest evidence, cannabis API gate, provenance, and credit protection | Backend `#43`   | `bb0968f3b25d9dd62541cdfb2aff6479f1392be0` | `dep-d9frm7cvikkc73bho5t0` | Live after a 1m12s deploy; Render lists 2026-07-21 2:31:57 PM EDT |
| Four-photo UX, blank observations, billing disclosure, and saved provenance    | Frontend `#102` | `8ebf26a9fbe3986ec9c518c76c7471c7d8b379e6` | `dep-d9frnbu8bjmc73e1dkig` | Live after a 2m12s deploy; Render lists 2026-07-21 2:34:23 PM EDT |

The independent production API health request after the backend release returned `ok: true` at `2026-07-21T18:34:11.573Z`.

## Production UI verification

The release-busted live route was opened at:

`https://growpathai.com/home/personal/tools/harvest-readiness?growId=6a551a9d2fb9f669d2319c06&release=8ebf26a&verify=harvest`

The deployed page showed all of the following:

- The readiness calculator remains free; grow-context prefill and photo analysis are separate optional one-credit actions.
- Provider failures are described as automatically refunded.
- Photo analysis requires three sharp macro samples from top, middle, and lower bud sites plus one wider context photo.
- Guidance asks for intact gland heads on calyxes under neutral light and warns against pistils, sugar-leaf edges, purple light, glare, blur, digital zoom, and heavy compression.
- Flower day, breeder timeline, trichome percentages, pistil status, bud structure, sample location, aroma trend, and effect goal all loaded blank instead of silently submitting example values.
- The page states that a photo estimate is not a harvest order and that the user reviews values before the deterministic result is calculated.

## Production incomplete-set and billing case

- Starting Profile state: `59 / 100`, 41 credits across 25 billed requests, zero refunds.
- One genuine owner photo was uploaded through the live picker and persisted as evidence `6a5fbc97f7dfa4a764f878ba`.
- The page changed to `1/10 photos`, displayed `Add 3 more photos`, named the missing top/middle/lower macro plus wider-context set, and stated that no credit would be used yet.
- DOM inspection confirmed the Analyze Photo Set control's parent carried `aria-disabled="true"`.
- No provider request was made.
- A Profile hard reload afterward remained `59 / 100`, 41 credits across 25 billed requests, zero refunds.
- Live screenshots were captured in the Codex release task showing the deployed checklist and the disabled one-photo state. No repository image file is claimed by this record.

## Owner-supplied video review

The signed-in YouTube pages expose `Analytics` and `Edit video` for both items, demonstrating that the active `EtGU` channel account controls them:

- [Scratch and sniff 8-14 days left](https://www.youtube.com/watch?v=CUIifOqeS1Q), a one-minute close trichome view.
- [How many days left until chop?](https://www.youtube.com/watch?v=QT7vv46368M), a 6:05 grower review of changing planned harvest dates.

These videos are useful as owner-supplied observational and acquisition-quality examples. Their visible macro footage includes the real-world blur, color cast, focus variation, compression, and sampling ambiguity that the tool should detect and explain. They are suitable for UI guidance, retake-message evaluation, and a future owner-approved QA media pack.

They are not a scientific harvest-decision source or labeled model ground truth by themselves. Neither item establishes a verified final harvest date, an independent outcome, or the required top/middle/lower plus context sample set. They should not be added to the runtime scientific source registry until the owner supplies approved uses, exclusions, reliability tier, cross-check requirements, and review date.

## Automated verification

- Frontend Harvest/gating/navigation coverage: 4 suites, 22 tests passed.
- Frontend harvest-history contract and contamination guard passed.
- Frontend changed-source lint, formatting, export sanity, production export, and final static build passed.
- Frontend GitHub `lint-and-audit` passed in 3m10s.
- Backend workflow, vision, calculator, and evidence service coverage: 36 tests passed.
- Backend Harvest and Tools route coverage: 2 suites, 10 tests passed.
- Both backend GitHub checks passed; the full CI run completed successfully.
- Repository-wide frontend TypeScript still reports known unrelated existing files only; no touched Harvest file error remained.

## Honest remaining work

- A rightful four-photo top/middle/lower macro plus wider-context set is still needed for one successful production provider analysis, provenance display, exact one-credit deduction, saved-run reopening, and downstream harvest-batch/task verification.
- A deliberately failed provider request was not triggered in production. Refund behavior is covered by automated tests but still needs live failure evidence under a safe failure mechanism.
- The supplied YouTube videos need explicit registry metadata before they can become governed knowledge sources; today they are QA/observation material only.
- Independent harvest-timing review, mobile/desktop accessibility coverage, keyboard and screen-reader checks, and an exported final-SHA video remain open.
