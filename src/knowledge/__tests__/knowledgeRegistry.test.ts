import {
  aiDecisionPolicy,
  evaluateSourceForDecision,
  getMethod,
  getSourceEntry,
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
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "published-course discovery limited to published storefronts and explicit public fields"
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "direct draft-course detail limited to the authenticated author or platform administrator"
    );
    expect(getMethod("commercial-workflow")?.requiredOutputs).toContain(
      "explicit eligible workspace preference preserved across plan-backed modes"
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never pass reserved public route words or malformed record IDs into database ID queries."
    );
    expect(getMethod("commercial-workflow")?.warnings).toContain(
      "Never honor deterministic test identity headers as production authentication."
    );
    expect(getMethod("facility-workflow")?.requiredOutputs).toContain(
      "readable Facility inventory details with confirmed mistaken-record removal"
    );
    expect(getMethod("facility-workflow")?.requiredOutputs).toContain(
      "collision-resistant Facility deviation references with controlled write failures"
    );
    expect(getMethod("facility-workflow")?.requiredOutputs).toContain(
      "export readiness separated by open, resolved, and cancelled deviation status"
    );
    expect(getMethod("facility-workflow")?.warnings).toContain(
      "Never allow a Facility deviation reference collision or persistence error to terminate the shared API service."
    );
    expect(getMethod("facility-workflow")?.warnings).toContain(
      "Never treat a resolved or cancelled Facility deviation as an open cleanup blocker."
    );
    expect(methodsForTool("facility-inventory").map((entry) => entry.id)).toContain(
      "facility-workflow"
    );
    expect(methodsForTool("course-player").map((entry) => entry.id)).toContain(
      "course-media-workflow"
    );
    expect(getMethod("course-media-workflow")?.requiredOutputs).toContain(
      "Vimeo unlisted privacy hash when present"
    );
    expect(getMethod("course-media-workflow")?.warnings).toContain(
      "Never expose unpublished course or lesson content to anonymous users or unrelated accounts, including through a direct record ID."
    );
    expect(getSourceEntry("youtube-player-documentation")?.trustedFor).toContain(
      "course_media"
    );
    expect(getSourceEntry("vimeo-video-privacy-documentation")?.trustedFor).toContain(
      "course_media"
    );
  });

  it("requires evidence and provider transparency in AI results", () => {
    expect(aiDecisionPolicy.requiredResultFields).toEqual(
      expect.arrayContaining(["evidenceUsed", "methodIds", "sourceIds", "providerLabel"])
    );
  });
});
