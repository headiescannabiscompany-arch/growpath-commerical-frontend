# W04 — New HeyCatch audit, October 4, 2026

Source: https://app.heycatch.ai/audit/hck_pk_Vu7gSIhkxVCmtc6M8S_lkn4S_EQjzMOE?surface=website

Read afresh after A06-20 Facility recovery was released. All six expanded
dimension dialogs and the entire actual action plan were read before editing.
This is a new report that explicitly credits W01's changes, not its old baseline.

## Immutable current baseline

Five scored dimensions total **68/100** (19+18+5+13+13). Brief fit is separate.

| Finding | Current score | Status | Required work / disposition |
| --- | --- | --- | --- |
| D1.1 Hook | 5/6 | Partial | Make the grower's win explicit; preserve full-mark title/meta work. |
| D1.2 Pain match | 4/5 | Partial | Fragmented-record pain currently appears below hero. |
| D1.3 JTBD coverage | 3/4 | Partial | Name this run's lessons surviving to the next run. |
| D1.4 Objection handling | 3/3 | Pass | Untouched. |
| D1.5 Desired-result visualization | 0/3 | Fail | Real timeline/diagnosis/Facility product views; no fabricated outcomes. |
| D1.6 Audience language | 4/4 | Pass | Preserve. |
| D2.1 5-second comprehension | 5/7 | Partial | Actual hero use-case visual; retain primary buyer. |
| D2.2 CTA hierarchy | 4/5 | Partial | View-only no-signup sample grow. |
| D2.3 Visual hierarchy and scroll flow | 3/5 | Partial | Real product imagery, not generic decoration. |
| D2.4 Friction and navigation | 3/4 | Partial | Preview before registration. |
| D2.5 Mobile experience | 2/4 | Partial | Real 375x812 home/pricing/navigation/form checks. |
| D2.B Scope honesty bonus | +1/2 | Partial bonus | Explicit who-this-is-not-for line. |
| D3.1 Quantity proof | 0/4 | Fail | Verified real aggregate or permissioned avatars; unpublished until evidenced. |
| D3.2 Story proof | 0/5 | Fail | Five real permissioned quotes/photos/context/outcomes; unpublished until supplied. |
| D3.3 Founder-led trust | 2/4 | Partial | Supplied real portrait, YouTube, homepage founder mention. No invented X/LinkedIn. |
| D3.4 Transactional trust | 3/4 | Partial | Real preview; keep accurate Free/payment/refund disclosures. |
| D3.5 Third-party/recency | 0/3 | Fail | Genuine dated outside mention required; no fake badges. |
| D4.1 Pricing accessibility | 2/2 | Pass | Untouched. |
| D4.2 Tier and offer design | 4/4 | Pass | Plan prices, allowances, annual savings and comparison remain unchanged. |
| D4.3 Conversion mechanics | 4/5 | Partial | Add factual value anchor below Pro annual saving. |
| D4.4 Pricing vs competitors | 3/4 | Partial | Explain workflow-based rather than per-seat pricing. |
| D4.B Comparison bonus | +0/1 | Not awarded | Four tiers already require table; no manufactured fix or bonus claim. |
| D5.1 Title and description | 3/3 | Pass | Untouched. |
| D5.2 Heading structure | 2/2 | Pass | Preserve one h1 and existing levels. |
| D5.3 Indexable content/comparisons | 2.5/4 | Partial | Third sourced comparison and grow-journal category page. |
| D5.4 Page speed | 3/3 | Pass | Preserve lightweight non-autoplay pages; bound new assets. |
| D5.5 Discovery/schema | 2.5/3 | Partial | Descriptive image alt text; retain existing schema/metadata. |
| Brief fit | 9/10 | Pass | External brief is behind the website; sync brief, not revert site. |

## Actual action-plan order

Quick wins:
1. Add 5 named beta-tester testimonials with photos and outcomes (D3.2).
2. Surface a real usage or community count with visual texture (D3.1).
3. Complete the 'Meet Jay' block with photo and social links (D3.3).
4. Add a value-anchoring line under the Pro Grower price (D4.3).
5. State the per-use-case pricing rationale on the pricing page (D4.4).
6. Add an explicit who-this-is-not-for line (D2.B).

Do this quarter:
1. Add product screenshots with descriptive alt text (D1.5, D5.5, D2.3).
2. Earn and surface one dated third-party signal (D3.5).
3. Publish a third /vs page and one category landing page (D5.3; do not churn full-mark D1.4).
4. Run the real 375px mobile pass (D2.5).
5. Offer a view-only demo of a sample grow (D2.2, D2.4).

Bigger bets: Name the emotional job in the personal-grower hero copy
(D1.3/D1.1; the report labels this a bigger bet but describes low-effort repo copy).

## Quick-win implementation boundary

The first two items remain explicit unpublished slots in publicMarketing.json;
no real testimonials, consented avatars, or verified usage aggregate were supplied.
Do not use staging QA counts as customer proof or query private production records
merely to manufacture a marketing number.

Owner supplied the actual portrait and YouTube URL. Preserve the original image
without AI alteration or invented biography. Existing socialUrl stays null.
The report's nutrient-cost example is not a verified universal cost; the value
anchor instead uses published Pro price and allowance ($10/10 tracked grows).
It states the full-capacity assumption and does not suggest per-grow billing.

## Source and mobile checks

Official GrowTrackr sources, checked October 4: https://growtrackr.app/pricing,
https://growtrackr.app/ai-integrations, https://growtrackr.app/privacy-and-security,
https://growtrackr.app/offline-licensing, https://growtrackr.app/features and
https://growtrackr.app/blog/grow-tent-data-logging. Current pricing describes
optional Pro sync; do not reuse an older blog's no-sync assertion. Price is
advertised $59 once without an unverified currency assumption. Both products
have contextual AI; export formats are not a complete original-media guarantee.

Existing production public UI tested at 375x812 on its same-service
growpath-frontend.onrender.com origin, avoiding logout of the owner's custom-domain
session. Home: no horizontal overflow, CTA above fold, readable hero; navigation
links were only 19px tall. Pricing: labeled focusable table width284/scroll620,
ArrowRight changes scrollLeft0→16. Signup: email/password input types, no page
overflow, no data entered/submitted. This phase increases nav/footer/CTA targets
to44px in both renderers; postrelease measurement remains required.

## Deliberately unfinished proof

Product screenshots/sample grow remain unpublished. Existing QA room capture has
no active cycles; the older synthetic timeline has a recorded media404 limitation.
The owner's public cannabis timeline is not implicit evergreen marketing consent,
and private diagnosis records cannot become ad assets merely because accessible.
Prepare reviewed crop-neutral synthetic records or obtain exact owner permissions.
Do not replace these with fabricated UI/outcomes or a broken demo button.

October4 owner asked whether testimonial collection exists. Current state: proof
slots exist, but no submission/Admin-review system is built. Proposed only:
experience/outcome, preferred public name, optional portrait, explicit publication
consent, manual Admin review and permission withdrawal. Owner subsequently approved
this as separate W05, and clearly labeled synthetic demos as W06. Actual submissions
are still needed; approval does not allow fabricated proof or automatic publication.

## Recovered founder story

Owner directed reuse of their previous account. Retrieved ChatGPT conversation
"Write Founder Story", thread6aa174fc-8354-83e9-9d9e-f0319a1e0e70, user message
39ffefa6-d2be-41b7-b085-79f3308feb93. They wanted AI to empower users rather than
control markets, a feed not driven by hatred, tools of the trade and community,
starting with "A place for growers". About uses a concise first-person edited
summary of that motivation, not unsupported allegations about named companies.
The other-industry goal is future vision, not delivered functionality. Founder
story is recovered, not a remaining request for the owner to repeat it.

Status: local implementation complete; release verification in progress.
No new audit score is claimed; the owner will rerun the audit.
