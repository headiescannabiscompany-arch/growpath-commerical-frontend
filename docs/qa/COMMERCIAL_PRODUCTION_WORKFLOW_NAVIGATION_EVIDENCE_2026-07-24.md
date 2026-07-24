# Commercial Production Workflow Navigation Evidence

Date: 2026-07-24

## Release chain

- Compact Commercial navigation:
  - PR `#196`
  - merge `613323a087c49447d82de279bf9e1c6734e56635`
  - Render deployment `dep-d9hqearbc2fs739ptvr0`
- Inventory Support create-action semantics:
  - PR `#198`
  - merge `ab725c981a2999ae1cab1537a374d4aa23b24cc6`
  - Render deployment `dep-d9hqlhupbkes738a7vf0`
- Product Trial readable record choices:
  - PR `#199`
  - merge `45e8be13a8d931526e837b81455cd30b68a05283`
  - Render deployment `dep-d9hqq8f15fvs73euuucg`
- Product Batch readable record choices:
  - PR `#200`
  - merge `b81cb0d1b1a99df0f84f54bdec2f22de8f558257`
  - Render deployment `dep-d9hqubmpbkes738agctg`
- Inventory Support readable item types and record choices:
  - PR `#201`
  - merge `90d565fe30a0badfb4bf4dbe07003cbf3dc92b1d`
  - Render deployment `dep-d9hr1t19rddc73b365qg`
- Compact shared-page overlap correction:
  - PR `#202`
  - source commit `bc8ad2510f083420bcc6461b5fd6ab1a66c306f4`
  - merge `1b998f992dbe0f6c17ef3b4f09db71842b26cbcb`
  - Render deployment `dep-d9hr7684n6ts73eui1i0`
- Product Lines heading hierarchy:
  - PR `#204`
  - source commit `63fec2aae62ba2ca9f69faa77416d7ce29bc143a`
  - merge `e19854836e2adaf6b3d379ca9ee11842cfe72e50`
  - Render deployment `dep-d9hrg9bbc2fs739qvldg`
- Product Batches heading hierarchy:
  - source and main commit `777280e23a6b018b1829544bc33a9b6aaf1856d9`
  - Render deployment `dep-d9hrufepbkes738bhsc0`
  - GitHub pull-request creation was unavailable through the connector, GraphQL,
    and REST; the validated one-commit branch was fast-forwarded to `main`
    without force after confirming its parent was the then-current `main`.
- Product Trials heading hierarchy:
  - source and main commit `aab88d1be5a52485d90580855e7ff40fabd9166c`
  - Render deployment `dep-d9hs5a77f7vs738e0blg`
  - GitHub pull-request creation remained unavailable; the full branch CI
    passed before the one-commit branch was fast-forwarded to the unchanged
    `main` without force.
- Inventory Support heading hierarchy:
  - source and main commit `9d8236884453d789491bb565bfe0566f002926a8`
  - Render deployment `dep-d9hsb7jeo5us738e8f5g`
  - The full branch CI passed before the one-commit branch was fast-forwarded
    to the unchanged `main` without force.
- Product Trial Evidence Runs heading hierarchy:
  - source and main commit `1e36fd94672f6fc355d2b65776317dee1afc5486`
  - Render deployment `dep-d9hsgt3eo5us738edlmg`
  - The full branch CI passed before the one-commit branch was fast-forwarded
    to the unchanged `main` without force.

Production base URL: `https://growpathai.com`

Latest tested production merge:
`1e36fd94672f6fc355d2b65776317dee1afc5486`

Latest production retest timestamp: `2026-07-24T16:29:05-04:00`

## Session and evidence type

- Existing authenticated Commercial workspace session in the in-app Browser.
- Production DOM inspection and direct, non-destructive control activation.
- Compact Browser viewport: 673 by 880 CSS pixels.
- Render Dashboard inspection tied each release to its exact commit and deployment.
- No product line, product, batch, trial, evidence run, inventory record, order,
  lead, campaign, course, live, or analytics event was submitted or created.

No screenshot or video file is claimed by this record.

## Production checks

### Compact navigation

The live `More` destination exposed:

- Courses, Lives, and Forum/Q&A under Learning and engagement.
- Orders and Analytics under Sales and measurement.
- Product Lines, Product Batches, Product Trials, and Inventory Support under
  Products and production.
- Profile and Tools under Workspace.

The compact tab list retained Dashboard, Storefront, Products, Feed, and More.
Product Lines also opened successfully in the same signed-in Commercial session.

### Product Lines

Production route:
`https://growpathai.com/home/commercial/product-lines?release=e19854836e2adaf6b3d379ca9ee11842cfe72e50&verify=product-lines-headings-live`

Before PR `#204`, the route exposed the navigator's `Product Lines` heading and
a second visual page title as generic text. Create Product Line, the saved-line
list, Line-level public page context, and Brand-type examples were also generic
text, leaving the page without a useful section outline.

The final production DOM exposed exactly one level-one `Product Lines` page
heading and four level-two workflow headings: Create Product Line, Product Lines,
Line-level public page context, and Brand-type examples. The account had no
saved product lines, so no level-three record heading was present and no product
line was created.

### Product Trials

Production route:
`https://growpathai.com/home/commercial/trials?release=aab88d1be5a52485d90580855e7ff40fabd9166c&verify=product-trials-headings-live`

The zero-record account exposed the correct next action for every readable choice:
Create Product, Create Product Line, Create Product Batch, and Create Evidence
Run. The advanced control exposed the four direct ID fields without submitting a
trial.

The final production DOM exposed exactly one level-one `Product Trials` page
heading and five level-two workflow headings: Create Product Trial, Product
Trials, Evidence collection loop, Claim guard, and Publishable result. The
account had no saved trials, so no level-three record heading was present and no
trial was created.

### Product Batches

Production route:
`https://growpathai.com/home/commercial/batch-planner?release=777280e23a6b018b1829544bc33a9b6aaf1856d9&verify=product-batch-headings-live`

The zero-record account exposed Create Product, Create Product Line, and Create
Evidence Run. The advanced control exposed the three direct ID fields without
submitting a batch.

The final production DOM exposed exactly one level-one
`Soil & Nutrient Batch Planner` page heading and six level-two workflow
headings: Commercial batch fields, Create commercial batch, Current batches,
From formula to product, Effectiveness loop, and Naming rule. Product Batches
remained the navigation destination label. The account had no saved batches, so
no level-three record heading was present and no batch was created.

### Inventory Support

The inventory list exposed the authorized create entry point as the named button
`Create inventory support record`.

Inventory list route:
`https://growpathai.com/home/commercial/inventory?release=9d8236884453d789491bb565bfe0566f002926a8&verify=inventory-headings-live`

The final inventory-list DOM exposed exactly one level-one
`Commercial Inventory Support` page heading and three level-two workflow
headings: Stock overview, Inventory support scope, and Inventory records. The
account had no saved inventory records, so no level-three record heading was
present and no record was created.

Final production route:
`https://growpathai.com/home/commercial/inventory/new?release=1b998f992dbe0f6c17ef3b4f09db71842b26cbcb&verify=inventory-create-overlap-fix-live`

The creation form exposed:

- named choices for Product, Ingredient, Packaging, Plant, Genetics, Equipment,
  Course, Service, Retail item, and Not selected;
- Create Product when no saved Product was available;
- Create Evidence Run when no saved Product Trial Evidence Run was available;
- a named advanced-fields control; and
- a disabled create action until the required name is present.

The final pointer retest stayed on the Inventory Support route and exposed Custom
item type, Linked product ID, Linked ingredient ID, Linked genetics ID, and
Linked product trial evidence run ID. No record was submitted.

### Product Trial Evidence Runs

Production route:
`https://growpathai.com/home/commercial/evidence-runs?release=1e36fd94672f6fc355d2b65776317dee1afc5486&verify=evidence-runs-headings-live`

The final production DOM exposed exactly one level-one
`Product Trial Evidence Runs` page heading and six distinct level-two workflow
headings: Evidence run overview, Create Product Trial Evidence Run, Current
product trial evidence runs, Advanced planning tools, Evidence-to-claim
guardrails, and Trial setup checklist. The account had no saved evidence runs,
so no level-three record heading was present and no evidence-run record was
created.

The correction also replaced the duplicate generic `Advanced` and `How it works`
section names with workflow-specific labels while leaving the underlying
evidence policy and record model unchanged.

## Deployment service correction

Render contained two services watching the same repository and `main` branch:

- `growpath-frontend` (`srv-d8ulmu3eo5us73e2otmg`) is the production Static
  Site. Its `EXPO_PUBLIC_API_URL` was verified as
  `https://api.growpathai.com`, and commit
  `1e36fd94672f6fc355d2b65776317dee1afc5486` deployed successfully as
  `dep-d9hsgt3eo5us738edlmg`.
- `growpath-commerical-frontend` (`srv-d8uljiraml3c73dnj3f0`) is an obsolete
  duplicate Node Web Service. It was independently rebuilding every commit with
  malformed `EXPO_PUBLIC_API_URL=https://` and generating false failed-deploy
  results.

Automatic deploys were turned off for the obsolete duplicate at
`2026-07-24T16:29:05-04:00`. The service was not deleted, and the production
Static Site was not modified.

## Finding and correction

Before PR `#202`, the 673-pixel compact layout applied row-oriented flex sizing
to a column layout. The main form shrank while its contents overflowed, allowing
the lower campaign rail to cover the advanced-fields button. DOM hit testing
showed the button at approximately `left 36.7`, `top 534.7`, `width 179.9`, and
`height 33.3`, while the intercepted campaign link began at approximately
`top 533.0`. Two exact-name pointer clicks opened
`/store/triple-bag-genetics` instead of the advanced fields.

PR `#202` applies flexible width allocation only to the wide row layout. Compact
main content and campaign rails now retain natural document height with no flex
shrink. The exact production pointer action then remained on the Inventory
Support route and expanded the intended fields.

## Automated verification

- A 28-test focused AppPage, Feed, Inventory Support, and knowledge-registry run
  passed, followed by a 32-test broader Commercial workflow and Inventory
  Support run before PR `#202`.
- The visual-polish contract passed.
- Targeted ESLint completed with no errors.
- `git diff --check` passed.
- PR `#201` post-merge Frontend CI run `30117668136` passed.
- PR `#201` post-merge Production Build Preflight run `30117668225` passed.
- PR `#202` Frontend CI run `30118163267` passed.
- Merge `1b998f992dbe0f6c17ef3b4f09db71842b26cbcb` Frontend CI run
  `30118385912` passed.
- The same merge's Production Build Preflight run `30118385687` passed.
- The Product Lines-focused Commercial/header/knowledge run passed 36 tests.
- PR `#204` Frontend CI run `30119419615` passed.
- Merge `e19854836e2adaf6b3d379ca9ee11842cfe72e50` Frontend CI run
  `30119646653` passed.
- The same merge's Production Build Preflight run `30119646643` passed.
- The Product Batches-focused Commercial/header/knowledge run passed 36 tests;
  targeted ESLint, the visual-polish contract, and `git diff --check` also
  passed.
- Product Batches branch CI run `30120604743` passed.
- Main commit `777280e23a6b018b1829544bc33a9b6aaf1856d9` Frontend CI run
  `30121234078` passed.
- The same commit's Production Build Preflight run `30121234081` passed.
- Product Batches evidence commit `d3aca0da588a0ac991ea0dac0af53671e6bd1994`
  Frontend CI run `30121578916` passed.
- The Product Trials-focused Commercial/header/knowledge run passed 36 tests;
  targeted ESLint completed with no errors, Prettier passed, the visual-polish
  contract passed, and `git diff --check` passed.
- Product Trials branch CI run `30121714451` passed.
- Main commit `aab88d1be5a52485d90580855e7ff40fabd9166c` Frontend CI run
  `30121888930` passed.
- The same commit's Production Build Preflight run `30121888897` passed.
- Product Trials evidence commit `ad4c42579126125d29751c9c5f8e84dbadf51af1`
  Frontend CI run `30122238532` passed.
- The Inventory Support-focused Commercial/header/knowledge run passed 36
  tests; targeted ESLint completed with no errors, Prettier passed, the
  visual-polish contract passed, and `git diff --check` passed.
- Inventory Support branch CI run `30122469759` passed.
- Main commit `9d8236884453d789491bb565bfe0566f002926a8` Frontend CI run
  `30122755475` passed.
- The same commit's Production Build Preflight run `30122755447` passed.
- Inventory Support evidence commit
  `86fee61e6585d758a26f3269e1086308cc347492` Frontend CI run
  `30123115549` passed.
- The Product Trial Evidence Runs-focused Commercial/header/knowledge run passed
  36 tests; targeted ESLint completed with no errors, Prettier passed, the
  visual-polish contract passed, and `git diff --check` passed.
- Product Trial Evidence Runs branch CI run `30123296683` passed.
- Main commit `1e36fd94672f6fc355d2b65776317dee1afc5486` Frontend CI run
  `30123550929` passed.
- The same commit's Production Build Preflight run `30123551244` passed.

## Remaining acceptance work

- Exercise intentional Product Line, Product, Product Batch, Product Trial,
  Evidence Run, and Inventory Support create/edit/reload flows with owner-approved
  records.
- Exercise public storefront and outside-user handoffs against those records.
- Complete real product checkout, order, lead, analytics, refund, and dispute
  evidence where applicable.
- Complete desktop, true mobile-device, keyboard/focus, font-scaling, contrast,
  and screen-reader review.
- Capture genuine final-SHA screenshots and video.
- Complete independent outside-user acceptance.
- Keep the requested inline Forum discussion accordion in the documented
  post-Commercial follow-up; it is not claimed complete here.
