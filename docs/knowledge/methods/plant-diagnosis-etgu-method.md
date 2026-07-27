# Plant Diagnosis — ETGU

Read the pattern. Read the medium. Read the environment. Read the numbers. Then name likely causes.

Required evidence includes old/new growth location, distribution, progression, whole plant and close media, medium/root-zone behavior, watering/feed/topdress history, environment, pH/EC and crop stage. The interface must ask for progression explicitly, label temperature units, and preserve pattern, root-zone, environment, measured-number, and attached-photo context when a user answers the follow-up question. Blank numeric fields are missing evidence and must never be coerced to zero. Consider deficiency, excess, lockout, antagonism, water/root issues, environment-limited uptake, pests/disease, spray/light/physical damage, organic release timing and salt buildup.

Stage and symptom location must start as unknown unless they come from explicit structured context or the user selects them. Do not silently submit vegetative stage or upper-growth location as user evidence. Results must keep overall confidence, ranked-candidate confidence, health status/severity, and action urgency distinct; when the provider omits overall confidence, label it as not provided and show any ranked-candidate percentage under its own name.

Output likely causes with evidence, counter-evidence, missing information and discriminating next checks. Say “consistent with a calcium transport issue” rather than declaring a calcium deficiency when humidity, roots, pH or K/Ca/Mg competition could match.

## Image evidence behavior

Photo uploads must never imply that image pixels were inspected when the active provider is text-only. In that state, preserve the photos as linked evidence, label visual analysis as not performed, and require written symptom observations before producing triage. The UI must state what the current engine can use.

When image analysis is available, request a whole-plant context photo, a photo showing symptom distribution, and sharp close-ups of both leaf surfaces. A photo-only result must report whether visual analysis was actually performed and ask for replacement media when blur, lighting, distance, or missing leaf-surface coverage prevents useful review.

Diagnosis and IPM may accept up to 12 photos so a user can include zoomed-out context, distribution across plants, affected and unaffected tissue, leaf tops and undersides, macro signs, root-zone evidence, and a trap or follow-up view without deleting useful evidence. The count is a ceiling, not a requirement. Reject obviously invalid or tiny files before upload and billing. Metadata alone cannot prove focus, lighting, glare, color accuracy, subject relevance, or complete view coverage; those failures require explicit image-review findings and precise retake instructions.

Image review must evaluate target clarity, not only whole-frame quality. A sharp wide photo can still be diagnostically limited when the symptom occupies a small, unmarked region. Ask the user to describe or mark the intended target and add a close target view. When an IPM frame contains multiple organisms, objects, or size classes, list defensible visible traits separately, do not assume the largest or most obvious subject is the intended pest, and request a dedicated macro when the target remains ambiguous.

Diagnosis, IPM Scout, and Crop Identification may each accept one private source video shorter than 10 minutes, with 9 minutes 59 seconds as the enforced maximum. Preserve the source video as non-AI evidence and extract up to 12 timestamped candidate still frames spanning the timeline on the user's device. Only uploaded still frames are eligible for provider image review, and each counts toward the ordinary 12-photo ceiling. Each frame must independently pass the workflow's context, target, focus, lighting, glare, color, and view-role checks. Do not describe this as direct video or motion analysis, infer continuity between sampled frames, or rebuild detail hidden by motion blur, compression, occlusion, or clipped highlights.

Community and social posts may supply the language people use for questions, candidate QA cases, and poor-photo negative controls only. Facebook content must not be automatically collected without Meta authorization. Private-group access also requires the relevant group access and creator permission before a post or image can be retained. Do not use likes, comments, captions, or group consensus as the expected diagnosis. A strong evaluation case needs image-level rights, de-identification, contextual evidence, a separately confirmed outcome, and Tier A cross-checking. Poor but rights-reviewed cases may test pre-upload rejection and retake guidance. Neither set is model-training data.

`Crime Pays But Botany Doesn't` may be used as Tier C educational and QA context for observation vocabulary, field habit, plant-family pattern recognition, flower and leaf morphology, ecological context, and candidate discriminating questions. Do not copy or retain its video, audio, frames, transcripts, or thumbnails without creator permission, and do not use a host identification as GrowPath ground truth. Cross-check identification rules and candidate taxa against Tier A botanical keys, government plant records, herbarium evidence, or university extension sources. Never use the channel as sole support for diagnosis, IPM treatment, toxicity, edibility, legal status, or a species confirmation.

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

Newly added IPM or diagnosis photos must follow the same explicit boundary. The media picker
must state that adding the file approves AI use for the current workflow only and not model
training, then persist the uploaded evidence as AI-usable. A successfully uploaded file must
not be stranded in a non-AI-usable state; a failed upload must remain visible and must never be
sent or billed.

The UI must disclose the AI-credit cost before each provider-backed action. Photo
prefill and the structured GPT second opinion are separate billable actions. If the
main scout action automatically includes the second opinion, its visible label must say
so and state the one-credit cost; the result must record the actual charge or zero after
a failed/refunded, unavailable, or insufficient-credit provider attempt. Do not call a
combined billable action a free calculator.

Photo-prefill feedback must count only non-empty values actually placed into the form.
Leave unknown or empty provider values blank, and normalize returned lists into readable
comma-separated evidence instead of exposing raw empty arrays such as `[]` as observations.
Photo review must not prefill plants checked, plants affected, or sticky-trap counts because
those are scout measurements, not facts established by an image. Unknown placeholders such
as `not determined`, `not performed`, `not provided`, or `none documented` remain blank and
must not inflate the filled-field count; `pestSeen: not confirmed` may remain as an explicit
organism-identity limitation.

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

## Field-botany identification workflow

Crop Identification uses a field-botany narrowing method informed by plant-systematics teaching, including the public Crime Pays But Botany Doesn't reading-list emphasis on synapomorphies, family/genus traits, habitat, and associated plant community. That channel remains Tier C method inspiration only; it is not taxonomic ground truth, and GrowPath does not copy or retain its videos, audio, frames, transcripts, or thumbnails without permission.

Collect up to 12 role-diverse photos or extracted still frames: whole plant in habitat, leaf top, leaf underside, stem/node or bark, flower, fruit/seed, and diagnostic special structures. Optional structured context includes growth habit, plant size, leaf arrangement/type/margin/venation, stem traits, flower presence/symmetry/parts/inflorescence, fruit type, special structures, direct smell/sap/texture observations, wild versus cultivated status, indoor/outdoor/greenhouse setting, privacy-controlled region, observation date/season, habitat, substrate/geology, and associated plants. Never instruct a user to taste an unknown plant.

Narrow results in this order:

1. broad group;
2. visible and user-recorded morphology;
3. likely family;
4. possible genera;
5. possible species only when diagnostic evidence supports it; and
6. external name, range, habitat, season, and lookalike verification.

Return ranked candidates with rank, confidence, supporting evidence, counter-evidence, missing evidence, required next photos, and discriminating next questions. High species confidence requires multiple diagnostic structures, compatible region and habitat, lookalike review, and recorded authoritative source support. Otherwise retain the defensible family, genus, or working-candidate rank. User confirmation, uncertainty, and rejection are saved decisions with timestamps; user confirmation does not mean expert or external-source verification.

The calculator itself does not query a botanical database. When no lookup occurred, return `required_not_performed`, an empty source-record list, and recommended source IDs rather than invented citations or range matches. Verification may use USDA PLANTS and regional floras for jurisdictional distribution, Kew POWO/WCVP for accepted vascular-plant names and synonymy, GBIF for taxonomy and occurrence leads, and iNaturalist only as a Tier C observation/community-identification lead. A future live lookup must record the exact record URL or identifier, access time, scope, match result, conflicts, and source-specific limitations.

## Crop identity confirmation

Species/crop identification suggestions remain drafts until the user presses an explicit confirmation action. Confirmation must write the common name, scientific name when known, cultivar separately, aliases, confirmation provenance, timestamp, and source tool run to the selected grow or plant. A grow-level confirmation also updates crop tags and interests so downstream diagnosis and crop-specific tool visibility can use the same identity. Never infer or persist a cultivar from appearance alone.

Crop identification must run without a grow. Grow and plant context are optional attachments used for private history, saving, logs, and follow-up tasks; they are not prerequisites for inspecting uploaded media or returning a draft identity. Collect photo evidence before presenting the image-analysis action. User confirmation is an explicit result action, not a free-form true/false input. The result must state whether image pixels were actually analyzed. A clear cannabis flower or harvested bud may support a draft crop-level identification when visible bracts/calyxes, pistils, resinous sugar leaves, trichome coverage, and inflorescence structure are consistent. Do not require a fan-leaf photo when the flower is independently recognizable, and never infer a cultivar/strain from bud appearance.

When exact species is unresolved but the evidence supports a defensible common, genus, or family-level working candidate, surface that candidate with its actual confidence and limitations instead of replacing it with a confirmation placeholder. `Not confirmed` is reserved for cases where no useful plant candidate is defensible; every candidate still remains a draft until the user confirms it.

When the server confirms that crop-identification pixels were analyzed, the calculator result and saved ToolRun must preserve that provenance: requested/performed state, exact photo count, provider/model label, image quality, visible identifying traits, evidence IDs, and limitations. The reopened Saved Run must surface those details instead of hiding the nested provenance object. Do not discard server-attested vision metadata and then label the same result as text-only or unanalyzed. An attachment without server-attested analysis must remain explicitly unanalyzed.

Plant diagnosis uses the same server-side OpenAI credential as other image-capable GrowPath AI workflows. A successful image request must record that image analysis was requested and performed, the number of photos inspected, and the provider/model label. A failed or text-only request must say that pixels were not analyzed and request written observations or better evidence rather than presenting a generic result as visual analysis.
