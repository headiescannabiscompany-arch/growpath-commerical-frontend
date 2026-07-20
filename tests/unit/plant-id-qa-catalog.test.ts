import fs from "fs";
import path from "path";

function loadCatalog() {
  return JSON.parse(
    fs.readFileSync(
      path.join(
        process.cwd(),
        "tests",
        "fixtures",
        "plant-identification-qa-catalog.json"
      ),
      "utf8"
    )
  );
}

describe("plant-identification QA catalog", () => {
  it("allocates exactly 320 cases across the six requested groups", () => {
    const catalog = loadCatalog();
    const allocations = Object.fromEntries(
      Object.entries(catalog.caseGroups).map(([group, definitions]: [string, any]) => [
        group,
        definitions.reduce((sum: number, definition: any) => sum + definition.quota, 0)
      ])
    );

    expect(catalog.targetRecordCount).toBe(320);
    expect(allocations).toEqual(catalog.groupTargets);
    expect(
      Object.values(allocations).reduce((sum: number, value: any) => sum + value, 0)
    ).toBe(320);
  });

  it("defines every requested crop, ornamental, weed, lookalike, and failure case", () => {
    const catalog = loadCatalog();
    const caseIds = Object.values(catalog.caseGroups)
      .flat()
      .map((definition: any) => definition.caseId);

    expect(caseIds).toHaveLength(42);
    expect(caseIds).toEqual(
      expect.arrayContaining([
        "cannabis_harvested_flower",
        "tomato",
        "pepper",
        "cucumber",
        "lettuce",
        "basil",
        "strawberry",
        "corn",
        "common_bean",
        "rose",
        "pothos",
        "monstera",
        "peace_lily",
        "orchid",
        "marigold",
        "petunia",
        "chrysanthemum",
        "crabgrass",
        "dandelion",
        "plantain_weed",
        "clover",
        "chickweed",
        "purslane",
        "lambsquarters",
        "nutsedge",
        "poison_ivy",
        "tomato_vs_nightshade",
        "cannabis_vs_japanese_maple",
        "cannabis_vs_kenaf",
        "grass_vs_nutsedge",
        "blurry_plant_photo",
        "partial_leaf_only",
        "mixed_plants",
        "dead_leaf_only",
        "artificial_plant",
        "no_plant_scene"
      ])
    );
  });

  it("keeps harvested cannabis identifiable only at crop level", () => {
    const catalog = loadCatalog();
    const harvested = catalog.caseGroups.cannabisHemp.find(
      (definition: any) => definition.caseId === "cannabis_harvested_flower"
    );

    expect(harvested.acceptedName).toBe("Harvested cannabis or hemp flower");
    expect(harvested.distinguishingFocus).toEqual(
      expect.arrayContaining([
        "bracts or calyces",
        "pistils",
        "trichome coverage",
        "inflorescence structure",
        "no cultivar inference"
      ])
    );
  });

  it("allows only commercially compatible copied-media rights", () => {
    const catalog = loadCatalog();

    expect(catalog.rightsPolicy).toMatchObject({
      useForModelTraining: false,
      imageLevelReviewRequired: true,
      commercialQaUseApprovalRequired: true,
      creatorAndAttributionRequired: true,
      licenseRecheckBeforeExecution: true
    });
    expect(catalog.rightsPolicy.allowedCopiedMediaLicenses).toEqual([
      "CC0-1.0",
      "CC-BY-4.0",
      "OWNER_PERMISSION",
      "GROWPATH_OWNED"
    ]);
    expect(catalog.rightsPolicy.blockedCopiedMediaLicenses).toEqual(
      expect.arrayContaining([
        "ALL-RIGHTS-RESERVED",
        "CC-BY-NC",
        "CC-BY-NC-SA",
        "CC-BY-NC-ND",
        "UNKNOWN"
      ])
    );
  });

  it("requires per-image provenance, rights review, and intended-use approval", () => {
    const catalog = loadCatalog();

    expect(catalog.requiredMediaRecordFields).toEqual(
      expect.arrayContaining([
        "recordId",
        "caseId",
        "acceptedName",
        "scientificName",
        "expectedAlternatives",
        "distinguishingFeatures",
        "expectedConfidenceRange",
        "expectedResult",
        "sourceId",
        "sourceUrl",
        "mediaUrl",
        "creator",
        "licenseId",
        "attributionText",
        "retrievedAt",
        "rightsReviewedAt",
        "intendedUseApproved",
        "handling"
      ])
    );
  });

  it("keeps source collection in planning until reviewed media exists", () => {
    const catalog = loadCatalog();

    expect(catalog.status).toBe("planning");
    expect(catalog.mediaRecords).toEqual([]);
    expect(catalog.sourcePlan).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceId: "inaturalist",
          status: "candidate_metadata_only",
          allowedLicenseFilter: ["CC0", "CC-BY"]
        }),
        expect.objectContaining({
          sourceId: "growpath_owner_media",
          status: "preferred_pending_assets"
        }),
        expect.objectContaining({
          sourceId: "commissioned_failure_cases",
          status: "preferred_pending_capture"
        })
      ])
    );
  });
});
