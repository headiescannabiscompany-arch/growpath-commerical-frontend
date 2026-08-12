import {
  aiDecisionPolicy,
  evaluateSourceForDecision,
  getMethod,
  getSourceEntry,
  knowledgeGovernancePolicy,
  methodRegistry,
  methodsForTool,
  sourceRegistry
} from "@/knowledge";

describe("GrowPath knowledge registries", () => {
  it("keeps stable, unique source and method IDs", () => {
    expect(new Set(sourceRegistry.map((entry) => entry.id)).size).toBe(
      sourceRegistry.length
    );
    expect(new Set(methodRegistry.map((entry) => entry.id)).size).toBe(
      methodRegistry.length
    );
  });

  it("limits context-specific sources to supported decisions", () => {
    expect(evaluateSourceForDecision("uc-ipm", "ipm")).toBe("allow");
    expect(evaluateSourceForDecision("breeder-site", "cultivar_parentage")).toBe(
      "allow_with_caveat"
    );
    expect(evaluateSourceForDecision("breeder-site", "diagnosis")).toBe("reject");
    expect(evaluateSourceForDecision("grower-forum", "consumer_review")).toBe(
      "lead_only"
    );
    expect(evaluateSourceForDecision("facebook-grower-groups", "qa_evaluation")).toBe(
      "lead_only"
    );
    expect(evaluateSourceForDecision("facebook-grower-groups", "diagnosis")).toBe(
      "reject"
    );
    expect(evaluateSourceForDecision("gbif-species-api", "plant_identification")).toBe(
      "allow_with_caveat"
    );
    expect(evaluateSourceForDecision("kew-powo", "plant_identification")).toBe(
      "allow_with_caveat"
    );
    expect(
      evaluateSourceForDecision("inaturalist-observations", "plant_identification")
    ).toBe("lead_only");
    expect(
      evaluateSourceForDecision("wikimedia-commons-licensed-plant-media", "qa_evaluation")
    ).toBe("lead_only");
    expect(
      evaluateSourceForDecision(
        "wikimedia-commons-licensed-plant-media",
        "plant_identification"
      )
    ).toBe("reject");
    expect(evaluateSourceForDecision("seo-affiliate-blog", "soil_science")).toBe(
      "reject"
    );
  });

  it("treats COAs as batch-specific lab evidence, not cultivar guarantees", () => {
    const coa = getSourceEntry("credible-lab-coa");
    expect(coa?.trustedFor).toContain("lab_result");
    expect(coa?.notTrustedFor).toContain("breeder_claim");
  });

  it("routes tools to the relevant GrowPath methods", () => {
    expect(methodsForTool("pheno-hunt").map((entry) => entry.id)).toContain(
      "pheno-hunting"
    );
    expect(methodsForTool("watering").map((entry) => entry.id)).toContain(
      "soil-nutrients"
    );
    expect(getMethod("plant-diagnosis-etgu")?.requiredOutputs).toContain(
      "counterEvidence"
    );
    expect(getMethod("plant-diagnosis-etgu")?.requiredOutputs).toContain(
      "distinct overall confidence, ranked-candidate confidence, health status, and action urgency"
    );
    expect(getMethod("plant-diagnosis-etgu")?.requiredOutputs).toContain(
      "unusable diagnosis media normalized to an inconclusive low-confidence result with exact retake requests and no image-derived treatment actions"
    );
    expect(getMethod("plant-diagnosis-etgu")?.requiredOutputs).toContain(
      "visual-only Diagnosis crop identity capped at medium confidence with exact species broadened to a user-confirmable crop or genus-level draft"
    );
    expect(getMethod("plant-diagnosis-etgu")?.requiredOutputs).toContain(
      "original-resolution images plus source-bound enlarged diagnostic crops that never count as independent evidence"
    );
    expect(getMethod("plant-diagnosis-etgu")?.warnings).toContain(
      "Do not retain high confidence, urgent status, treatment actions, completed tasks, or issue-detected automation from diagnosis media the provider marked unusable, and do not replace explicit user crop context with a conflicting visual suggestion."
    );
    expect(getMethod("plant-diagnosis-etgu")?.warnings).toContain(
      "Do not promote a visual-only Diagnosis crop suggestion to high-confidence identity, exact species, or cultivar, even when a separate visible issue candidate has higher confidence."
    );
    expect(getMethod("plant-diagnosis-etgu")?.requiredOutputs).toContain(
      "unresolved white-mark differential with powdery mildew, thrips, mites, residue, mineral deposits, glare, physical damage, and senescence"
    );
    expect(getMethod("plant-diagnosis-etgu")?.requiredOutputs).toContain(
      "authorized immutable ToolRun follow-up beside the original result with exact evidence, provider, pixel-inspection status, limitations, and one-credit disclosure"
    );
    expect(getMethod("harvest-dry-cure")?.requiredOutputs).toContain(
      "server-attested harvest image receipt bound to the authenticated workspace, canonical grow, optional plant, exact evidence set, normalized result digest, evidence fingerprint, and review-policy version"
    );
    expect(getMethod("harvest-dry-cure")?.requiredOutputs).toContain(
      "additive reviewable trichome-percentage drafts that preserve manual maturity observations and retain visual provenance"
    );
    expect(getMethod("harvest-dry-cure")?.requiredOutputs).toContain(
      "exact selected Harvest media set separated from the analyzed still/frame set, with a private source video retained as non-AI provenance"
    );
    expect(getMethod("harvest-dry-cure")?.requiredOutputs).toContain(
      "authorized Personal, Commercial, or Facility grow scope with Facility write-role and Facility-credit enforcement"
    );
    expect(getMethod("harvest-dry-cure")?.requiredOutputs).toContain(
      "user-reviewed trichome values saved as a manual override while the exact attested photo result remains separately visible"
    );
    expect(getMethod("harvest-dry-cure")?.requiredOutputs).toContain(
      "original-resolution images plus source-bound enlarged diagnostic crops that never count as independent evidence"
    );
    expect(getMethod("harvest-dry-cure")?.requiredOutputs).toContain(
      "staging-only same-pixel trichome luminance audit with the original mean, bounded uniform RGB multiplier, and method retained as non-independent evidence that cannot confirm amber by itself"
    );
    expect(getMethod("harvest-dry-cure")?.requiredOutputs).toContain(
      "exact dedicated Harvest vision model recorded in the signed review without inheriting a cost-optimized global mini model"
    );
    expect(getMethod("harvest-dry-cure")?.requiredOutputs).toContain(
      "overlapping full-area macro coverage for every original in the minimum four-photo Harvest set, reaching the left, right, top, and bottom image bounds while deduplicating overlap by position"
    );
    expect(getMethod("harvest-dry-cure")?.requiredOutputs).toContain(
      "client preflight that accepts ordinary 1080p phone photos without claiming trichome heads are unresolved from dimensions alone, leaving subject scale, focus, compression, glare, lighting, calyx placement, and head detail to server review"
    );
    expect(getMethod("harvest-dry-cure")?.requiredOutputs).toContain(
      "saved-evidence hydration that retires the replaced Harvest dimension-only warning while preserving current focus, glare, compression, lighting, and provenance findings"
    );
    expect(getMethod("harvest-dry-cure")?.requiredOutputs).toContain(
      "bounded staging-counter tile selection that preserves spatial coverage of each large source photo before filling remaining detector slots by sharpness without treating tiles as independent sites"
    );
    expect(getMethod("harvest-dry-cure")?.requiredOutputs).toContain(
      "staging qualitative clear, cloudy, and amber seed cases spanning at least two independent rights-reviewed primary sources, with reviewed tight crops and cryptographic source pins where packaged supplements are used, retained as sanity evidence rather than quantitative counter calibration"
    );
    expect(getMethod("harvest-dry-cure")?.requiredOutputs).toContain(
      "visible sampled-head estimate split into clear, cloudy, confirmed amber, amber-or-warm-light, and cloudy-or-glare with exact region basis, a confirmed-to-possible amber range, and an explicit no-whole-plant-percentage boundary"
    );
    expect(getMethod("harvest-dry-cure")?.requiredOutputs).toContain(
      "server-calculated visible-sample percentage from non-overlapping per-original resolved-head tallies, including counted-head total and low, medium, or high counting confidence"
    );
    expect(getMethod("harvest-dry-cure")?.requiredOutputs).toContain(
      "immediate and saved per-photo inspected-area breakdown with five-bucket counts, percentages, amber range, exact region, resolved-head total, counting confidence, and a strongest-amber-area callout that retains the no-whole-plant boundary"
    );
    expect(getMethod("harvest-dry-cure")?.requiredOutputs).toContain(
      "versioned Harvest calibration authorization that separately confirms image rights, limits use to private internal AI evaluation and calibration, and does not authorize public display"
    );
    expect(getMethod("harvest-dry-cure")?.requiredOutputs).toContain(
      "calculator and saved-run retention of the attested visible-sample five buckets, counted-head total, count source, confidence, exact basis, confirmed-to-possible amber range, cloudy-versus-glare uncertainty, and inspected-area-only boundary even when representative autofill remains blank"
    );
    expect(getMethod("harvest-dry-cure")?.requiredOutputs).toContain(
      "counting confidence capped by both resolved-head volume and weighted per-photo counting confidence, with not-counted, duplicate-image, blurred, blocking-glare, and unresolved-detail findings excluded from resolved-head tallies"
    );
    expect(getMethod("harvest-dry-cure")?.requiredOutputs).toContain(
      "one-click Personal saved-run retry that restores the exact retained Harvest evidence with canonical grow context without spending a credit until the user starts analysis"
    );
    expect(getMethod("harvest-dry-cure")?.requiredOutputs).toContain(
      "explicit Personal owned-harvest-batch selection scoped to the current grow, cleared on grow changes, and used only for user-triggered review write-back"
    );
    expect(getMethod("harvest-dry-cure")?.requiredOutputs).toContain(
      "explicit user-date or breeder-timing planning range with separate reasons the window may be open, reasons to wait, missing evidence, confidence, and a non-trichome-date boundary"
    );
    expect(getMethod("harvest-dry-cure")?.warnings).toContain(
      "Never convert missing qualified trichome evidence into a generic three-to-seven-day harvest recommendation or imply trichome maturity was assessed. A low-confidence planning range is allowed only from an explicit user approximate date or explicit flower-day plus breeder timing, with separate reasons to harvest, reasons to wait, missing evidence, and range provenance; it cannot create an automatic harvest decision or dry/cure deadline."
    );
    expect(getMethod("harvest-dry-cure")?.warnings).toContain(
      "Never trust client-supplied harvest provider metadata, AI percentages, evidence IDs, or an analysis ID as proof of image analysis; validate the exact server receipt and reconstruct the saved photo result."
    );
    expect(getMethod("harvest-dry-cure")?.warnings).toContain(
      "Never remount Harvest Readiness or overwrite manual maturity fields when applying AI trichome percentages; invalidate only unreviewed visual drafts when their evidence changes."
    );
    expect(getMethod("harvest-dry-cure")?.warnings).toContain(
      "Never omit an attached private source video from the selected receipt set, count it as visually analyzed, accept only a subset of its active client-generated Harvest frames, or accept a generated frame without the selected protected source and matching workspace, grow, plant, and purpose lineage."
    );
    expect(getMethod("harvest-dry-cure")?.warnings).toContain(
      "Never trust a route account or grow ID as shared-workspace authority, spend individual credits for a Facility Harvest run, or allow a Facility viewer to run the analysis."
    );
    expect(getMethod("harvest-dry-cure")?.warnings).toContain(
      "Never overwrite a user-reviewed trichome percentage with the attested AI value or continue labeling an edited distribution AI-derived; preserve it as a manual override, reconstruct each unreviewed field from the attested snapshot, clear unusable unreviewed drafts, and retain the attested photo snapshot separately."
    );
    expect(getMethod("harvest-dry-cure")?.warnings).toContain(
      "Never count bright pixels, sparkles, pistils, plant hairs, colored plant tissue, blurred circles, compression artifacts, sugar-leaf edge heads, or the same head repeated in overlapping crops as resolved trichome heads; ambiguous resolved white heads belong in cloudy-or-glare, while resolved yellow/orange/tan/brown heads that cannot be separated from warm light belong in amber-or-warm-light and define only the possible-amber upper bound. Under mixed or warm light, audit every clear head against adjacent highlights, transparent heads, and transmitted background so colored uncertainty cannot remain clear merely because the entire image is warm."
    );
    expect(getMethod("harvest-dry-cure")?.warnings).toContain(
      "Never accept a free-text harvest-batch database ID, let AI select a batch, or retain a batch selection after grow context changes; an estimate remains valid without batch write-back."
    );
    expect(getMethod("plant-diagnosis-etgu")?.warnings).toContain(
      "Do not treat one photo copied into several fields as independent evidence, treat an AI hypothesis as a directly observed organism, or headline powdery mildew from generic white marks alone."
    );
    expect(getMethod("plant-diagnosis-etgu")?.requiredInputs).toContain(
      "affirmed, negated, uncertain, and instructional assertion status for each evidence clause"
    );
    expect(getMethod("plant-diagnosis-etgu")?.requiredInputs).toContain(
      "server-attested media observations, with any diagnostic view role bound to that view's exact finding, quality, and lighting"
    );
    expect(getMethod("plant-diagnosis-etgu")?.warnings).toContain(
      "Do not convert negated findings, instructions, questions, failed media analysis, or unattested client-supplied visual text into supporting evidence, completed inspection fields, candidate scores, image gates, confidence, severity, or treatment categories."
    );
    expect(getMethod("plant-diagnosis-etgu")?.warnings).toContain(
      "Do not use a separate or unbound list of media view roles to satisfy a candidate evidence gate."
    );
    expect(getMethod("plant-diagnosis-etgu")?.warnings).toContain(
      "Do not let morphology for one candidate raise the confidence or direct-treatment status of a different leading candidate."
    );
    expect(getMethod("plant-diagnosis-etgu")?.requiredOutputs).toContain(
      "crop-identification photo count, provider/model, quality, visible traits, evidence IDs, and limitations preserved and visible in the saved result"
    );
    expect(getMethod("plant-diagnosis-etgu")?.requiredInputs).toContain(
      "device-prepared oversized photos with final MIME type and byte size plus terminal upload status"
    );
    expect(getMethod("plant-diagnosis-etgu")?.requiredInputs).toContain(
      "protected original evidence scoped to the active personal, Commercial, or Facility workspace, with a stable retry key and a separate public derivative only after explicit Nature publication"
    );
    expect(getMethod("plant-diagnosis-etgu")?.warnings).toContain(
      "Do not leave a failed or timed-out media transfer in an indefinite uploading state, upscale an oversized photo, claim preparation restored detail, or duplicate a completed binary upload when only evidence registration needs retrying."
    );
    expect(getMethod("plant-diagnosis-etgu")?.warnings).toContain(
      "Do not publish a protected diagnostic original, charge it to the wrong workspace, or create a public Nature derivative without explicit publication consent."
    );
    expect(getMethod("plant-diagnosis-etgu")?.requiredOutputs).toContain(
      "defensible common, genus, or family-level candidate retained when exact species is unresolved"
    );
    expect(methodsForTool("species-crop-id").map((entry) => entry.id)).toContain(
      "plant-diagnosis-etgu"
    );
    expect(getMethod("plant-diagnosis-etgu")?.requiredOutputs).toContain(
      "ranked crop-identification candidates with evidence, counter-evidence, missing evidence, and next photos/questions"
    );
    expect(getMethod("plant-diagnosis-etgu")?.requiredOutputs).toContain(
      "explicit external-source verification status and empty source records when no database was queried"
    );
    expect(getMethod("plant-diagnosis-etgu")?.requiredOutputs).toContain(
      "common and nursery names separated from scientific names, with invalid scientific-name phrases withheld and genus-level drafts retained when supported"
    );
    expect(getMethod("plant-diagnosis-etgu")?.requiredOutputs).toContain(
      "low overall and candidate confidence plus a prominent identity-not-verified warning when proposed identity fields conflict or contain an unusable scientific name"
    );
    expect(getMethod("plant-diagnosis-etgu")?.requiredOutputs).toContain(
      "crop-identification retake-required state for dark, backlit, harsh-flash, deep-shadow, glare, clipped-highlight, or color-cast evidence that hides diagnostic characters"
    );
    expect(getMethod("plant-diagnosis-etgu")?.requiredOutputs).toContain(
      "crop-identification use of sharp illuminated nighttime photos or extracted video frames when diagnostic morphology remains visible, without letting one unusable frame invalidate other compatible usable views"
    );
    expect(getMethod("plant-diagnosis-etgu")?.requiredOutputs).toContain(
      "server-only Plant ID video-frame extraction for a protected private source video, with no client thumbnail generation or frame upload, persisted processing, completed, partial, or failed state, and exact ordered versioned generated-frame recovery before AI submission"
    );
    expect(getMethod("plant-diagnosis-etgu")?.warnings).toContain(
      "Do not run client thumbnail extraction for Plant ID, enable Plant ID while server frame extraction is processing, accept partial, orphan, extra, wrong-version, or wrong-attempt frame sets as AI evidence, infer completion from the source video alone, or require the same protected video to be uploaded again after a retryable extraction failure."
    );
    expect(getMethod("plant-diagnosis-etgu")?.requiredOutputs).toContain(
      "low-confidence candidate-only crop, family, or genus retained when artificial lighting limits exact certainty but readable diagnostic morphology remains, with AI identity prefill and confirmation still blocked"
    );
    expect(getMethod("plant-diagnosis-etgu")?.requiredOutputs).toContain(
      "limited-light crop or genus candidate retained only when its own evidence contains a taxon-discriminating character combination, with Cannabis requiring visible reproductive structure plus pistil, resin, or trichome support"
    );
    expect(getMethod("plant-diagnosis-etgu")?.warnings).toContain(
      "Do not auto-populate or auto-upgrade a crop or species identity from limited or unusable lighting evidence; preserve directly visible morphology only, retain at most a low-confidence crop, family, or genus candidate when limited evidence remains readable, require a retake when the needed characters are hidden, and keep user-entered names labeled as user claims."
    );
    expect(getMethod("plant-diagnosis-etgu")?.warnings).toContain(
      "Do not reject nighttime, a dark background, phone-light illumination, or direct flash by label alone; reject only when the captured detail needed for the proposed identity is actually obscured or unreliable."
    );
    expect(getMethod("plant-diagnosis-etgu")?.warnings).toContain(
      "Do not retain a low-light Cannabis or other taxon guess from a generic serrated leaf, stem, or growth habit alone; request targeted retakes unless the candidate's own evidence contains a discriminating combination."
    );
    expect(getMethod("plant-diagnosis-etgu")?.requiredOutputs).toContain(
      "provider crop-identification quality and confidence preserved as ceilings that the calculator and saved ToolRun may retain or downgrade but never upgrade"
    );
    expect(getMethod("plant-diagnosis-etgu")?.requiredOutputs).toContain(
      "explicit low-confidence disagreement when unchanged evidence produces a conflicting identity or unsupported quality upgrade"
    );
    expect(getMethod("plant-diagnosis-etgu")?.requiredOutputs).toContain(
      "user correction that preserves the rejected AI draft, presents the corrected common identity first, leaves unknown exact species unverified, and requests discriminating replacement photos"
    );
    expect(getMethod("plant-diagnosis-etgu")?.requiredInputs).toContain(
      "optional separately authorized exact device location stored privately with the saved Plant ID ToolRun without requiring a Field Study"
    );
    expect(getMethod("plant-diagnosis-etgu")?.requiredOutputs).toContain(
      "standalone private Plant ID location that can be added, updated, or removed without creating a Field Study observation or publishing to Nature"
    );
    expect(getMethod("plant-diagnosis-etgu")?.requiredOutputs).toContain(
      "authenticated Commercial Plant ID ToolRuns kept outside Personal Saved Runs, with unsupported Commercial journal and task actions failing explicitly"
    );
    expect(getMethod("plant-diagnosis-etgu")?.requiredOutputs).toContain(
      "Plant ID evidence and protected uploads bound to one canonical Personal, Commercial, or Facility workspace, with exact recorded evidence IDs recovered through an authorized scoped lookup"
    );
    expect(getMethod("plant-diagnosis-etgu")?.requiredOutputs).toContain(
      "saved Plant ID retry offered only after the complete exact evidence set is revalidated as durable Crop Identification media with every photo AI-approved and every extracted frame linked to its private source video"
    );
    expect(getMethod("plant-diagnosis-etgu")?.warnings).toContain(
      "Do not treat a route Commercial account ID as authorization, fall a Commercial Plant ID back to Personal Saved Runs, or create Personal logs or tasks from a Commercial run."
    );
    expect(getMethod("plant-diagnosis-etgu")?.warnings).toContain(
      "Do not infer legacy non-Facility evidence into Commercial scope, or recover a Saved Run by searching only a recent-evidence list instead of its exact workspace-scoped evidence IDs."
    );
    expect(getMethod("plant-diagnosis-etgu")?.warnings).toContain(
      "Do not announce that saved Plant ID evidence was recovered or submit it for analysis when any exact asset is missing, not durably uploaded, outside Crop Identification, an unsupported type, or a photo that is not explicitly AI-usable; load none of an ineligible set."
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "published-course discovery limited to published storefronts and explicit public fields"
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "explicit dispensary discovery by state or user-authorized distance with published linked inventory and external-site or in-store-pickup handoff"
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "direct draft-course detail limited to the authenticated author or platform administrator"
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "explicit eligible workspace preference preserved across plan-backed modes"
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "post-login workspace choice for every multi-workspace identity"
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "one 30-day trial per paid plan for Pro, Commercial, and Facility, with legacy trial use mapped to Pro and a second price-labeled confirmation before immediate Stripe billing"
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "bounded Personal home campaign density that preserves the grow workspace"
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "canonical Forum Directory group discovery and accessible group creation"
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "accessible inline Forum reply expansion and text reply composition on canonical post previews"
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "server-enforced audited Forum moderation with feed-projection removal, reversible soft removal, and locked-reply blocking"
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "capability-gated Commercial inventory creation exposed as a named actionable control"
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "readable owner-scoped Product Trial record pickers with an explicit advanced ID fallback"
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "single-flight Product Trial creation with positive whole-number plant counts and retained failed drafts"
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "authenticated purchase-intent concept trials with owner-approved artwork, positive hypothetical price, explicit not-for-sale disclosure, one revisable response per account, and aggregate-only owner results"
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "server-enforced Commercial course readiness with draft-only creation, save-before-publish, explicit unpublish, and published-content mutation lock"
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "confirmed owner-scoped soft archive for private Commercial course drafts with retained audit history"
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "mutually exclusive single-flight Product Trial detail, claim-review, and evidence-task writes"
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "readable owner-scoped Product Batch record pickers with an explicit advanced ID fallback"
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "single-flight Product Batch creation and AI prefill with non-negative numeric validation and owner-value preservation"
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "mutually exclusive single-flight Product Batch detail and production-task writes with unknown-safe cost handling"
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "readable owner-scoped Product Trial Evidence Run record pickers and named share status choices with an explicit advanced ID fallback"
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "single-flight Product Trial Evidence Run loading, creation, and detail editing with positive whole-number plant counts and retained drafts"
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "named Inventory Support item types and readable Product or Evidence Run pickers with an explicit advanced fallback"
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "compact shared-page content and campaign rails retained in non-overlapping document flow"
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "one level-one Product Lines heading with level-two workflow sections and level-three saved-line headings"
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "single-flight Product Line creation and detail editing with retained failed drafts and in-page status"
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "one level-one Soil & Nutrient Batch Planner heading with level-two workflow sections and level-three saved-batch headings"
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "one level-one Product Trials heading with level-two workflow sections and level-three saved-trial headings"
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "one level-one Product Trial Evidence Runs heading with distinct level-two workflow sections and level-three saved-run headings"
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "one level-one Commercial Inventory Support heading with level-two workflow sections and level-three saved-record headings"
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never let compact campaign rails shrink, cover, intercept, or displace Commercial workspace controls."
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never expose a duplicate navigator title or a flat generic-text outline on Product Lines."
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never clear a failed Product Line draft, submit a Product Line create or update twice, or depend on a native-only failure alert."
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never expose a duplicate navigator title or a flat generic-text outline on the Soil & Nutrient Batch Planner."
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never expose a duplicate navigator title or a flat generic-text outline on Product Trials."
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never submit a Product Trial twice, accept a non-positive or fractional plant count, discard its failed draft, or depend on a native-only failure alert."
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never let a purchase-intent concept trial create inventory, a reservation, an order, checkout, payment, shipping promise, production commitment, or public display of unapproved or rights-blocked artwork."
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never publish an incomplete or unsaved Commercial course, accept typed lifecycle state, mutate published course content in place, or silently coerce an invalid paid price to zero."
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never hard-delete a Commercial course through routine cleanup or archive a published course without returning it to draft first."
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never allow duplicate or concurrent Product Trial detail, claim-review, or evidence-task writes, discard their failed drafts, or detach a task from the exact trial context."
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never silently omit an invalid Product Batch volume or cost, submit a create or AI-prefill request twice, erase owner-entered values when AI leaves fields blank, or discard the failed draft."
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never turn a blank Product Batch detail cost into zero, silently omit an invalid cost, allow duplicate or concurrent detail/task writes, or detach a production task from its batch context."
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never expose a duplicate navigator title or reuse one generic section label for different Product Trial Evidence Run jobs."
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never require copied database IDs or raw public-share status codes as the primary Product Trial Evidence Run creation workflow."
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never silently omit an invalid Product Trial Evidence Run plant count, submit a create or detail write twice, discard its failed draft, treat public-ready as automatic publication, or expose contextual AI before the exact record loads."
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never require a page transition merely to read or write an ordinary Forum text reply from a canonical post preview."
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never leave hidden or soft-removed Forum content in shared feeds, accept replies on locked threads, hard-delete moderation evidence, or perform a moderator action without a case and platform audit event."
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never count repeated Forum reports from the same account toward an automatic hold threshold."
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never expose a duplicate navigator title or a flat generic-text outline on Commercial Inventory Support."
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never pass reserved public route words or malformed record IDs into database ID queries."
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never include dispensaries in default horticulture discovery or offer GrowPath checkout, payment, delivery, shipping, or reservation for a dispensary item."
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "single-flight Commercial storefront loading and mutually exclusive storefront, product, media, and setup-task actions with retained drafts"
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never silently omit invalid storefront coordinates, support email, HTTPS handoff, or product price, publish an incomplete quick product, submit a storefront/product write twice, or hide a load/action failure."
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "single-flight Commercial order and analytics requests with retained last-good data, explicit cancellation confirmation, and truthful failure-versus-zero states"
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never present a failed Commercial Orders or Analytics request as real zero activity, discard the last good snapshot after refresh failure, submit overlapping fulfillment writes, or cancel an order without explicit confirmation."
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never invent dispensary availability or imply pickup completion; use published linked inventory and a dispensary-provided website or pickup instructions."
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never honor deterministic test identity headers as production authentication."
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never repeat a trial for the same paid plan or consume another paid plan's trial when one plan's trial is used."
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "single-flight review-first CSV and PDF catalog import with cross-platform status feedback"
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never depend on a native-only alert for Commercial catalog import fallback, permit duplicate concurrent extraction or draft-creation requests, accept a PDF extraction without a protected source URL, or imply an imported draft is published."
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "single-flight Commercial Inventory Support creation with non-negative stock validation and retained failed drafts"
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "single-flight Commercial Inventory Support loading and detail editing with non-negative stock validation and retained drafts"
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never silently coerce invalid Commercial inventory quantity or reorder values to zero, submit the same creation twice, discard the owner's failed draft, or depend on a native-only create-failure alert."
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never silently omit an invalid Commercial Inventory Support detail quantity or reorder point, submit a detail write twice, overwrite its failed draft, or hide a load/save failure."
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never open an immediately billed Stripe checkout on the first action after the selected plan's trial has been used."
    );
    expect(getMethod("facility-workflow")?.requiredOutputs).toContain(
      "readable Facility inventory details with confirmed mistaken-record removal"
    );
    expect(getMethod("facility-workflow")?.requiredOutputs).toContain(
      "cross-platform confirmed Facility member removal with preserved history"
    );
    expect(getMethod("facility-workflow")?.requiredOutputs).toContain(
      "individual-versus-Facility workspace choice after sign-in"
    );
    expect(getMethod("facility-workflow")?.requiredOutputs).toContain(
      "collision-resistant Facility deviation references with controlled write failures"
    );
    expect(getMethod("facility-workflow")?.requiredOutputs).toContain(
      "export readiness separated by open, resolved, and cancelled deviation status"
    );
    expect(getMethod("facility-workflow")?.requiredOutputs).toContain(
      "readable audit-detail evidence context before immutable raw payloads"
    );
    expect(getMethod("facility-workflow")?.requiredOutputs).toContain(
      "Facility-scoped audited Forum moderation with feed-projection removal, reversible soft removal, and locked-reply blocking"
    );
    expect(getMethod("facility-workflow")?.requiredOutputs).toContain(
      "selected-Facility Plant/Crop Identification, Plant Diagnosis, IPM Scout, and Saved AI Runs with Facility-safe back navigation"
    );
    expect(getMethod("facility-workflow")?.requiredOutputs).toContain(
      "owner-only single-flight Facility AI validation with readable request feedback"
    );
    expect(getMethod("facility-workflow")?.warnings).toContain(
      "Never allow a Facility deviation reference collision or persistence error to terminate the shared API service."
    );
    expect(getMethod("facility-workflow")?.warnings).toContain(
      "Never treat a resolved or cancelled Facility deviation as an open cleanup blocker."
    );
    expect(getMethod("facility-workflow")?.warnings).toContain(
      "Never make a Facility operator interpret raw audit JSON before showing the readable action, summary, time, and available actor context."
    );
    expect(getMethod("facility-workflow")?.warnings).toContain(
      "Never rely on native-only Alert callbacks for web member-removal confirmation or remove the last owner."
    );
    expect(getMethod("facility-workflow")?.warnings).toContain(
      "Never replace an individual account with Facility membership or bypass the post-login choice when both workspaces are eligible."
    );
    expect(getMethod("facility-workflow")?.warnings).toContain(
      "Never leave hidden or soft-removed Facility Forum content in eligible feeds, accept replies on locked threads, hard-delete moderation evidence, or change Facility-only visibility during moderation."
    );
    expect(getMethod("facility-workflow")?.warnings).toContain(
      "Never count repeated Facility Forum reports from the same account toward an automatic hold threshold."
    );
    expect(getMethod("facility-workflow")?.warnings).toContain(
      "Never expose cannabis-specific Facility AI shortcuts from a facility name, free-text note, or unconfirmed image candidate; require structured eligible Facility grow evidence."
    );
    expect(getMethod("facility-workflow")?.warnings).toContain(
      "Never expose Facility AI validation payloads or training-feedback exports outside a capable owner role, allow duplicate concurrent submissions, or leave an active request without readable progress and outcome feedback."
    );
    expect(methodsForTool("facility-inventory").map((entry) => entry.id)).toContain(
      "facility-workflow"
    );
    expect(methodsForTool("course-player").map((entry) => entry.id)).toContain(
      "course-media-workflow"
    );
    expect(methodsForTool("videos").map((entry) => entry.id)).toContain(
      "video-sharing-workflow"
    );
    expect(getMethod("video-sharing-workflow")?.requiredOutputs).toContain(
      "public or follower-scoped Discover result"
    );
    expect(getMethod("video-sharing-workflow")?.warnings).toContain(
      "Never expose private, unlisted, course-only, or Facility-internal videos in public Discover."
    );
    expect(getMethod("video-sharing-workflow")?.requiredOutputs).toContain(
      "verified private object and authorized short-lived playback"
    );
    expect(getMethod("course-media-workflow")?.requiredOutputs).toContain(
      "Vimeo unlisted privacy hash when present"
    );
    expect(getMethod("course-media-workflow")?.warnings).toContain(
      "Never expose unpublished course or lesson content to anonymous users or unrelated accounts, including through a direct record ID."
    );
    expect(getMethod("course-media-workflow")?.requiredOutputs).toContain(
      "owner-controlled publish and private-draft unpublish"
    );
    expect(getMethod("course-media-workflow")?.warnings).toContain(
      "Never expose submit, approve, or reject course actions unless a real moderated-review backend workflow and role policy are implemented end to end."
    );
    expect(getMethod("course-media-workflow")?.requiredOutputs).toContain(
      "webhook-confirmed paid enrollment and idempotent course counters"
    );
    expect(getMethod("course-media-workflow")?.requiredOutputs).toContain(
      "refund-adjusted and dispute-held creator earning"
    );
    expect(getMethod("course-media-workflow")?.warnings).toContain(
      "Never show refund or payment-issue forms without a recorded paid purchase, or label GrowPath support intake as a bank, card-network, or Stripe dispute."
    );
    expect(getMethod("course-media-workflow")?.warnings).toContain(
      "Never include held or refunded course earnings in creator payout eligibility."
    );
    expect(getSourceEntry("youtube-player-documentation")?.trustedFor).toContain(
      "course_media"
    );
    expect(getSourceEntry("vimeo-video-privacy-documentation")?.trustedFor).toContain(
      "course_media"
    );
    expect(getSourceEntry("facebook-grower-groups")).toMatchObject({
      reliabilityTier: "C",
      requiresCrossCheck: true,
      trustedFor: expect.arrayContaining(["qa_evaluation", "photo_quality_guidance"]),
      notTrustedFor: expect.arrayContaining(["diagnosis", "ipm"])
    });
    expect(getSourceEntry("meta-automated-data-collection-terms")).toMatchObject({
      sourceType: "provider_documentation",
      trustedFor: ["platform_data_access"],
      lastReviewedAt: "2026-07-25"
    });
    expect(getSourceEntry("pmc10071647-trichome-maturation")).toMatchObject({
      reliabilityTier: "A",
      trustedFor: expect.arrayContaining(["post_harvest", "qa_evaluation"]),
      requiresCrossCheck: true,
      lastReviewedAt: "2026-08-12"
    });
    expect(
      getSourceEntry("pmc10648736-cannabis-phenotype-trichome-exemplars")?.notes
    ).toContain("no per-head percentage ground truth");
    expect(getSourceEntry("agriculture-2026-460-trichome-vision")).toMatchObject({
      reliabilityTier: "A",
      trustedFor: expect.arrayContaining(["post_harvest", "qa_evaluation"]),
      requiresCrossCheck: true,
      lastReviewedAt: "2026-08-12"
    });
    expect(getSourceEntry("agriculture-2026-460-trichome-vision")?.notes).toContain(
      "does not publish a downloadable image dataset or trained weights"
    );
    expect(getSourceEntry("hf-siccan-trichome-seed-unverified")).toMatchObject({
      reliabilityTier: "D",
      trustedFor: [],
      notTrustedFor: expect.arrayContaining(["qa_evaluation", "post_harvest"]),
      lastReviewedAt: "2026-08-12"
    });
    expect(getSourceEntry("hf-siccan-trichome-seed-unverified")?.notes).toContain(
      "Do not copy, label, train on, or score these files as GrowPath ground truth"
    );
  });

  it("requires evidence and provider transparency in AI results", () => {
    expect(aiDecisionPolicy.requiredResultFields).toEqual(
      expect.arrayContaining(["evidenceUsed", "methodIds", "sourceIds", "providerLabel"])
    );
  });

  it("keeps Admin knowledge review editorial and outcome-backed", () => {
    expect(knowledgeGovernancePolicy.minimumMethodOutcomeRecords).toBe(3);
    expect(knowledgeGovernancePolicy.excludesSyntheticOutcomes).toBe(true);
    expect(knowledgeGovernancePolicy.approvalEffect).toBe("editorial_review_only");
    expect(knowledgeGovernancePolicy.runtimeChangeRequiresReviewedCodeRelease).toBe(true);
  });
});
