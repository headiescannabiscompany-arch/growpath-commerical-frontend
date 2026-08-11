const {
  buildReviewQueue,
  catalogDefinitionProjection
} = require("../../scripts/prepare-plant-id-qa-review.cjs");
const {
  buildPromotionPlan,
  parseArgs,
  sha256,
  verifyExpectedHashes
} = require("../../scripts/promote-plant-id-qa-reviews.cjs");

function sourceCandidate() {
  return {
    candidateId: "inat-photo-100",
    caseId: "tomato_seedling",
    plantCategory: "foodCrops",
    catalogAcceptedName: "Tomato seedling",
    catalogScientificName: "Solanum lycopersicum",
    catalogLifeStage: "seedling",
    catalogExpectedAlternatives: ["nightshade seedling"],
    catalogDistinguishingFocus: ["compound leaves", "hairy stem"],
    sourceId: "inaturalist",
    sourceQuery: "Solanum lycopersicum",
    sourceUrl: "https://www.inaturalist.org/observations/100",
    photoId: 100,
    previewUrl: "https://static.inaturalist.org/photos/100/medium.jpg",
    mediaUrl: "https://static.inaturalist.org/photos/100/original.jpg",
    creator: "Example observer",
    attributionText: "Example observer, CC BY",
    sourceLicenseCode: "cc-by",
    collectionMode: "cultivated",
    qualityGrade: "casual",
    captiveOrCultivated: true,
    observedTaxonId: 200,
    observedTaxonName: "Solanum lycopersicum",
    observedTaxonRank: "species",
    identificationAgreementCount: 2,
    identificationDisagreementCount: 0,
    ownerIdentificationUsedComputerVision: false,
    reviewStatus: "pending_image_taxonomy_stage_and_rights_review",
    identityApproved: false,
    lifeStageApproved: false,
    rightsReviewedAt: null,
    intendedUseApproved: false,
    handling: "external_reference"
  };
}

function governedCatalog() {
  return {
    schemaVersion: "growpath-plant-identification-qa-v1",
    status: "planning",
    targetRecordCount: 1,
    purpose: "QA only; never model training.",
    caseGroups: {
      foodCrops: [
        {
          caseId: "tomato_seedling",
          acceptedName: "Tomato seedling",
          scientificName: "Solanum lycopersicum",
          lifeStage: "seedling",
          quota: 1,
          expectedAlternatives: ["nightshade seedling"],
          distinguishingFocus: ["compound leaves", "hairy stem"]
        }
      ]
    },
    mediaRecords: []
  };
}

function inputs() {
  const catalog = governedCatalog();
  const catalogRaw = JSON.stringify(catalog);
  const candidateManifest = {
    schemaVersion: "growpath-plant-identification-qa-candidates-v2",
    generatedAt: "2026-08-11T12:00:00.000Z",
    catalogSnapshot: { sha256: sha256(catalogRaw) },
    candidates: [sourceCandidate()]
  };
  const candidateRaw = JSON.stringify(candidateManifest);
  const reviewManifest = buildReviewQueue({
    catalog,
    catalogRaw,
    candidateManifest,
    candidateRaw
  });
  const reviewRaw = JSON.stringify(reviewManifest);
  return {
    catalog,
    catalogRaw,
    candidateManifest,
    candidateRaw,
    reviewManifest,
    reviewRaw
  };
}

function approve(reviewManifest) {
  reviewManifest.reviewItems[0].review = {
    status: "approved",
    reviewedBy: "qualified-reviewer",
    reviewedAt: "2026-08-11",
    identityApproved: true,
    lifeStageApproved: true,
    visibleMorphology: ["compound leaves", "hairy stem"],
    distinguishingFeatures: ["serrated compound leaves", "pubescent stem"],
    expectedConfidenceRange: { minimum: 0.7, maximum: 0.9 },
    expectedResult: "Return tomato seedling with nightshade as a visible alternative.",
    taxonomyCrossChecks: [
      {
        sourceId: "kew-powo",
        recordUrl: "https://powo.science.kew.org/taxon/example",
        outcome: "Accepted name and visible morphology are compatible."
      }
    ],
    exactLicenseId: "CC-BY-4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    rightsReviewedAt: "2026-08-11",
    intendedUseApproved: true,
    rejectionReason: "",
    notes: "Reviewed for evaluation use only."
  };
}

function rebuildReviewRaw(value) {
  return { ...value, reviewRaw: JSON.stringify(value.reviewManifest) };
}

describe("Plant ID reviewed-record promotion gate", () => {
  it("stays dry-run by default and requires all exact hashes for execution", () => {
    expect(parseArgs([])).toMatchObject({ execute: false });
    expect(() => parseArgs(["--execute"])).toThrow(
      "--expected-catalog-sha256 is required"
    );
    const hash = "a".repeat(64);
    expect(
      parseArgs([
        "--execute",
        `--expected-catalog-sha256=${hash}`,
        `--expected-candidate-sha256=${hash}`,
        `--expected-review-sha256=${hash}`
      ])
    ).toMatchObject({ execute: true, expectedReviewSha256: hash });
  });

  it("keeps every pending review blocked and produces no catalog records", () => {
    const value = inputs();
    const plan = buildPromotionPlan(value);

    expect(plan.promotableReviewCount).toBe(0);
    expect(plan.blockedReviewCount).toBe(1);
    expect(plan.newRecordCount).toBe(0);
    expect(plan.nextCatalog).toEqual(value.catalog);
    expect(plan.blockedReviews[0].blockers).toContain("status is not approved");
  });

  it("promotes a fully approved review with review, taxonomy, and rights provenance", () => {
    let value = inputs();
    approve(value.reviewManifest);
    value = rebuildReviewRaw(value);
    const plan = buildPromotionPlan(value);

    expect(plan.promotableReviewCount).toBe(1);
    expect(plan.newRecordCount).toBe(1);
    expect(plan.nextCatalogStatus).toBe("seed_ready");
    expect(plan.newRecords[0]).toMatchObject({
      recordId: "plant-id-tomato_seedling-001",
      caseId: "tomato_seedling",
      licenseId: "CC-BY-4.0",
      retrievedAt: "2026-08-11",
      rightsReviewedAt: "2026-08-11",
      intendedUseApproved: true,
      handling: "external_reference",
      reviewProvenance: {
        reviewedBy: "qualified-reviewer"
      },
      candidateProvenance: {
        candidateId: "inat-photo-100",
        photoId: 100
      }
    });
  });

  it("rejects target or candidate tampering after the queue snapshot", () => {
    const targetTamper = inputs();
    targetTamper.reviewManifest.reviewItems[0].targetScientificName = "Solanum nigrum";
    targetTamper.reviewRaw = JSON.stringify(targetTamper.reviewManifest);
    expect(() => buildPromotionPlan(targetTamper)).toThrow(
      "review target differs from the governed case definition"
    );

    const candidateTamper = inputs();
    candidateTamper.reviewManifest.reviewItems[0].candidate.mediaUrl =
      "https://example.com/replacement.jpg";
    candidateTamper.reviewRaw = JSON.stringify(candidateTamper.reviewManifest);
    expect(() => buildPromotionPlan(candidateTamper)).toThrow(
      "review candidate differs from the bound candidate manifest"
    );
  });

  it("rejects catalog-definition drift while allowing reviewed records to accumulate", () => {
    let value = inputs();
    approve(value.reviewManifest);
    value = rebuildReviewRaw(value);
    const firstPlan = buildPromotionPlan(value);

    const accumulatedCatalog = firstPlan.nextCatalog;
    const accumulated = {
      ...value,
      catalog: accumulatedCatalog,
      catalogRaw: JSON.stringify(accumulatedCatalog)
    };
    const repeated = buildPromotionPlan(accumulated);
    expect(repeated.newRecordCount).toBe(0);
    expect(repeated.alreadyPromotedCount).toBe(1);

    accumulated.catalog.caseGroups.foodCrops[0].scientificName = "Solanum nigrum";
    accumulated.catalogRaw = JSON.stringify(accumulated.catalog);
    expect(() => buildPromotionPlan(accumulated)).toThrow(
      "review manifest is not bound to the current catalog definitions"
    );
  });

  it("requires exact current hashes immediately before an explicit write", () => {
    let value = inputs();
    approve(value.reviewManifest);
    value = rebuildReviewRaw(value);
    const plan = buildPromotionPlan(value);

    expect(() =>
      verifyExpectedHashes(
        {
          expectedCatalogSha256: "0".repeat(64),
          expectedCandidateSha256: plan.candidateSha256,
          expectedReviewSha256: plan.reviewSha256
        },
        plan
      )
    ).toThrow("Expected catalog SHA-256 does not match");
    expect(() =>
      verifyExpectedHashes(
        {
          expectedCatalogSha256: plan.catalogSha256,
          expectedCandidateSha256: plan.candidateSha256,
          expectedReviewSha256: plan.reviewSha256
        },
        plan
      )
    ).not.toThrow();
  });

  it("binds review queues to the immutable catalog definition projection", () => {
    const value = inputs();
    expect(value.reviewManifest.catalogDefinitionSnapshot.sha256).toBe(
      sha256(JSON.stringify(catalogDefinitionProjection(value.catalog)))
    );
  });
});
