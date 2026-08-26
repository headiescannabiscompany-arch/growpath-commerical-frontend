# Plant Diagnosis — ETGU

Read the pattern. Read the medium. Read the environment. Read the numbers. Then name likely causes.

Required evidence includes old/new growth location, distribution, progression, whole plant and close media, medium/root-zone behavior, watering/feed/topdress history, environment, pH/EC and crop stage. The interface must ask for progression explicitly, label temperature units, and preserve pattern, root-zone, environment, measured-number, and attached-photo context when a user answers the follow-up question. Blank numeric fields are missing evidence and must never be coerced to zero. Consider deficiency, excess, lockout, antagonism, water/root issues, environment-limited uptake, pests/disease, spray/light/physical damage, organic release timing and salt buildup.

Stage and symptom location must start as unknown unless they come from explicit structured context or the user selects them. Do not silently submit vegetative stage or upper-growth location as user evidence. Results must keep overall confidence, ranked-candidate confidence, health status/severity, and action urgency distinct; when the provider omits overall confidence, label it as not provided and show any ranked-candidate percentage under its own name.

Output likely causes with evidence, counter-evidence, missing information and discriminating next checks. Say “consistent with a calcium transport issue” rather than declaring a calcium deficiency when humidity, roots, pH or K/Ca/Mg competition could match.

## Image evidence behavior

Diagnosis, IPM, and Crop Identification must inspect the untouched original-resolution
image at high detail and may additionally inspect source-bound enlarged diagnostic crops.
The crops expose existing pixels without replacing or downscaling the original. They must
never count as additional photos, sample sites, view roles, observations, agreement, or
independent evidence. Inspect available enlarged regions before declaring existing detail
unreadable; crop generation failure falls back to the original rather than rejecting it.
For a successful image review, retain and show the exact bounded crop manifest used by the
provider. Full-screen view, save, and export actions must remain authorized to the original evidence
workspace and verify the crop digest against a deterministic regeneration from that original.
The interface must show source-photo number, strategy, source bounds when available, output
size, and the derived-evidence limitation. A missing or mismatched digest is unavailable
evidence, not a reason to synthesize a replacement view.

For Crop Identification, explicitly inspect exposure and target lighting before proposing
an identity. A dark or backlit subject illuminated by a harsh point light or phone flash,
deep shadows, clipped highlights, glare, or a strong color cast is unusable when those
conditions hide leaf, stem, flower, fruit, or true-color characters. The result must set
overall and candidate confidence to low, leave AI-proposed common and scientific identity
fields out of the editable user-input fields, label the result retake-required, and request
evenly exposed neutral or diffuse-light replacements. Limited evidence may retain directly
visible morphology and broader family/genus hypotheses in the evidence review, but it must
not auto-populate a crop name, auto-confirm an identity, or be upgraded to a normal result
by the calculator. A user-entered name remains a user claim and must not be described as
visually confirmed.

Nighttime capture, a dark background, phone-light illumination, or direct flash is a
quality risk rather than an automatic rejection. Judge each photo or extracted video frame
by the diagnostic detail it actually preserves. If sharp, sufficiently exposed morphology
and usable color remain visible, retain that view and allow the set to support a cautious
crop, family, or genus candidate; one glare-obscured or shadowed frame must not invalidate
other compatible usable views. Require a retake only when the lighting, focus, scale, or
occlusion actually hides the characters needed for the proposed identification. When
artificial lighting limits exact color or species certainty but sharp diagnostic structure
still supports a crop, family, or genus, return it as a low-confidence candidate-only result
with targeted follow-up photos; keep editable AI identity fields and confirmation blocked.
That limited-light candidate must be supported by its own affirmative, non-hypothetical,
non-contradicted taxon-discriminating character combination. A generic leaf margin, stem,
or growth habit is not enough. A limited-light Cannabis candidate requires visible
bract/calyx or inflorescence structure together with pistils, resin, or trichome support;
otherwise request targeted retakes instead of retaining the name.
Words naming a structure are not evidence by themselves. Statements such as `trichomes`,
`unable to evaluate trichomes`, `cannot confirm pistils`, or `too dark to resolve the leaf
margin` are missing-evidence statements unless they also contain an affirmative, readable
character and value. An inconclusive comparison is not lookalike separation. These rules
apply to every taxon, not only cannabis/hemp.

Photo uploads must never imply that image pixels were inspected when the active provider is text-only. In that state, preserve the photos as linked evidence, label visual analysis as not performed, and require written symptom observations before producing triage. The UI must state what the current engine can use.

When image analysis is available, request a whole-plant context photo, a photo showing symptom distribution, and sharp close-ups of both leaf surfaces. A photo-only result must report whether visual analysis was actually performed and ask for replacement media when blur, lighting, distance, or missing leaf-surface coverage prevents useful review.

When the provider reports that the submitted image set is unusable for triage, the normalized
diagnosis must remain inconclusive with low overall and candidate confidence. Image-derived
issues must not create urgent status, treatment actions, or completed tasks; return exact
replacement views and allow only cautious monitoring or collection of better evidence. A crop
name supplied by the user or selected record remains user context even when a visual suggestion
conflicts with it. Preserve the user value, surface the visual disagreement as an unconfirmed
alternative, and never silently replace the form's crop or cultivar context. This state must not
emit an issue-detected automation or create an issue log/task as though a diagnosis had been made;
only an explicitly labeled evidence-collection action may be offered.

Diagnosis, IPM Scout, and Harvest Readiness share an evidence-review surface after analysis. It must show whether pixels were actually inspected, the media quality and confidence, provider label, evidence used, counter-evidence, limitations, and exact next photos or checks. A follow-up action reuses the prior structured result and asks the user to add the requested evidence before rerunning; it must never silently upgrade confidence. When a follow-up task is created from a Facility route, it is written to the selected Facility task scope rather than the member's Personal queue.

An IPM GPT second opinion must be fingerprinted to the exact structured evidence
envelope used by the GrowPath primary result. Persist the envelope digest, both answers,
the provider-reported agreement, a deterministic field-by-field comparison, every
candidate/confidence/severity disagreement, and the combined requested follow-up checks.
The deterministic comparison may downgrade a provider's claimed agreement when the
saved candidate fields differ; it must never hide that conflict. Provider completion is
not billing proof. Store zero only when no provider attempt occurred; otherwise show the
charge or refund as unverified until a credit-ledger receipt is attached.

Diagnosis and IPM may accept up to 12 photos so a user can include zoomed-out context, distribution across plants, affected and unaffected tissue, leaf tops and undersides, macro signs, root-zone evidence, and a trap or follow-up view without deleting useful evidence. The count is a ceiling, not a requirement. Reject obviously invalid or tiny files before upload and billing. Metadata alone cannot prove focus, lighting, glare, color accuracy, subject relevance, or complete view coverage; those failures require explicit image-review findings and precise retake instructions.

Oversized mobile photos may be resized and JPEG-compressed on the user's device before
upload so ordinary camera files fit the protected image limit and weak connections do not
carry avoidable bytes. Do not upscale or claim that preparation added diagnostic detail.
On iOS and Android, use the supported native image pipeline to decode HEIC/HEIF, write a
real JPEG, preserve the original preview, and keep the upload at or below 4.5 MiB. A photo
transfer with no progress for 75 seconds, or video transfer with no progress for 90
seconds, must end in a retryable state instead of remaining indefinitely on Uploading.
Keep enough resolution for the intended review, record the prepared MIME type and byte
size, and retain the ordinary focus, glare, lighting, target, and view-role checks. A
connection loss, timeout, or preparation failure must end in a visible retryable failure;
it must never remain indefinitely in an uploading state or enter AI analysis. A successful
binary upload whose evidence record is still pending must be retried by finishing that
record rather than uploading a duplicate file.

Store uploaded diagnostic photos as protected evidence by default. The stable client
upload key must make reservation, completion, and evidence registration safe to retry,
and the upload must be charged to the workspace that is actually using it. Do not expose
the protected photo until its one-part multipart upload returns an ETag and the client
completes that exact part with its stable key and workspace scope. Do not activate a
photo from a bare object-store success when completion cannot confirm the uploaded part.
Never expose the protected original through a public upload URL. When a user explicitly publishes an
eligible Nature observation, create a separate sanitized public derivative for that
observation; withdrawing the observation must not make the protected original public.

Image review must evaluate target clarity, not only whole-frame quality. A sharp wide photo can still be diagnostically limited when the symptom occupies a small, unmarked region. Ask the user to describe or mark the intended target and add a close target view. When an IPM frame contains multiple organisms, objects, or size classes, list defensible visible traits separately, do not assume the largest or most obvious subject is the intended pest, and request a dedicated macro when the target remains ambiguous.

Diagnosis, IPM Scout, and Crop Identification may each accept one private source video shorter than 10 minutes, with 9 minutes 59 seconds as the enforced maximum. Preserve the source video as non-AI evidence and extract up to 12 timestamped candidate still frames spanning the timeline. Diagnosis and IPM Scout may use the established device extraction path. Crop Identification must save only the private source video on the device and use the durable server extraction path; it must not create or upload client thumbnail frames. Only uploaded still frames are eligible for provider image review, and each counts toward the ordinary 12-photo ceiling. Each frame must independently pass the workflow's context, target, focus, lighting, glare, color, and view-role checks. Do not describe this as direct video or motion analysis, infer continuity between sampled frames, or rebuild detail hidden by motion blur, compression, occlusion, or clipped highlights.

When a new or Saved Plant ID retains a private source video without
a completed still-frame set, the authorized server may extract the same bounded number of
timestamped stills from that already protected video. Persist `idle`, `processing`,
`completed`, `partial`, or `failed` extraction state, attempt count, policy/version,
timestamps, friendly error, and generated-frame IDs on the source evidence record. The
interface must resume or poll a persisted processing job, disable AI submission while it
is processing, and offer an explicit retry after `partial` or `failed` without requiring
the video to be uploaded again. Only a `completed` response whose generated photo records
are durably uploaded, AI-approved, workspace-scoped, purpose-matched, and linked to that
exact source video may enter image review. A partial set contributes zero AI evidence.
Re-fetch the exact completed source and ordered frame IDs before enabling identification.
Require every selected generated frame to match the completed source's nonblank extraction
version, extraction attempt, ordered frame index, workspace, purpose, grow/plant lineage,
and exact canonical frame-ID allowlist. Exclude orphan, stale-version, extra, partial, and
client-generated frames. Server
extraction does not make the private source video provider input and does not permit a
claim of motion analysis.

Every client- or server-extracted frame must retain the protected source-video evidence ID and remain
in the same user or Facility, grow, plant, purpose, and selected evidence set as that video.
The source video itself is never counted as visually analyzed. Parent linkage records the
user-submitted association; it does not prove motion analysis or cryptographically prove
that every pixel originated in the video, so the UI must use that narrower wording.

Community and social posts may supply the language people use for questions, candidate QA cases, and poor-photo negative controls only. Facebook content must not be automatically collected without Meta authorization. Private-group access also requires the relevant group access and creator permission before a post or image can be retained. Do not use likes, comments, captions, or group consensus as the expected diagnosis. A strong evaluation case needs image-level rights, de-identification, contextual evidence, a separately confirmed outcome, and Tier A cross-checking. Poor but rights-reviewed cases may test pre-upload rejection and retake guidance. Neither set is model-training data.

The IPM evaluation library may use public-domain USDA ARS or individually rights-verified
IPM Images assets and individual iNaturalist photos licensed CC0 or CC BY. Collection,
observation, or dataset membership never substitutes for image-level rights and label
review. Each admitted case must retain the untouched original; source URL and identifier;
creator/agency and required attribution; exact license; pest, disease, or healthy-control
candidate; visible sign such as body, egg, webbing, frass, stippling, silvering, mines,
chewing, or powdery growth; host and plant region when known; lookalikes; reviewer; and
review date. A caption or community identification is a candidate label, not automatic
ground truth. Confirm organism identity and visible damage against Tier A material, and
keep organism identity separate from the causal claim that it produced the photographed
plant symptom. Exclude noncommercial, no-derivatives, all-rights-reserved, missing-license,
ambiguous-provenance, AI-generated, and unverified scraped media. This is an evaluation
and reference library, not model-training authorization.

`Crime Pays But Botany Doesn't` may be used as Tier C educational and QA context for observation vocabulary, field habit, plant-family pattern recognition, flower and leaf morphology, ecological context, and candidate discriminating questions. Do not copy or retain its video, audio, frames, transcripts, or thumbnails without creator permission, and do not use a host identification as GrowPath ground truth. Cross-check identification rules and candidate taxa against Tier A botanical keys, government plant records, herbarium evidence, or university extension sources. Never use the channel as sole support for diagnosis, IPM treatment, toxicity, edibility, legal status, or a species confirmation.

Every result must provide a discriminating follow-up question. A follow-up must carry the prior draft crop-identity provenance forward: merely supplying a crop name in grow or form context is not an explicit confirmation, and a visual suggestion remains a visual suggestion until the user uses the confirmation action. Saved diagnoses, journal entries, tasks, attached evidence, and user-confirmed outcome feedback remain linked to the selected grow and plant.

Result follow-up questions must remain beside the original result and load the authorized,
immutable source ToolRun plus its exact evidence set; never trust an arbitrary client result
snapshot or silently replace the original result. Show the one-credit cost, provider,
whether any image pixels were inspected, and limitations. Suggested questions must remain
editable before submission. Offer a saved-result follow-up only when the server reports a
stored immutable snapshot and secure follow-up support. IPM snapshots must be created by the
dedicated save route and attest the authorized workspace, exact selected/analyzed evidence,
provider receipt, and normalized result digest; legacy or client-fabricated snapshots must
require a new run. A structured IPM follow-up must be normalized by the server so its prose,
visible observations, hypotheses, confidence, severity, missing information, and next checks
cannot exceed the saved evidence ceilings. For an IPM result, include comparisons,
counter-evidence, and the exact macro or underside view that separates close candidates. A
cannabis/hemp plant-sex
shortcut may appear only when submitted evidence, an explicit crop identity, or permitted
grow context establishes cannabis/hemp. Classify male only from visible staminate or pollen-
sac structures, female only from visible pistillate preflowers/bracts and pistils, and
intersex only when both reproductive structures or visible anthers are supported. Stipules,
stems, or undeveloped nodes alone remain unclear and require sharp node/preflower macro views;
never infer cultivar from this follow-up.

When a selected grow already contains saved photos, diagnosis must let the user
explicitly reuse those private grow-log photos instead of requiring duplicate uploads.
Reuse is opt-in per photo: show the source log, create a diagnosis-purpose evidence
link only after selection, preserve grow/plant/log provenance, and state that the photo
will be included in the diagnosis request but not used for model training. Never send
an existing private photo merely because it is present in the grow history.

A Saved Diagnosis with retained AI-approved photo evidence must offer an explicit re-run
path that authorizes and reloads the exact immutable evidence IDs in the current Personal
workspace. Reopening does not modify the historical result, start analysis, spend a credit,
or carry an old AI-proposed crop identity into the new form. Revalidate that every asset is
an uploaded durable Diagnosis photo approved for AI use; if any exact asset is missing or
ineligible, load none of the set and explain why. A grow or plant is selected only from an
explicit route/context choice or a new user action. Do not silently select the account's
active grow and then describe that grow's crop identity as evidence supplied for an
otherwise grow-optional Diagnosis.

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

Keep four evidence classes separate: a directly observed organism, a directly observed
disease sign, a damage or symptom pattern, and a hypothesis. An AI phrase such as
`powdery-mildew-like growth, not confirmed` is a hypothesis, not a direct organism or
disease-sign observation. One image must not become several independent evidence channels
merely because its finding was copied into the damage field, evidence text, and image-review
metadata. Count independent observation types and role-diverse views, retain provenance for
every AI-prefilled field, and remove the AI-draft label only after the user edits that field.
Editing an AI-prefilled value marks it reviewed but keeps it in the visual-derived evidence
channel; an edit alone must not manufacture a second user-observation channel. AI prefill is
additive: it must preserve explicit user entries and leave unobserved facts blank.

Apply the same boundary inside each written field. A speculative clause such as `unclear
whether this is feeding stippling`, `could be powdery growth`, or `compare thrips versus
mites` may add a candidate or question, but it must not set a direct damage, disease-sign,
organism, or supporting-evidence flag. An explicitly observed character in a separate clause,
such as `fine stippling was observed; the cause remains unclear`, remains observation evidence
while its cause remains a hypothesis.

Negated findings such as `no stippling was observed` are counter-evidence, not supporting
evidence. Instructions and questions such as `look for black frass` do not count as completed
observations. Contrast clauses must retain their separate meaning: `no mites were seen, but
fine stippling is visible` records the stippling while leaving the organism unconfirmed. Only
server-attested, completed media analysis may contribute visible observations. A separate list
of view-role labels is not evidence that a particular view supplied a particular finding; a
view may satisfy a diagnostic gate only when the server attests the role, quality, lighting,
and exact observation together for that view. Client-supplied or failed-analysis text must not
score a candidate, satisfy a photo gate, or bypass the direct-observation requirement.
Candidate confidence and treatment categories must be bound to the exact affirmed clause,
field provenance, and organism-specific morphology that supported that candidate.

White, pale, or reflective leaf marks alone require an unresolved differential rather than
a powdery-mildew headline. Compare superficial white-to-gray powdery or felt-like growth
with thrips or mite feeding injury, spray residue, mineral deposits, dust, glare, physical
damage, and senescence. Powdery mildew may rise above low confidence only when a sharp,
color-reliable close view shows superficial powdery growth and a second independent
discriminator is recorded, such as another role-diverse view or a wipe/transfer observation.
Thrips may rise above low confidence only when compatible silvering, stippling, streaking,
scarring, or distortion is paired with black frass or a sharp direct view of a slender insect
or larva. Medium confidence requires at least two independent evidence channels; high
confidence requires direct magnified morphology, compatible damage/distribution, and
lookalike exclusion. Limited or unusable imagery, a single view, missing target macro, or a
missing underside inspection caps confidence at low. When close candidates remain or the
needed discriminator is absent, headline the result as an unresolved differential and ask
for the exact view or observation that separates them.

Severity is an impact and spread assessment, not a synonym for diagnostic confidence. Without
verified spread/count context—paired plants checked/affected, distribution plus progression,
or a dated and comparable trap count with location, exposure, and method—return severity as
`not_assessed` even if a working hypothesis exists.

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

A Saved IPM Scout with retained AI-approved photos, private source video, or extracted
video frames must offer an explicit re-run path that authorizes and reloads the exact
immutable evidence IDs in the current Personal workspace. Reopening keeps the historical
result immutable and does not start photo prefill, the structured second opinion, or any
credit use. Revalidate the complete set as uploaded, durable, IPM-purpose media approved
for AI use; if an exact asset is missing or ineligible, load none of the set and explain
why. Removing retained evidence from the new draft deselects it without deleting the
protected source asset.

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

AI crop-identification prefill is additive and evidence-scoped. It must preserve every
explicit user-entered context value and may fill only traits directly visible in the
submitted image evidence. It must never invent or overwrite an exact location,
observation date or season, smell/sap/texture or other sensory observation, plant size
or another measurement, or wild-versus-cultivated status. Device coordinates come only
from a separate, user-authorized device-location action; they are not AI-prefill output
and start private.

Persist explicit user-entered identity, morphology, habitat, region, date, setting, and
sensory/context fields in a separate manual-input provenance object. A provider reply must
not erase them or silently turn them into visual findings. Server-attested AI fields are
rebuilt from the exact normalized provider result; manual fields are then added with their
user-entry label. A run with no completed image receipt remains manual/unanalyzed and must
not accept client-written provider, confidence, or visual-result claims.

A Plant ID may save an exact device location privately in its own Saved ToolRun without
a grow, plant, Field Study, or Field Study observation. Private location capture is a
first-class Plant ID action beside photo evidence, not something hidden inside the Field
Study or Nature workflow. A location captured before analysis is provisional until the
Plant ID ToolRun is saved; the interface must say that it is ready to save rather than
already saved. Capturing after analysis updates that same Saved ToolRun. Adding, updating,
or removing this private location never publishes it, changes a Field Study or its linked
observation, confirms identity, or confirms a cannabis/hemp public context. Field Studies
remain optional for collaboration and are required only for the separate public Nature
workflow described below.

A Saved Plant ID remains a complete standalone record. Creating a grow is an optional,
separate path only for a plant the user intends to manage; a wild or incidental finding
must never be forced into Grows. When a defensible common identity exists, Saved Runs may
open a reviewable create-grow draft carrying the common name, supported scientific
candidate, aliases, cultivar when supplied, crop-profile reference, and source ToolRun.
The user must still review and save the grow. Unresolved identities cannot start a
crop-specific grow, and creating or declining a grow never publishes a Nature observation.
Declining or backing out of a Plant-ID-sourced grow draft must return to that exact Saved
Plant ID result without creating a Grow or losing the standalone finding.

When device geolocation is unavailable, denied, or unsupported by the browser host, Plant
ID must offer a deliberate manual-location fallback. On web this should be an interactive
map point plus valid latitude/longitude entry for a known observation place when legacy
media no longer retains location metadata; native may use coordinate entry where the map
is unavailable. Entering coordinates only stages the point and must remain visibly
separate from the final private-save action. The
selected point follows the same private-by-default ToolRun rules as device coordinates and
must not be described as device accuracy. Manual placement never publishes the point or
confirms a Nature observation. In a reopened Saved Run, selecting a point must first stage
it for review; persistence requires a separate, clearly named private-save action. Closing
the picker, discarding the staged point, or changing the selected run must leave the saved
ToolRun unchanged. Nature sharing remains a later, separately consented publish action.

The provider request must receive the complete crop-identification output contract and
the complete bounded user context. Transport limits must never cut off the JSON field
list, final safety rules, or user-supplied context. When a response nevertheless includes
a prohibited inferred field, the client must leave that field blank unless the user had
already entered it explicitly.

Provider quality and confidence are ceilings for every downstream step. `limited` or
`unusable` image quality forces low overall and candidate confidence. `Unusable` evidence,
or `limited` evidence in which the characters needed for even a broader candidate are
hidden, requires a retake-required state. When `limited` artificial-light evidence still
preserves readable diagnostic morphology, the calculator may instead retain only a
crop-, family-, or genus-level candidate with targeted follow-up photos; identity prefill
and confirmation remain blocked. The calculator and saved ToolRun must preserve that
boundary. A usable image set that lacks diagnostic structures may support visible
morphology or a broader hypothesis, but it must not promote a family-level resemblance
into a specific crop or species name. Repeated analysis under the same review policy must
never turn an earlier quality limitation into user-entered evidence or confirmation.

Narrow results in this order:

1. broad group;
2. visible and user-recorded morphology;
3. likely family;
4. possible genera;
5. possible species only when diagnostic evidence supports it; and
6. external name, range, habitat, season, and lookalike verification.

Return ranked candidates with rank, confidence, supporting evidence, counter-evidence, missing evidence, required next photos, and discriminating next questions. High species confidence requires multiple diagnostic structures, compatible region and habitat, lookalike review, and recorded authoritative source support. Otherwise retain the defensible family, genus, or working-candidate rank. User confirmation, uncertainty, and rejection are saved decisions with timestamps; user confirmation does not mean expert or external-source verification.

Species-level evidence requires role-diverse character-and-value observations rather than
one broadly shared structure, plus affirmative lookalike separation. A comparison whose
differences remain inconclusive, unresolved, or not ruled out does not satisfy that gate.
Without recorded authoritative-source verification, an exact species may remain a clearly
limited candidate but cannot be high confidence or available for ordinary AI-draft
confirmation. An explicit user correction is still allowed, but it is stored as a user
claim and does not rewrite the original AI result or become source verification.

Keep common, nursery, and trade names separate from scientific names. When the evidence supports a genus but not an exact species, a genus-level draft such as `Mandevilla spp.` is preferable to an invented species. Withhold plain-language phrases such as "rose plant" from scientific-name and possible-species fields. A withheld or conflicting identity field must downgrade the candidate and the overall identification to low confidence, add explicit counter-evidence, and display a prominent identity-not-verified warning that asks for better evidence before confirmation.

The calculator itself does not query a botanical database. When no lookup occurred, return `required_not_performed`, an empty source-record list, and recommended source IDs rather than invented citations or range matches. Verification may use USDA PLANTS and regional floras for jurisdictional distribution, Kew POWO/WCVP for accepted vascular-plant names and synonymy, GBIF for taxonomy and occurrence leads, and iNaturalist only as a Tier C observation/community-identification lead. A future live lookup must record the exact record URL or identifier, access time, scope, match result, conflicts, and source-specific limitations.

Plant ID evaluation media follows an additional candidate-to-fixture boundary. An
iNaturalist Research Grade wild observation, an iNaturalist captive/cultivated casual
observation, a Wikimedia Commons file, a USDA ARS image, a
caption, a category, or a computer-vision-assisted identification may provide a review
lead, but none automatically establishes the image's taxon, life stage, visible
diagnostic characters, exact reuse rights, or intended-use approval. Candidate
collection must retain per-image provenance and attribution, exclude private coordinates,
copy no media by default, and leave identity, stage, rights, and QA-use decisions pending.
Research-wild and cultivated candidates must be labeled and reviewed separately; neither
quality grade nor captive/cultivated status establishes identity or representative stage.
Promotion into the governed evaluation catalog requires image-level inspection,
commercially compatible rights, Tier A taxonomy or morphology cross-checking, and an
explicit reviewer decision. Evaluation references remain inference QA only and are never
model-training data under the current policy.

## Crop identity confirmation

Species/crop identification suggestions remain drafts until the user presses an explicit confirmation action. Confirmation must write the common name, scientific name when known, cultivar separately, aliases, confirmation provenance, timestamp, and source tool run to the selected grow or plant. A user correction must preserve the rejected AI draft as provenance, present the corrected common identity first, keep exact scientific species unverified when unknown, and request a new whole-plant view, full leaf and underside with node, open flower, and fruit or seed structure for another AI review. A grow-level confirmation also updates crop tags and interests so downstream diagnosis and crop-specific tool visibility can use the same identity. Never infer or persist a cultivar from appearance alone.

When no grow is attached, a confirmed Plant ID must offer a direct **Confirm & Start a
Grow** path. The grow draft carries the confirmed common name, scientific name when
known, aliases, cultivar only when user-supplied, reviewed crop-profile identifier, and
source ToolRun provenance. It must not copy an exact location into a URL, publish a
location, or create the grow until the user reviews and submits the grow form. Manual grow
creation uses the same crop-identity fields and may match a reviewed crop profile so crops
such as tomatoes receive crop-appropriate setup help rather than cannabis-only timing.
Unknown crop facts remain blank or explicitly user-confirmed; a profile search result is not
itself a species confirmation.

Grow creation persists the confirmed crop identity, confirmation provenance, and reviewed
lifecycle path in the same create operation. A successfully created grow must never be
presented as a failed creation merely because a follow-up crop-identity request is unavailable.
Facility owners and managers use the same exact-identity and reviewed-lifecycle boundary when
starting a room or batch grow. Broad Facility crop categories continue to control tool
visibility, but they do not replace the common name, scientific name, aliases, cultivar,
lifespan, production pattern, or dormancy fields. The selected rooms, start date, confirmed
identity, and owner-reviewed lifecycle proposal must persist atomically with the Facility grow.
Viewer and Staff role restrictions remain unchanged.

Facility crop setup also records how the grow starts, plant count, and optional owner- or
source-confirmed establishment and first-harvest planning anchors. These fields follow the same
crop-neutral meaning used in Personal and Commercial grows. Unknown timing remains blank, and
the interface must label it as an editable planning anchor rather than a biological guarantee.
Crop-specific AI setup help must carry the named crop into Facility scope without silently
choosing rooms, dates, lifecycle values, or cannabis-only milestones.

Commercial workspaces inherit the same ordinary crop-aware grow records and connected grow
workspace available to Personal users. Product Trial Evidence Runs remain a separate
Commercial workflow: they may link products, product lines, formulas, batches, measurements,
and public-evidence review, but they must never replace or masquerade as the ordinary Grows
area. A Commercial user can therefore maintain tomatoes, herbs, fruit trees, cannabis when
eligible, or another crop as a normal grow and separately create a product trial when the
purpose is commercial evidence.

Crop-aware grow setup must distinguish lifespan from harvest behavior. Supported planning
paths are annual, biennial, short-lived perennial, long-lived perennial or woody, continuous
indoor/tropical, finite non-plant production cycle, and unknown. Production is separately described as one main harvest,
repeated picking or flushes, seasonal perennial harvest, continuous production, observation
without harvest, or unknown. Dormancy is also separate and may be absent, seasonal,
climate-dependent, or unknown. A reviewed crop profile may propose these values, but region,
cultivar, propagation method, climate, and management can change them, so the grow owner
reviews the proposal before it becomes the grow plan. Never turn a species' theoretical
maximum lifespan into a promised productive lifespan or harvest date.

The blank grow form is crop-neutral. It must not preload cannabis veg or flower durations,
show cannabis-only milestones, or label generic establishment as a cannabis flower cycle
unless an explicit cannabis/hemp crop or an otherwise eligible structured cannabis context
exists. Ordinary crops use establishment and first-flowering/fruiting anchors while retaining
the same canonical stored anchor values for compatibility. Reviewed starter lifecycle profiles
cover representative annual repeated-harvest herbs (sweet basil), annual whole-plant or
repeated-leaf crops (lettuce), cultivar- and production-system-dependent short-lived perennial
fruit (strawberry), and long-lived seasonally dormant woody fruit (apple). Each profile asks for
the cultivar or production facts that can change the path. An unmatched crop remains fully
creatable through explicit owner-selected lifespan, production, dormancy, start method, and
dates; the app must say that reviewed auto-guidance is unavailable instead of inventing a
lifecycle.

Representative reviewed profiles also cover a long-lived non-harvest tropical houseplant
(pothos), an annual ornamental whose use depends on type (marigold), a short single-cut tray
crop (radish microgreens), and a finite fungal substrate cycle with repeated flushes (button
mushroom). Fungal grows may start from culture, spawn, or an inoculated block and must not be
forced into seed, annual, perennial, flowering, or dormancy language. A broad category such as
Mushrooms or Microgreens still does not establish the exact species, strain, seed lot,
substrate, cycle length, or harvest timing.

The post-create calendar follows the same crop boundary. Cannabis/hemp may use explicit
vegetative, flip, flowering, harvest, dry, and cure milestones. Other crops use confirmed
establishment, flowering/fruiting, first-harvest, repeated-harvest, observation, and dormancy
facts. When region, cultivar, propagation method, lifecycle, or supported timing is missing,
the calendar asks for it or leaves the milestone absent; it must not substitute cannabis
defaults or invent a biological date. Every generated date remains an editable planning
anchor, not a guarantee.

Crop identification must run without a grow. Grow and plant context are optional attachments used for private history, saving, logs, and follow-up tasks; they are not prerequisites for inspecting uploaded media or returning a draft identity. Collect photo evidence before presenting the image-analysis action. User confirmation is an explicit result action, not a free-form true/false input. The result must state whether image pixels were actually analyzed. A clear cannabis flower or harvested bud may support a draft crop-level identification when visible bracts/calyxes, pistils, resinous sugar leaves, trichome coverage, and inflorescence structure are consistent. Do not require a fan-leaf photo when the flower is independently recognizable, and never infer a cultivar/strain from bud appearance.

When exact species is unresolved but the evidence supports a defensible common, genus, or family-level working candidate, surface that candidate with its actual confidence and limitations instead of replacing it with a confirmation placeholder. `Not confirmed` is reserved for cases where no useful plant candidate is defensible; every candidate still remains a draft until the user confirms it.

When the server confirms that crop-identification pixels were analyzed, the calculator result and saved ToolRun must preserve that provenance: requested/performed state, exact photo count, provider/model label, image quality, visible identifying traits, evidence IDs, and limitations. The reopened Saved Run must surface those details instead of hiding the nested provenance object. Do not discard server-attested vision metadata and then label the same result as text-only or unanalyzed. An attachment without server-attested analysis must remain explicitly unanalyzed.

The assistant response must return an opaque analysis receipt containing the exact usage
event ID, normalized-result digest, evidence fingerprint, and review-policy version. The
calculator save must echo and validate that exact receipt in the same authenticated
Personal, Commercial, or Facility scope;
selecting the latest event for the same photos is insufficient. Saved Plant ID evidence,
AI output, receipt, and immutable snapshot cannot be replaced through a generic update.
Evidence records and their protected uploads must carry the same canonical workspace type
and workspace ID as the analysis. A legacy non-Facility evidence record without workspace
fields is Personal-only; it must never become Commercial evidence by inference. Reopening
a Saved Run retrieves the exact recorded evidence IDs through an authorized workspace-
scoped lookup rather than searching only a recent-evidence list.
Before offering a saved-evidence retry, revalidate the complete recovered set. Every item
must still belong to Crop Identification and have an uploaded durable reference; every
photo or extracted frame must still be explicitly AI-usable, and any extracted frame must
retain its selected private source-video association. The source video itself remains
private non-AI evidence and does not require AI-use approval. If any exact item is missing
or ineligible, load none of the set, explain what must be added again, and do not announce
that evidence was recovered or send a request that the server will reject.
Only narrowly validated private-location changes, user decisions, user-authored summaries,
and explicit corrections may change after creation, and each must preserve the original AI
draft. Facility runs use Facility credits, are visible to current authorized members in the
selected Facility rather than Personal Saved Runs, and create logs/tasks only in that
Facility scope. Commercial runs are stored and reopened only as authenticated
Commercial ToolRuns owned by that account; a route-supplied Commercial account ID is a
navigation hint, never authorization or the persisted owner. Commercial runs must not
fall back to Personal Saved Runs or create Personal logs or tasks. Until dedicated
Commercial journal and task contracts exist, those follow-up actions must return an
explicit unavailable response instead of silently writing Personal records. A workspace
change on a mounted shared route must clear prior media, draft identity, location, grow,
Field Study, result, receipt, and follow-up state before the new workspace can render or
submit.

Plant diagnosis uses the same server-side OpenAI credential as other image-capable GrowPath AI workflows. A successful image request must record that image analysis was requested and performed, the number of photos inspected, and the provider/model label. A failed or text-only request must say that pixels were not analyzed and request written observations or better evidence rather than presenting a generic result as visual analysis.

A crop identity proposed only from Diagnosis images remains a visual suggestion. Cap it at
medium confidence, require user confirmation, never infer a cultivar, and do not present an
exact species as established. When the image supports a crop or genus but not authoritative
species identification, retain a genus-level scientific draft such as `Cannabis spp.` rather
than `Cannabis sativa`. This identity ceiling is separate from issue-candidate confidence: a
visible reproductive structure, pest sign, or symptom may have its own bounded confidence
without increasing crop-identity certainty.

## Shared Field Studies and public observations

A Field Study is the shared parent for public-space or field-botany observations. It is
not a publicly editable grow. The owner may invite an editor, verifier, or viewer.
Owners and editors may add or change observations; verifiers may change identification
review status and its supporting, counter, or missing evidence; viewers are read-only.
Publishing a study or observation never grants edit access.

Each observation keeps plant identification, plant-health assessment, and invasive
status as separate claims. An AI identification enters the study as `ai_candidate`
even when it was saved from Crop Identification. `user_confirmed`,
`community_suggestion`, `expert_reviewed`, `source_verified`, `disputed`, and
`needs_evidence` remain distinct provenance states. A verified invasive status must
name the governing jurisdiction and record an authoritative source URL; identity or
community consensus alone is insufficient.

Field Study media follows the ordinary crop-identification evidence ceiling and
provenance rules. A public map observation requires at least one owned photo or extracted
still that can be converted into a metadata-stripped public derivative. A private source
video may remain attached to the contributor record, but a video by itself is not a
public map image. Legacy or failed-derivative observations stay off the public map rather
than appearing as identity-only pins. Public output may show evidence, counter-evidence,
missing evidence, habitat, region, and the contributor-approved public note, but must not
expose owner-only identifiers or private ToolRun provenance.

Location starts private. Observation-level choices are owner-only, study-team exact,
public approximate, or explicitly confirmed public exact. Public approximate
coordinates are rounded before delivery. Exact coordinates require an explicit
observation-level confirmation and must be reduced to a wider regional location when
the observation is marked sensitive. A private or collaborator-only coordinate must
never be present in a public response.

Map readiness must be visible as a requirement-by-requirement status. A named Field
Study observation is map-ready only when the contributor has selected a study they may
edit and that study has public visibility. A direct single-find workflow may instead
prepare the account's dedicated Nature collection behind the scenes after the user
deliberately selects approximate-pin sharing; the user must not be forced to name or
manage a Field Study merely to share one Plant ID. In both paths, qualifying evidence
must be attached, the observation must be explicitly published, location privacy must be
public approximate or explicitly confirmed public exact, and device coordinates must
have been captured separately from AI. Show every unmet requirement instead of treating
a partial draft as ready. Studies, observations, evidence, publication state, and
coordinates remain private by default. The dedicated Nature collection may become
public only as part of the same explicit direct-publish intent, contains no public
observation until the final publish action succeeds, and does not change the protected
exact ToolRun location.

For a contributor-confirmed public outing, the contributor may name and deliberately keep
one reviewed park or trip point active while identifying several separate plants. Reuse is
an explicit current-workflow choice, never an inference from capture date, file order,
proximity, or another observation. Every photo set still creates or updates its own
ToolRun-backed observation with its own identity, evidence, date, contributor-authored
description, and final publication action. Observations that share the approved point remain
separate records; the public Nature globe clusters them into one selectable pin group whose
viewer can open every finding. Ending the trip or leaving the workflow ends the reuse state.
Never use this path for a home address, a private-property point, or a sensitive-species
location.

Direct Nature publishing must require a nonblank, contributor-authored public description
that the contributor reviews before the final publish action. Preserve that text as
`publicNotes` and show it with the public pin and photo card. It is user context, not AI evidence and not an identity or
invasive-status claim. Warn contributors not to include personal names, exact addresses,
private-property details, or directions to sensitive species. Never synthesize this note
from AI output or expose a private note as its fallback.

For owned retained original media, the contributor may explicitly ask GrowPath to check
embedded source metadata for GPS and capture date. This includes ordinary camera-photo
EXIF and standards-based MP4 or QuickTime container metadata from phones, tablets,
cameras, and other compatible recorders; it is not limited to one device brand. Reading
metadata is a private, owner-scoped preview action: it must not change the ToolRun, create
an observation, or publish anything. Show the recovered date and the fact that GPS exists
without exposing the exact coordinate in ordinary UI. Applying the recovered values
requires a second explicit private-save action. When source photos or video in one saved
run contain materially different locations, do not choose one automatically; require the
contributor to resolve the trip or place the observation manually. Missing, invalid, or
stripped metadata is not an error and must fall back to separately authorized device GPS
or later manual placement. Never infer a location or capture date from file names,
upload time, visual landmarks, or an extracted frame's generation time.

A timezone-free EXIF or container clock is not an absolute instant. Preserve its strict
camera-local `YYYY-MM-DD` as `capturedLocalDate` with date precision, and leave
`capturedAt` empty. Populate `capturedAt` only when the source includes a valid timezone
or UTC offset; in that case also preserve the original local calendar day and label the
precision as an instant. Nature uses the reviewed local calendar day so timezone
normalization cannot move an observation to the prior or following date.

Normalization fixtures must cover Android-style decimal GPS, iPhone/iOS and ordinary
camera rational/DMS GPS with latitude/longitude references, strict capture timestamps,
and the no-guess result when either half of a coordinate is absent or invalid. Embedded
video GPS and capture time follow the same private review boundary. Separately authorized
live device GPS and deliberate manual pin placement remain the device-neutral fallbacks.

When the picker exposes ordinary photo EXIF, retain only its bounded GPS pair and capture
date privately before HEIC conversion, resizing, or compression can remove those fields.
Do not expose that private pre-normalization record in ordinary evidence responses or public
derivatives. It is a recoverable owner-review candidate, not proof that the coordinate or
camera clock is authentic, and it follows the same separate apply, conflict, and publication
rules as metadata read from retained bytes.

An existing saved Crop Identification ToolRun may be explicitly linked to an editable
Field Study without rerunning AI or re-uploading its owned evidence. That link creates
one private draft observation from the saved structured identity, context, provenance,
and owned media references. An already user-authorized saved coordinate, or a coordinate
captured through a separate explicit action, may be copied only as an exact private
location. Linking must not request device location, publish the observation, change the
study visibility, make coordinates public, or confirm a cannabis/hemp public context.
Repeated linking of the same ToolRun to the same study must reopen or update the existing
draft rather than creating duplicate observations. Nature sharing remains a later,
separately confirmed workflow that must satisfy every ordinary map-readiness gate.
That later workflow may start directly from the saved ToolRun: it reuses the owned
identity and evidence without rerunning AI, requires an observation date and explicit
approximate-public-pin confirmation, and creates or updates the one observation keyed by
that source ToolRun in the account's dedicated Nature collection. It must never create a
duplicate merely because the user publishes again. Cannabis/hemp additionally requires
the separate public-context confirmation before publication.
If the user authorizes device location after a private draft was linked, the standalone
Plant ID location action still changes only the ToolRun. Copying that coordinate into the
existing Field Study observation requires a separate, clearly named Field Study action
that identifies its audience and must update the same observation rather than creating a
duplicate. Identity review, publication, and location-sharing updates must preserve every
unspecified nested identity, evidence, coordinate, privacy, sensitivity, cannabis-context,
and public-note field. Public
approximate sharing uses a named confirmation action and keeps the protected exact
coordinate intact; never use an ambiguous cycling control that can silently change the
audience or erase provenance.
An asset ID recovered specifically from saved image-analysis `evidenceUsed` is a legacy
photo-evidence candidate, not a generic attachment; the publication service must still
confirm that it is an owned uploaded image and can produce the safe public derivative.

The public discovery surface is an interactive, zoomable globe with clustered pins.
The main Discover directory includes a compact globe preview that opens this canonical
public discovery surface. The preview remains visible when there are zero public
observations and must say that no public pins exist; an empty result must not collapse
into text-only navigation that makes the globe appear missing.
When the canonical discovery surface first receives one or more mappable results, it must
fit the privacy-safe public result coordinates into view rather than leaving their pins
off-screen at a country-wide or viewer-location default. Results that deliberately share
one reviewed park or trip point remain one visible selectable cluster. After a visitor
pans or zooms, an explicit return-to-published-results control must refit the current
result set; using the visitor's location remains a separate deliberate action.
Every mappable result coordinate group must also have a visible, keyboard-operable marker;
an observation count or accessible list does not prove that a WebGL point layer painted.
An accessible HTML marker may supplement the retained clustered map layer so shared park
points remain selectable when a browser or graphics path fails to paint custom circles.
The server queries only the rounded or explicitly approved public point that the visitor
is allowed to see; it must never use the protected exact point for viewport filtering, as
that could reveal hidden precision through repeated map requests. The accessible
observation list is a synchronized alternative to the globe, and selecting a cluster
or pin must expose the same identification evidence, review status, and Field Study link.
When several separately published observations deliberately share a named park/trip point,
the cluster selection must enumerate those distinct findings rather than merging their
photos, identities, descriptions, or source ToolRuns into one observation.

Cannabis/hemp identification remains allowed from deliberately submitted evidence, but
ordinary public horticulture discovery excludes those observations. A cannabis/hemp
pin must pass the ordinary map-readiness requirements, including deliberate observation
publication, and the owner must separately confirm the cannabis/hemp public context. It
may appear only for an authenticated viewer whose cannabis/hemp grow-interest or content
controls permit it. Signed-out viewers and unrelated growers do not receive those pins.
Publishing a botanical Field Study must not unlock or advertise other cannabis-specific
tools.

Signed-out viewers may browse photo-ready non-cannabis public observations. Optional
authentication may add deliberately shared cannabis/hemp observations only when the
signed-in viewer passes the ordinary interest/content-control policy; query flags never
override that policy. All Field Study creation, editing, verification, publication, and
withdrawal routes remain authenticated and role-scoped.

The globe may begin near the viewer's already-permitted browser location; if location
permission is not enabled it begins over the United States. Viewing the globe never
publishes the viewer's location. Public observations omit email, account identifiers,
private notes, private grow/tool provenance, and collaborator-only data.
