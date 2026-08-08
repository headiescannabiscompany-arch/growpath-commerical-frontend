# AI Decision Policy

AI is a synthesis and retrieval layer, not blind authority.

1. Retrieve the selected grow/plant/workspace, relevant records, media and conversation turns.
   Retrieve media only after the user selects it or adds it through an AI-enabled picker.
   An AI-enabled picker must disclose that the media is approved for the current workflow,
   is not used for model training, and persist the evidence as AI-usable. Ordinary record
   media stays non-AI-usable unless the user takes that explicit action.
   For every AI still-image inspection, preserve and send the untouched original at high detail. The server may also generate enlarged center and attention-selected crops from the original-resolution pixels. These are supplemental views tied to the original, never replacements, lower-resolution substitutes, additional samples, sites, photos, or independent evidence. If crop generation fails, continue with the untouched original. For multi-photo requests, keep every original while bounding derived crop count and dimensions so enlarged inspection cannot prevent provider completion.
2. Apply the relevant GrowPath method and deterministic calculators/rules.
3. Apply source reliability by use case.
4. Separate observation, calculation, inference and user claim.
5. Return evidence, counter-evidence, missing information, confidence, next checks and optional tasks.
6. Show provider/fallback labels and disagreements. Never present a rule fallback as GPT.
7. Do not invent sensor readings, lab values, label analyses, genetics provenance, IDs, dates, costs or actions.
8. Require user confirmation before writes or consequential decisions.
9. Social posts and group discussions are candidate language, evidence leads, or rights-reviewed QA cases—not ground-truth diagnoses. Do not automate collection without platform authorization, use private-group content without appropriate access and creator permission, or treat engagement and comment consensus as verification. Gold evaluation cases require image-level rights, de-identification, confirmed outcomes, and Tier A cross-checking; poor cases may test rejection and retake guidance. Neither is model-training data.

Diagnosis uses ETGU plus GPT verification and an agreement/conflict state. Runtime answers should expose `methodIds`, `sourceIds`, `evidenceUsed`, `missingInformation`, `limitations` and `providerLabel`.

Personal and Commercial AI may recommend a review-only SOP or checklist draft from the
approved starter library and selected records. The answer must expose the starter version,
why it was recommended, executable draft steps, missing information, and the review
boundary. It must not call the draft an approved SOP, invent measurements, setpoints,
chemical rates, legal requirements, or completed actions, or imply that Personal or
Commercial has Facility approval, assignment, document, versioning, or audit controls.
Turning a recommendation into a grow task requires a separate confirmation. Formal SOP
approval, uploads, version history, assignment, execution evidence, and retirement remain
Facility-scoped.
