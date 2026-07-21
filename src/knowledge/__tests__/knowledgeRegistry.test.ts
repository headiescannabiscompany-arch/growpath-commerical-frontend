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
      "crop-identification photo count, provider/model, quality, visible traits, evidence IDs, and limitations preserved in the saved result"
    );
  });

  it("requires evidence and provider transparency in AI results", () => {
    expect(aiDecisionPolicy.requiredResultFields).toEqual(
      expect.arrayContaining(["evidenceUsed", "methodIds", "sourceIds", "providerLabel"])
    );
  });
});
