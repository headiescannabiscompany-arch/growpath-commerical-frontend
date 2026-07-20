import fs from "fs";
import path from "path";

function loadFixture() {
  const file = path.join(
    process.cwd(),
    "tests",
    "fixtures",
    "growpath-qa-seed-system.json"
  );
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

describe("GrowPath QA seed-system fixture", () => {
  it("defines four governed packs mapped to master items 50-53", () => {
    const fixture = loadFixture();

    expect(fixture.schemaVersion).toBe("growpath-qa-seed-system-v1");
    expect(fixture.packs.map((pack: any) => pack.id)).toEqual([
      "plant-identification",
      "diagnosis-ipm",
      "living-soil-labs-commerce",
      "facility-simulator"
    ]);
    expect(fixture.packs.map((pack: any) => pack.masterItem)).toEqual([50, 51, 52, 53]);
  });

  it("blocks production, secrets, duplicate seeds, and seed runs without cleanup", () => {
    const fixture = loadFixture();

    expect(fixture.environments).toMatchObject({
      allowed: ["test", "staging"],
      productionAllowed: false,
      explicitEnvironmentConfirmationRequired: true
    });
    expect(fixture.executionContract).toMatchObject({
      qaSeedNamespaceRequired: true,
      idempotent: true,
      dryRunRequired: true,
      verifyRequired: true,
      cleanupRequired: true,
      plaintextCredentialsAllowed: false,
      productionIdentifiersAllowed: false
    });
  });

  it("requires image-level rights and forbids model-training use", () => {
    const fixture = loadFixture();

    expect(fixture.dataRights).toMatchObject({
      useForModelTraining: false,
      imageLevelLicenseRequired: true,
      creatorRequired: true,
      attributionRequired: true,
      commercialProductQaUseMustBeAllowed: true,
      allowAllRightsReservedCopies: false,
      allowNonCommercialLicenseCopies: false
    });
    for (const source of fixture.sourceCandidates) {
      expect(source.licenseReviewRequired).toBe(true);
      expect(source.reliabilityTier).toBeTruthy();
      expect(source.crossCheckRequired).toBe(true);
      expect(source.lastReviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(source.trustedFor.length).toBeGreaterThan(0);
      expect(source.notTrustedFor.length).toBeGreaterThan(0);
    }
  });

  it("keeps identification grow-optional and cannabis crop-level only", () => {
    const fixture = loadFixture();
    const pack = fixture.packs.find(
      (candidate: any) => candidate.id === "plant-identification"
    );

    expect(pack.targetRecordCount).toEqual({ minimum: 300, maximum: 500 });
    expect(pack.caseGroups.cannabisHemp).toEqual(
      expect.arrayContaining([
        "seedling",
        "vegetative",
        "flowering",
        "male",
        "female",
        "harvested_flower"
      ])
    );
    expect(pack.expectedBehavior).toMatchObject({
      growRequired: false,
      cannabisCropLevelDraftAllowedFromClearMorphology: true,
      cultivarInferenceAllowed: false,
      pixelAnalysisDisclosureRequired: true,
      replacementPhotoGuidanceRequired: true
    });
  });

  it("preserves ETGU order and one reviewed GrowPath/GPT evidence envelope", () => {
    const fixture = loadFixture();
    const pack = fixture.packs.find((candidate: any) => candidate.id === "diagnosis-ipm");

    expect(pack.evidenceContract.decisionOrder).toEqual([
      "pattern",
      "medium_root_zone",
      "environment",
      "measured_values",
      "cause_ranking"
    ]);
    expect(pack.evidenceContract).toMatchObject({
      sameReviewedEnvelopeForGrowPathAndGpt: true,
      agreementStateRequired: true,
      pesticideProductOrRateOutputAllowed: false
    });
    expect(pack.caseGroups).toEqual(
      expect.objectContaining({
        diseases: expect.any(Array),
        pestsAndLookalikes: expect.any(Array),
        abioticMimics: expect.any(Array)
      })
    );
  });

  it("keeps Living Soil Labs as the brand and verifies proposed ratios before use", () => {
    const fixture = loadFixture();
    const pack = fixture.packs.find(
      (candidate: any) => candidate.id === "living-soil-labs-commerce"
    );
    const proposedMixes = pack.productDrafts.filter(
      (product: any) => product.proposedLabelRatio
    );

    expect(pack.brandName).toBe("Living Soil Labs");
    expect(pack.applicationModuleName).toBe("Soil & Nutrient Batch Planner");
    expect(proposedMixes.map((product: any) => product.proposedLabelRatio)).toEqual([
      "3-3-3",
      "3-1-2",
      "1-3-2",
      "2-6-4",
      "0.5-3-3"
    ]);
    expect(
      proposedMixes.every(
        (product: any) => product.requiresOwnerOrLabelVerification === true
      )
    ).toBe(true);
    expect(pack.productDrafts.map((product: any) => product.name)).toEqual(
      expect.arrayContaining([
        "Penny Saver Soil",
        "Living Soil",
        "No-Till Soil",
        "Living Soil Labs Shirt",
        "Living Soil Labs Embroidered Hat"
      ])
    );
  });

  it("maps facility personas onto canonical roles and retains incident coverage", () => {
    const fixture = loadFixture();
    const pack = fixture.packs.find(
      (candidate: any) => candidate.id === "facility-simulator"
    );

    expect(pack.canonicalRoles).toEqual(["owner", "manager", "staff", "viewer"]);
    expect(pack.status).toBe("seed_ready");
    expect(pack.seedInputApproval).toMatchObject({
      status: "approved",
      scope: "private synthetic QA fixtures for test and staging only"
    });
    expect(pack.postSeedAcceptanceRequired).toBe(true);
    expect(pack.telemetryMetrics).toHaveLength(15);
    expect(pack.personaAssignments).toEqual(
      expect.arrayContaining([
        { persona: "grower", role: "staff" },
        { persona: "scout", role: "staff" },
        { persona: "restricted_employee", role: "viewer" }
      ])
    );
    expect(pack.incidents).toHaveLength(13);
    expect(pack.acceptanceFocus).toEqual(
      expect.arrayContaining([
        "entitlement_loading",
        "ai_credit_charge_and_refund",
        "facility_owner_access",
        "persistence_and_reload",
        "tool_write_back_scope"
      ])
    );
  });
});
