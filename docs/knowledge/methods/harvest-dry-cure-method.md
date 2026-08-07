# Harvest, Dry and Cure

Harvest readiness combines breeder timing, flower day, usable macro trichome evidence from multiple bud sites, pistils, swell, aroma trend, whole-plant maturity and effect goal. Ordinary photos cannot support trichome percentages; request better media when heads are not sharp/visible.

The photo workflow must show its acquisition checklist before analysis: at least three sharp macro samples from top, middle, and lower bud sites; intact gland heads on bud calyxes in focus; neutral white light without blur, glare, purple LEDs, digital zoom, or heavy compression; and a wider bud-context photo for location. Upload errors, unavailable analysis, incomplete provider responses, and unusable photos must fill no trichome percentages and must repeat actionable retake guidance.

The minimum provider-ready set is therefore four uploaded photos: three macro bud-site samples plus one wider context photo. Block analysis before provider use when the set is incomplete, state how many photos remain, and use no AI credit. A completed provider review costs one AI credit whether the set proves usable or needs better photos; disclose this before the action. Reserve the credit only after grow ownership and private, AI-approved evidence are verified. Refund a provider or completion failure automatically and say whether recovery succeeded before the user retries.

Harvest Readiness accepts up to 12 photos so uneven canopies can include additional representative top, middle, lower, and wider context views. Four remains the minimum provider-ready set; 12 is a ceiling, not a target. Photo count is not role coverage: even 12 usable wide or mid-range photos remain insufficient when three true macros do not resolve individual intact gland heads at top, middle, and lower bud sites. Reject obviously tiny or invalid files before upload. Resolution metadata can warn about likely loss of macro detail, but it cannot establish intact gland-head focus, neutral light, glare, sample location, or representative coverage. The image review must report those limitations and request the exact replacement view.

Send qualified photo evidence to the vision provider at high image detail unless a compatible configured model explicitly supports a higher original-detail mode. The review must return set-level focus, glare, lighting, gland-head visibility and role-coverage checks plus one finding for each supplied image. Each finding records the claimed or visually supported role, the best trichome-rich region, focus, glare, visible-head detail, whether the image can support the distribution and why it was excluded. Digital enlargement can expose existing pixels but cannot recreate detail erased by blur, compression or clipped highlights. Exclude glare-obscured heads; localized glare is acceptable only when separate glare-free, sharp gland heads remain. A model result cannot override these server-side role and quality guards.

A harvest user may attach one private source video shorter than 10 minutes, with 9 minutes 59 seconds as the enforced maximum. GrowPath preserves the source video as non-AI evidence and extracts up to 12 timestamped candidate still frames spanning the timeline on the user's device; only the uploaded still frames are eligible for provider image review. Extracted frames count toward the same 12-photo ceiling and must independently satisfy the ordinary macro, site-role, focus, lighting and glare rules. Apparent cloudiness under glare is not evidence: exclude the obscured frame, then use a separate sharp, glare-free frame to classify visible heads as clear, cloudy or amber. Amber may be easier to distinguish, but it still requires a sharp visible gland head under neutral light. Do not describe this as direct video analysis, motion analysis or detail restoration. If frame extraction fails, keep the source video record, use no frame as AI evidence and tell the user to add sharp still photos.

Enforce cannabis/hemp eligibility at the API boundary as well as in navigation. Eligible context can come from structured account interests/content visibility, structured grow tags/interests, an untagged legacy grow's strain/cultivar field, or an existing cannabis-only workflow record. A crop-neutral account and unrelated horticulture grow must be rejected before evidence bytes are loaded or an AI credit is reserved.

Server results and saved readiness runs must retain the review ID, evidence-asset IDs, number of photos inspected, provider label and model, provider image-detail setting, set-level quality checks, per-image findings, visible traits, limitations, recommendation, confidence, credit status, credits used, and remaining balance. A usable trichome distribution requires the complete acquisition set, usable image quality, neutral lighting, sufficient visible-head detail, non-blocking glare, confirmed top/middle/lower macro roles, a context view, numeric clear/cloudy/amber values totaling about 100%, and server-attested pixel analysis. Otherwise all three percentages remain blank. Manual calculator fields start unknown rather than using example maturity defaults, and missing or invalid trichome values are excluded from readiness scoring instead of silently becoming zero.

The image-analysis response must include an opaque server receipt bound to the successful
AI-usage event, authenticated workspace, canonical grow, optional selected plant, exact selected and analyzed evidence IDs,
normalized trichome-result digest, evidence fingerprint, and review-policy version. Saving or
calculating Harvest Readiness must validate that exact receipt and reconstruct the provider,
quality findings, evidence set, and AI-derived percentages from the server record. A client
payload, analysis ID, provider name, or percentage is not proof that image analysis occurred.
Manual trichome observations remain allowed when no AI-photo claim is submitted, but they must
stay labeled manual rather than inheriting provider provenance.

The receipt's selected evidence set includes every attached still, extracted frame, and private
source video. Its analyzed evidence set includes only the authorized stills and frames actually
sent to vision; the source video remains attached provenance and must never be counted as
visually analyzed. A device-extracted Harvest frame is eligible only when its selected,
protected source video has the same workspace, grow, plant, and purpose lineage and the bounded
frame set passes the shared frame validation. For a device-extracted Harvest set, the selected
frame IDs must equal the complete active linked-frame set for that source video; reject a subset.
Analysis and save must agree on both exact sets and on the optional plant scope.

Personal, Commercial, and Facility Harvest runs use the authorized grow collection for that
workspace. Commercial analysis is scoped to the authenticated Commercial account, while a
Facility run requires an authorized write role and reserves Facility credits. A route account
or grow identifier is never authority by itself. Resolve it against the authenticated workspace
before evidence is loaded or a credit is reserved, and validate the same canonical workspace
and grow again when the result is saved. Persist the canonical grow ID rather than a route alias.

When a qualified photo review fills clear, cloudy, or amber percentages in the readiness form,
apply those values as reviewable visual drafts only to fields the user has not already filled.
Do not remount the form or erase flower day, breeder timing, pistil, bud-swell, aroma, goal, or
other manual observations. Mark every AI-filled percentage as requiring review and preserve its
visual provenance after an edit. Replacing or removing the analyzed evidence invalidates and
clears only still-unreviewed visual drafts; it must not erase user-authored fields.
When the user edits an AI-filled trichome distribution, preserve the submitted values as a
manual override rather than silently restoring the provider percentages or continuing to label
the edited distribution AI-derived. Keep the exact server-attested photo result separately so
the saved run can show what the image review returned and which percentage fields the user
overrode. Reconstruct each unreviewed percentage independently from the attested snapshot; if
the photo set is unusable, remove every still-unreviewed visual draft instead of retaining it as
manual evidence.

Dry/cure combines measured room/container conditions, air dew point, an optional measured surface-to-dew-point margin, airflow, density, duration, aroma, texture and representative interior checks. Room temperature and RH must be simultaneous real readings. Start temperature, RH, airflow and density blank; never replace missing evidence with common targets or plausible defaults. An incomplete measurement set returns `insufficient_evidence`, keeps numeric outputs blank and tells the user what to measure next.

Record days in the current stage and light exposure as explicit evidence. Drying and curing material should remain protected from light, with brief work light distinguished from continuous room light or direct light. Light exposure is a quality-preservation concern supported by `PMID 6643`; it does not determine mold safety. Keep unknown light exposure unknown rather than assuming darkness from a photo or room label.

A 24-hour task is the next measurement/inspection checkpoint, never a finish date. Use 10-14 days as the owner-supplied controlled-drying planning window, with the explicit limitation that material, cultivar, airflow, temperature, RH and handling can shorten or extend it. A hot, fast, low-humidity dry may reach an endpoint in 5-7 days but should be surfaced as a quality-loss or overdry concern, not presented as the preferred target. Longer than 14 days can occur, but it is not recommended as a routine target and must trigger a condition/quality review. No elapsed-time range marks drying complete: require measured trends, representative exterior/interior checks, aroma, texture and an equilibrated container reading. `PMC9404914` supports method-dependent drying variability and the need to avoid a universal clock.

Air temperature minus air dew point describes the saturation margin of the entered air reading; it is not a surface condensation margin. Calculate and label a surface-to-dew-point margin only when the user or a saved sensor record supplies the coldest relevant material, rack, wall, container or package surface temperature. If no surface temperature exists, condensation remains `not_assessed`. During cure, record jar or bag RH only after the reading has equilibrated, together with measurement time, sensor/source and observed duration.

Do not label mold risk as low, safe or ruled out from one room reading, an image or the absence of visible growth. Use cautious concern states, preserve the evidence used, missing information and limitations, and tell the user to inspect representative interior sites when readings, airflow, density, aroma or texture raise concern. Musty/ammonia odor, abnormal texture or visible growth is a stop-and-inspect signal, not an image diagnosis. Photos may document drying structure and visible surface concerns but can never provide temperature/RH values or rule mold in or out.

Dry / Cure Guard is a cannabis/hemp workflow. Require an owned eligible grow at the API boundary before calculating or saving a ToolRun; navigation gating alone is insufficient. Save the measured snapshot, dew point, available surface margin, light condition, stage day, timing limitations, risk signals, sensor/time notes, tasks and final quality outcomes to the linked harvest batch and grow history for run comparison.

The shared Harvest Readiness calculator remains discoverable in Personal Tools for cannabis-enabled users and is also linked from cannabis grow overview and Grow Intelligence surfaces with the grow context attached. Both entry points must open the same canonical `/home/personal/tools/harvest-readiness` workflow. Cannabis grow context comes from structured grow tags/interests or attached cannabis-only workflow evidence. Untagged legacy personal grows may retain cannabis visibility from their legacy strain/cultivar field, but arbitrary grow names must never be used to guess crop identity.
