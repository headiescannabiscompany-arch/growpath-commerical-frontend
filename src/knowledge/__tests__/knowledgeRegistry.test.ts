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
      "crop-identification photo count, provider/model, quality, visible traits, evidence IDs, and limitations preserved and visible in the saved result"
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
      "readable owner-scoped Product Batch record pickers with an explicit advanced ID fallback"
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "readable owner-scoped Product Trial Evidence Run record pickers and named share status choices with an explicit advanced ID fallback"
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
      "Never expose a duplicate navigator title or a flat generic-text outline on the Soil & Nutrient Batch Planner."
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never expose a duplicate navigator title or a flat generic-text outline on Product Trials."
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never expose a duplicate navigator title or reuse one generic section label for different Product Trial Evidence Run jobs."
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never require copied database IDs or raw public-share status codes as the primary Product Trial Evidence Run creation workflow."
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
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never invent dispensary availability or imply pickup completion; use published linked inventory and a dispensary-provided website or pickup instructions."
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never honor deterministic test identity headers as production authentication."
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never repeat a trial for the same paid plan or consume another paid plan's trial when one plan's trial is used."
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
