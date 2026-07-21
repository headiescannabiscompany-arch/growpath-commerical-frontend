# Crop Identification Production Evidence - 2026-07-21

## Scope and status

This record covers production Crop ID photo transport, no-grow operation, cannabis crop-level recognition, non-cannabis broader-candidate handling, saved-result provenance, and exact AI-credit accounting for a Personal Pro trial account. It does not close the planned multi-species accuracy pack, independent expert review, failed-provider refund testing, accessibility review, or final video coverage.

- Production site: `https://growpathai.com`
- Production API: `https://api.growpathai.com`
- Account/role: Personal Pro, trialing
- Browser evidence: authenticated in-app Browser semantic inspection of live pages
- Final frontend SHA: `8d250dd656a18ef8c1f80715667b7491369906e5`
- Final backend SHA: `54eefe8c5929948e024467bb5b8d16457890bad7`

## Releases

| Area                                               | PR             | Merge SHA                                  | Render deploy              | Production evidence                                                                  |
| -------------------------------------------------- | -------------- | ------------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------ |
| Preserve server-attested Crop ID vision provenance | Backend `#40`  | `8292bf83819fd665df2c4da84c46b9dc0a766ab2` | `dep-d9fq1d99rddc73c5qamg` | Live 2026-07-21 12:39:17 PM EDT                                                      |
| Send and display Crop ID vision provenance         | Frontend `#97` | `bbec8b55db6dab0011e2343548522739e2e0076c` | `dep-d9fq2gh9rddc73csm440` | Live 2026-07-21 12:41:38 PM EDT                                                      |
| Surface provenance when reopening Saved Runs       | Frontend `#98` | `bb876e6ae5f44d823ec6283f57a6db4b23e1ae03` | `dep-d9fq8st8nd3s73ffumug` | Live 2026-07-21 12:55:15 PM EDT                                                      |
| Preserve a defensible broader candidate            | Backend `#41`  | `54eefe8c5929948e024467bb5b8d16457890bad7` | `dep-d9fqdkt7vvec73eiacsg` | Live after a 1m21s deploy; independent `/health` passed at 2026-07-21 1:07:06 PM EDT |
| Show the broader candidate in new and old results  | Frontend `#99` | `8d250dd656a18ef8c1f80715667b7491369906e5` | `dep-d9fqeie7r5hc7382tla0` | Live after a 2m08s deploy, approximately 2026-07-21 1:09:29 PM EDT                   |

## Production case 1: cannabis without a grow

- One genuine uploaded cannabis-flower photo was analyzed without attaching a grow.
- Evidence asset: `6a5fa1fab9f052dfe646274e`.
- ToolRun: `6a5fa210b9f052dfe646275a`.
- Module record: `6a5fa210b9f052dfe6462760`.
- The live result returned `Cannabis` / `Cannabis sativa`, high confidence, one inspected usable photo, and `GrowPath context + OpenAI image review` using `gpt-4o-mini`.
- Cultivar remained blank and user confirmation remained required.
- The exact one-credit charge persisted: `61 / 100 -> 60 / 100`, 40 credits used across 24 billed requests, zero refunds.

## Production case 2: genuine roadside non-cannabis plant

- The owner uploaded two genuine photos of a non-cannabis roadside plant without attaching a grow.
- Evidence assets: `6a5fa2fcb9f052dfe64627e6` and `6a5fa2feb9f052dfe64627f3`.
- ToolRun: `6a5fa308b9f052dfe64627ff`.
- The provider inspected both photos with `gpt-4o-mini`, rated image quality `limited`, returned medium confidence, and recorded the visible trait `Flower clusters predominantly with a leafy stem that suggests mint species.`
- The raw response contained the useful broader candidate `Mint` in `commonNames` but also supplied the placeholder `Not confirmed` as the primary name. The calculator originally preferred the placeholder, hiding the useful result.
- Backend PR `#41` now promotes a defensible common/genus/family-level candidate over an unresolved placeholder while preserving the real confidence and confirmation requirement. Frontend PR `#99` applies the same rule to new prefill and compensates immutable older Saved Runs.
- On final production frontend SHA `8d250dd656a18ef8c1f80715667b7491369906e5`, reopening the exact ToolRun showed `Likely crop: Mint`, `Confidence: medium`, `Photos inspected: 2`, `Image quality: limited`, `Needs confirmation: Yes`, provider/model, both evidence IDs, visible traits, and the explicit note that exact species remains unconfirmed.
- The original AI request charged exactly one credit: `60 / 100 -> 59 / 100`, leaving 41 credits used across 25 billed requests and zero refunds.
- Reopening the fixed Saved Run did not invoke AI and did not charge again. A Profile hard reload after the deployed retest remained `59 / 100`, 41 credits across 25 billed requests, zero refunds.
- A second paid provider request was intentionally not made. Future-run backend candidate promotion is proven by the exact regression test, passing CI, and the deployed backend SHA; the live no-charge retest proves the corrected display of the immutable existing ToolRun.

## Automated verification

- Backend calculator regression: 19/19 passed, including the exact `Not confirmed` plus `commonNames: Mint` case.
- Backend canonical visible-calculator route contract passed for the Crop ID route; both GitHub checks passed (`test` 1m52s, `lint-and-test` 8m54s).
- Frontend focused Crop ID and Saved Runs coverage passed; the diagnosis/IPM/Crop ID contract plus delivery, corruption, export, lint, formatting, and diff guards passed.
- Frontend GitHub CI passed in 3m06s, including Expo dependency verification, Expo Doctor, production dependency audit, lint, delivery guards, and the full test step.
- Repository-wide TypeScript continues to report known unrelated existing files only; no touched-file TypeScript failure remained.

## Honest remaining work

- The broader 300-500-image identification QA pack is not curated or executed.
- A single genuine cannabis example and a single genuine non-cannabis roadside example do not establish general model accuracy.
- Exact species remains intentionally unconfirmed for the limited roadside photos; better whole-plant and leaf-detail media are still required.
- Failed-provider refund, independent expert accuracy review, full keyboard/screen-reader/contrast coverage, and final exported video remain open.
- This retest used genuine live Browser state and semantic page inspection. No repository screenshot or video artifact is claimed by this record.
