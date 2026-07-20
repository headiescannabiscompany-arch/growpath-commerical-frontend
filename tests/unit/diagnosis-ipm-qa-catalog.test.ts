import fs from "fs";
import path from "path";

function loadCatalog() {
  return JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), "tests", "fixtures", "diagnosis-ipm-qa-catalog.json"),
      "utf8"
    )
  );
}

describe("diagnosis/IPM QA catalog", () => {
  it("allocates exactly 252 records across disease, pest, and abiotic groups", () => {
    const catalog = loadCatalog();
    const allocations = Object.fromEntries(
      Object.entries(catalog.caseGroups).map(([group, definitions]: [string, any]) => [
        group,
        definitions.reduce((sum: number, definition: any) => sum + definition.quota, 0)
      ])
    );

    expect(catalog.targetRecordCount).toBe(252);
    expect(allocations).toEqual(catalog.groupTargets);
    expect(
      Object.values(allocations).reduce((sum: number, value: any) => sum + value, 0)
    ).toBe(252);
  });

  it("defines the full requested disease, pest, beneficial, and abiotic set", () => {
    const catalog = loadCatalog();
    const caseIds = Object.values(catalog.caseGroups)
      .flat()
      .map((definition: any) => definition.caseId);

    expect(caseIds).toHaveLength(41);
    expect(caseIds).toEqual(
      expect.arrayContaining([
        "powdery_mildew",
        "botrytis_gray_mold_bud_rot",
        "pythium_root_rot",
        "mosaic_virus_symptoms",
        "two_spotted_spider_mites",
        "broad_mites",
        "russet_mites",
        "root_aphids",
        "beneficial_and_harmless_lookalikes",
        "nutrient_deficiency",
        "nutrient_excess",
        "nutrient_lockout",
        "nutrient_antagonism",
        "calcium_root_environment",
        "normal_senescence",
        "physical_damage",
        "organic_release_timing"
      ])
    );
  });

  it("locks the ETGU diagnostic order before cause ranking", () => {
    const catalog = loadCatalog();

    expect(catalog.diagnosticSequence).toEqual([
      "pattern",
      "medium_root_zone",
      "environment",
      "measured_values",
      "cause_ranking"
    ]);
  });

  it("requires the same evidence envelope and persists disagreements", () => {
    const catalog = loadCatalog();

    expect(catalog.evidenceEnvelopeContract).toMatchObject({
      identicalEnvelopeForGrowPathAndGpt: true,
      photoBytesIncludedOnlyWhenPixelAnalysisIsSupported: true,
      textOnlySecondOpinionMustDiscloseNoPixelInspection: true,
      persistBothAnswers: true,
      persistDisagreements: true,
      linkedRecordTypesWhenContextExists: [
        "Plant",
        "Grow",
        "Log",
        "ToolRun",
        "Task",
        "Facility"
      ]
    });
  });

  it("requires multi-image, measurement, confirmation, and response evidence", () => {
    const catalog = loadCatalog();

    expect(catalog.requiredMediaRecordFields).toEqual(
      expect.arrayContaining([
        "imageSet",
        "plant",
        "lifeStage",
        "affectedLocation",
        "distribution",
        "progression",
        "mediumRootZone",
        "environment",
        "measuredValues",
        "diagnosticSigns",
        "plausibleAlternatives",
        "confirmationMethod",
        "expectedCauseRanking",
        "expectedUrgency",
        "expectedQuarantineGuidance",
        "expectedScoutingSteps",
        "expectedIpmResponse"
      ])
    );
    expect(catalog.requiredImageFields).toEqual(
      expect.arrayContaining([
        "sourceUrl",
        "mediaUrl",
        "creator",
        "licenseId",
        "attributionText",
        "rightsReviewedAt",
        "intendedUseApproved"
      ])
    );
  });

  it("keeps sources and media in planning until explicitly reviewed", () => {
    const catalog = loadCatalog();

    expect(catalog.status).toBe("planning");
    expect(catalog.mediaRecords).toEqual([]);
    expect(catalog.sourcePlan).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceId: "plantvillage",
          status: "candidate_pending_license_review"
        }),
        expect.objectContaining({
          sourceId: "growpath_owner_media",
          status: "preferred_pending_assets"
        }),
        expect.objectContaining({
          sourceId: "commissioned_mimic_cases",
          status: "preferred_pending_capture"
        })
      ])
    );
  });

  it("prohibits invented pesticide directions", () => {
    const catalog = loadCatalog();

    expect(catalog.evidenceEnvelopeContract.pesticideRule).toContain(
      "No invented pesticide"
    );
    expect(catalog.treatmentEvidencePolicy.forumsOrSocialAsSoleSupport).toBe(false);
    expect(catalog.treatmentEvidencePolicy.requiredCrossChecks).toEqual(
      expect.arrayContaining([
        "jurisdiction",
        "current product label",
        "worker and harvest intervals",
        "beneficial compatibility"
      ])
    );
  });
});
