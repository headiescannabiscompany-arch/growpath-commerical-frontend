const crypto = require("crypto");
const {
  buildReviewQueue,
  candidateSafetyBlockers,
  deriveSourceQueries,
  parseArgs,
  reviewDecisionBlockers,
  selectCaseCandidates
} = require("../../scripts/prepare-plant-id-qa-review.cjs");

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

function candidate(
  candidateId,
  caseId,
  collectionMode,
  sourceQuery = "Solanum lycopersicum"
) {
  return {
    candidateId,
    caseId,
    photoId: Number(candidateId.replace(/\D/g, "")),
    sourceId: "inaturalist",
    sourceUrl: `https://www.inaturalist.org/observations/${candidateId}`,
    mediaUrl: `https://example.test/${candidateId}/original.jpg`,
    previewUrl: `https://example.test/${candidateId}/medium.jpg`,
    creator: "Observer",
    attributionText: "Observer, CC BY",
    sourceLicenseCode: "cc-by",
    sourceQuery,
    collectionMode,
    qualityGrade: collectionMode === "cultivated" ? "casual" : "research",
    captiveOrCultivated: collectionMode === "cultivated",
    observedTaxonId: 1,
    observedTaxonName: "Solanum lycopersicum",
    observedTaxonRank: "species",
    identificationAgreementCount: 3,
    identificationDisagreementCount: 0,
    ownerIdentificationUsedComputerVision: false,
    reviewStatus: "pending_image_taxonomy_stage_and_rights_review",
    identityApproved: false,
    lifeStageApproved: false,
    rightsReviewedAt: null,
    intendedUseApproved: false
  };
}

const caseDefinition = {
  caseId: "tomato",
  acceptedName: "Tomato",
  scientificName: "Solanum lycopersicum",
  lifeStage: "mixed",
  quota: 4,
  expectedAlternatives: ["black nightshade"],
  distinguishingFocus: ["compound leaves"],
  groupName: "foodCrops"
};

describe("Plant ID QA review queue", () => {
  it("is dry-run by default and requires explicit execution for replacement", () => {
    expect(parseArgs([])).toEqual({ execute: false, replace: false });
    expect(parseArgs(["--execute", "--replace"])).toEqual({
      execute: true,
      replace: true
    });
    expect(() => parseArgs(["--replace"])).toThrow(/requires --execute/i);
  });

  it("balances cultivated and research-wild candidates without duplicate photos", () => {
    const selected = selectCaseCandidates(
      caseDefinition,
      [
        candidate("candidate-1", "tomato", "cultivated"),
        candidate("candidate-2", "tomato", "cultivated"),
        candidate("candidate-3", "tomato", "research_wild"),
        candidate("candidate-4", "tomato", "research_wild"),
        candidate("candidate-5", "tomato", "research_wild")
      ],
      new Set()
    );

    expect(selected).toHaveLength(4);
    expect(selected.filter((item) => item.collectionMode === "cultivated")).toHaveLength(
      2
    );
    expect(
      selected.filter((item) => item.collectionMode === "research_wild")
    ).toHaveLength(2);
    expect(new Set(selected.map((item) => item.photoId)).size).toBe(4);
    expect(deriveSourceQueries("Cannabis sativa or Acer palmatum")).toEqual([
      "Cannabis sativa",
      "Acer palmatum"
    ]);
  });

  it("balances both sides of a lookalike comparison when mode availability is uneven", () => {
    const lookalikeCase = {
      ...caseDefinition,
      caseId: "grass_vs_nutsedge",
      scientificName: "Poaceae or Cyperus species",
      groupName: "lookalikes",
      quota: 6
    };
    const candidates = [
      ...[1, 2, 3, 4, 5, 6].map((id) =>
        candidate(`candidate-z-${id}`, lookalikeCase.caseId, "cultivated", "Poaceae")
      ),
      ...[1, 2, 3, 4, 5, 6].map((id) =>
        candidate(`candidate-a-${id}`, lookalikeCase.caseId, "cultivated", "Cyperus")
      ),
      ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((id) =>
        candidate(`candidate-b-${id}`, lookalikeCase.caseId, "research_wild", "Cyperus")
      )
    ];
    const selected = selectCaseCandidates(lookalikeCase, candidates, new Set());

    expect(selected).toHaveLength(6);
    expect(selected.filter((item) => item.sourceQuery === "Poaceae")).toHaveLength(3);
    expect(selected.filter((item) => item.sourceQuery === "Cyperus")).toHaveLength(3);
    expect(selected.filter((item) => item.collectionMode === "cultivated")).toHaveLength(
      3
    );
    expect(
      selected.filter((item) => item.collectionMode === "research_wild")
    ).toHaveLength(3);
  });

  it("builds only pending reviews and records missing owned failure media", () => {
    const catalog = {
      targetRecordCount: 5,
      caseGroups: {
        foodCrops: [{ ...caseDefinition, quota: 4 }],
        failureCases: [
          {
            caseId: "no_plant_scene",
            acceptedName: "No plant detected",
            scientificName: "",
            lifeStage: "not_applicable",
            quota: 1,
            expectedAlternatives: ["upload a plant photo"],
            distinguishingFocus: ["no false crop result"]
          }
        ]
      }
    };
    const catalogRaw = JSON.stringify(catalog);
    const candidates = [
      candidate("candidate-1", "tomato", "cultivated"),
      candidate("candidate-2", "tomato", "cultivated"),
      candidate("candidate-3", "tomato", "research_wild"),
      candidate("candidate-4", "tomato", "research_wild")
    ];
    const candidateManifest = {
      schemaVersion: "growpath-plant-identification-qa-candidates-v2",
      catalogSnapshot: { sha256: sha256(catalogRaw) },
      candidates
    };
    const candidateRaw = JSON.stringify(candidateManifest);
    const queue = buildReviewQueue({
      catalog,
      catalogRaw,
      candidateManifest,
      candidateRaw
    });

    expect(queue.queuedReviewCount).toBe(4);
    expect(queue.missingReviewCount).toBe(1);
    expect(queue.promotableReviewCount).toBe(0);
    expect(queue.reviewItems.every((item) => item.review.status === "pending")).toBe(
      true
    );
    expect(queue.safeguards).toMatchObject({
      copiesMedia: false,
      storesCoordinates: false,
      automaticallyApprovesReviews: false,
      automaticallyPromotesCatalogRecords: false
    });
    expect(queue.missingCases).toEqual([
      expect.objectContaining({
        caseId: "no_plant_scene",
        missing: 1,
        acquisitionRequirement: "owned_or_commissioned_failure_media"
      })
    ]);
  });

  it("requires explicit morphology, Tier A cross-check, exact rights, and QA approval", () => {
    const pending = {
      candidate: candidate("candidate-1", "tomato", "cultivated"),
      review: {
        status: "approved",
        reviewedBy: "qa-reviewer",
        reviewedAt: "2026-08-11",
        identityApproved: true,
        lifeStageApproved: true,
        visibleMorphology: ["compound leaves"],
        distinguishingFeatures: ["hairy stem"],
        expectedConfidenceRange: { minimum: 0.7, maximum: 0.9 },
        expectedResult: "Return Tomato with supported alternatives.",
        taxonomyCrossChecks: [],
        exactLicenseId: "CC-BY-4.0",
        licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
        rightsReviewedAt: "2026-08-11",
        intendedUseApproved: true
      }
    };

    expect(reviewDecisionBlockers(pending)).toContain(
      "Tier A taxonomy or morphology cross-check is missing"
    );
    pending.review.taxonomyCrossChecks = [
      {
        sourceId: "kew-powo",
        recordUrl: "https://powo.science.kew.org/example",
        outcome: "Accepted taxon and morphology are compatible."
      }
    ];
    expect(reviewDecisionBlockers(pending)).toEqual([]);
  });

  it("rejects candidates that contain coordinates or bypass pending review", () => {
    const unsafe = {
      ...candidate("candidate-1", "tomato", "cultivated"),
      geojson: { type: "Point", coordinates: [-78.6, 35.8] },
      identityApproved: true
    };

    expect(candidateSafetyBlockers(unsafe)).toEqual(
      expect.arrayContaining([
        "candidate contains location data",
        "candidate bypassed pending review gates"
      ])
    );
  });
});
