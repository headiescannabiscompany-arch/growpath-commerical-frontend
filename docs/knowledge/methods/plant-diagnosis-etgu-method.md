# Plant Diagnosis — ETGU

Read the pattern. Read the medium. Read the environment. Read the numbers. Then name likely causes.

Required evidence includes old/new growth location, distribution, progression, whole plant and close media, medium/root-zone behavior, watering/feed/topdress history, environment, pH/EC and crop stage. The interface must ask for progression explicitly, label temperature units, and preserve pattern, root-zone, environment, measured-number, and attached-photo context when a user answers the follow-up question. Blank numeric fields are missing evidence and must never be coerced to zero. Consider deficiency, excess, lockout, antagonism, water/root issues, environment-limited uptake, pests/disease, spray/light/physical damage, organic release timing and salt buildup.

Output likely causes with evidence, counter-evidence, missing information and discriminating next checks. Say “consistent with a calcium transport issue” rather than declaring a calcium deficiency when humidity, roots, pH or K/Ca/Mg competition could match.

## Image evidence behavior

Photo uploads must never imply that image pixels were inspected when the active provider is text-only. In that state, preserve the photos as linked evidence, label visual analysis as not performed, and require written symptom observations before producing triage. The UI must state what the current engine can use.

When image analysis is available, request a whole-plant context photo, a photo showing symptom distribution, and sharp close-ups of both leaf surfaces. A photo-only result must report whether visual analysis was actually performed and ask for replacement media when blur, lighting, distance, or missing leaf-surface coverage prevents useful review.

Every result must provide a discriminating follow-up question. A follow-up must carry the prior draft crop-identity provenance forward: merely supplying a crop name in grow or form context is not an explicit confirmation, and a visual suggestion remains a visual suggestion until the user uses the confirmation action. Saved diagnoses, journal entries, tasks, attached evidence, and user-confirmed outcome feedback remain linked to the selected grow and plant.

When a selected grow already contains saved photos, diagnosis must let the user
explicitly reuse those private grow-log photos instead of requiring duplicate uploads.
Reuse is opt-in per photo: show the source log, create a diagnosis-purpose evidence
link only after selection, preserve grow/plant/log provenance, and state that the photo
will be included in the diagnosis request but not used for model training. Never send
an existing private photo merely because it is present in the grow history.

## IPM Scout

IPM Scout is a crop-neutral observation and decision workflow. A grow or facility adds
history, plant scope, logs, tasks, and outcome tracking, but the structured scout may be
run without one. The form must start with unknown values rather than invented example
observations.

Collect crop/stage when known, scout zone, plants checked and affected, within-plant and
across-plant distribution, progression over a stated interval, direct organism/sign
observations, damage pattern, leaf-underside findings, magnification, dated trap count
with location/exposure context, measured environment/root-zone conditions, recent
actions, and media. A raw trap count without comparable placement and exposure is not a
pressure trend.

The local result ranks working hypotheses and exposes readiness, severity, supporting
evidence, counter-evidence, competing candidates, missing information, contributing
conditions, and discriminating next checks. It may offer only these treatment
categories: monitor, isolate, remove damaged material, improve airflow, reduce leaf
wetness, sanitation, sticky traps, biological control, mechanical removal, consult
label/extension, and professional testing. It must not emit pesticide products or
doses. Product, crop/site legality, label, safety, re-entry, and harvest restrictions
remain separate checks after identity is sufficiently supported.

The image-capable assistant and the GPT structured second opinion are distinct evidence
steps. Carry the photo provider, count, quality, evidence used, and limitations into the
saved scout. The structured GPT pass reviews that saved evidence but must say that it did
not independently inspect photo or video pixels. Show GrowPath and GPT results together
with a normalized agreement state.

When a selected personal grow already has photos in its logs, IPM Scout must offer those
photos as reusable evidence. Reuse is opt-in per photo and must name the source log before
selection. Create a separate IPM-purpose evidence link without re-uploading the image,
preserve grow/plant/log provenance, and never send private grow media to the provider merely
because it exists. The same photo count limit applies to saved and newly uploaded photos.
State that selected photos are included only in the current IPM request and are not used for
model training.

The UI must disclose the AI-credit cost before each provider-backed action. Photo
prefill and the structured GPT second opinion are separate billable actions. If the
main scout action automatically includes the second opinion, its visible label must say
so and state the one-credit cost; the result must record the actual charge or zero after
a failed/refunded, unavailable, or insufficient-credit provider attempt. Do not call a
combined billable action a free calculator.

The user may mark the result as a likely working hypothesis, uncertain, or rejected.
“Likely” never means confirmed identity. Save that decision with its timestamp in the
ToolRun and IPM module record, then create comparable repeat-scout, treatment-decision,
and outcome-review tasks when a grow or facility is attached.

Runtime IPM outputs cite UC IPM's
[Monitoring with Sticky Traps](https://ipm.ucanr.edu/agriculture/floriculture-and-ornamental-nurseries/monitoring-with-sticky-traps/)
for comparable trap trends plus direct plant inspection, and Penn State Extension's
[Designing a Scouting Plan](https://extension.psu.edu/high-tunnel-vegetable-crops-designing-a-scouting-plan)
for standardized scouting and the limits of sticky cards for non-winged pests and
unobserved life stages. These support the workflow, not a crop-independent treatment
threshold or organism identification.

## Crop identity confirmation

Species/crop identification suggestions remain drafts until the user presses an explicit confirmation action. Confirmation must write the common name, scientific name when known, cultivar separately, aliases, confirmation provenance, timestamp, and source tool run to the selected grow or plant. A grow-level confirmation also updates crop tags and interests so downstream diagnosis and crop-specific tool visibility can use the same identity. Never infer or persist a cultivar from appearance alone.

Crop identification must run without a grow. Grow and plant context are optional attachments used for private history, saving, logs, and follow-up tasks; they are not prerequisites for inspecting uploaded media or returning a draft identity. Collect photo evidence before presenting the image-analysis action. User confirmation is an explicit result action, not a free-form true/false input. The result must state whether image pixels were actually analyzed. A clear cannabis flower or harvested bud may support a draft crop-level identification when visible bracts/calyxes, pistils, resinous sugar leaves, trichome coverage, and inflorescence structure are consistent. Do not require a fan-leaf photo when the flower is independently recognizable, and never infer a cultivar/strain from bud appearance.

Plant diagnosis uses the same server-side OpenAI credential as other image-capable GrowPath AI workflows. A successful image request must record that image analysis was requested and performed, the number of photos inspected, and the provider/model label. A failed or text-only request must say that pixels were not analyzed and request written observations or better evidence rather than presenting a generic result as visual analysis.
