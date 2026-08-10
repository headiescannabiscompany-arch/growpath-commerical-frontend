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

  it("admits only explicitly reviewed media while the complete catalog remains in planning", () => {
    const catalog = loadCatalog();

    expect(catalog.status).toBe("planning");
    expect(catalog.mediaRecords).toHaveLength(122);
    expect(catalog.mediaRecords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          recordId: "ipm-powdery-mildew-open-001",
          caseId: "powdery_mildew",
          imageSet: expect.arrayContaining([
            expect.objectContaining({
              sourceId: "usda_ars_image_gallery",
              licenseId: "US-PUBLIC-DOMAIN",
              intendedUseApproved: true
            }),
            expect.objectContaining({
              sourceId: "wikimedia_individual_public_domain",
              licenseId: "PUBLIC-DOMAIN-DEDICATION",
              intendedUseApproved: true
            })
          ])
        }),
        expect.objectContaining({
          recordId: "ipm-thrips-open-001",
          caseId: "thrips",
          imageSet: expect.arrayContaining([
            expect.objectContaining({
              sourceId: "usda_ars_image_gallery",
              licenseId: "US-PUBLIC-DOMAIN",
              intendedUseApproved: true
            })
          ])
        }),
        expect.objectContaining({
          recordId: "ipm-thrips-mildew-lookalike-boundary-open-002",
          caseId: "thrips",
          expectedCauseRanking: ["insufficient_evidence", "pest", "disease", "other_abiotic"]
        }),
        expect.objectContaining({
          recordId: "ipm-two-spotted-spider-mites-open-001",
          caseId: "two_spotted_spider_mites"
        }),
        expect.objectContaining({
          recordId: "ipm-two-spotted-mite-mosaic-cooccurrence-open-002",
          caseId: "two_spotted_spider_mites",
          expectedCauseRanking: ["pest", "disease", "insufficient_evidence", "other_abiotic"]
        }),
        expect.objectContaining({
          recordId: "ipm-russet-mite-cross-host-gall-boundary-open-002",
          caseId: "russet_mites",
          expectedCauseRanking: ["insufficient_evidence", "pest", "other_abiotic", "disease"]
        }),
        expect.objectContaining({
          recordId: "ipm-broad-mite-virus-curl-boundary-open-002",
          caseId: "broad_mites",
          expectedCauseRanking: ["insufficient_evidence", "pest", "disease", "other_abiotic"]
        }),
        expect.objectContaining({
          recordId: "ipm-root-aphid-fungus-gnat-boundary-open-002",
          caseId: "root_aphids",
          expectedCauseRanking: ["insufficient_evidence", "pest", "disease", "other_abiotic"]
        }),
        expect.objectContaining({
          recordId: "ipm-scale-insect-disease-cooccurrence-open-002",
          caseId: "scale_insects",
          expectedCauseRanking: ["pest", "disease", "insufficient_evidence", "other_abiotic"]
        }),
        expect.objectContaining({
          recordId: "ipm-whitefly-adult-egg-evidence-boundary-open-002",
          caseId: "whiteflies",
          expectedCauseRanking: ["insufficient_evidence", "pest", "disease", "other_abiotic"]
        }),
        expect.objectContaining({
          recordId: "ipm-fungus-gnat-root-disease-boundary-open-002",
          caseId: "fungus_gnats",
          expectedCauseRanking: ["insufficient_evidence", "disease", "pest", "other_abiotic"]
        }),
        expect.objectContaining({
          recordId: "diagnosis-botrytis-cross-host-flower-boundary-open-002",
          caseId: "botrytis_gray_mold_bud_rot",
          expectedCauseRanking: ["insufficient_evidence", "disease", "other_abiotic"]
        }),
        expect.objectContaining({
          recordId: "diagnosis-bacterial-leaf-spot-abiotic-boundary-open-002",
          caseId: "bacterial_leaf_spot",
          expectedCauseRanking: ["insufficient_evidence", "disease", "other_abiotic", "pest"]
        }),
        expect.objectContaining({
          recordId: "diagnosis-heat-drought-pest-sunscald-boundary-open-002",
          caseId: "heat_stress",
          expectedCauseRanking: ["insufficient_evidence", "other_abiotic", "pest", "disease"]
        }),
        expect.objectContaining({
          recordId: "diagnosis-frost-exposure-injury-boundary-open-002",
          caseId: "cold_damage",
          expectedCauseRanking: ["insufficient_evidence", "other_abiotic", "disease", "pest"]
        }),
        expect.objectContaining({
          recordId: "diagnosis-water-presence-root-function-boundary-open-002",
          caseId: "overwatering",
          expectedCauseRanking: ["insufficient_evidence", "other_abiotic", "disease", "lockout", "excess"]
        }),
        expect.objectContaining({
          recordId: "diagnosis-arid-context-water-deficit-boundary-open-002",
          caseId: "underwatering",
          expectedCauseRanking: ["insufficient_evidence", "other_abiotic", "disease", "excess", "pest"]
        }),
        expect.objectContaining({
          recordId: "ipm-aphids-beneficial-context-open-001",
          caseId: "aphids"
        }),
        expect.objectContaining({
          recordId: "ipm-chemical-spray-injury-open-001",
          caseId: "spray_burn",
          imageSet: expect.arrayContaining([
            expect.objectContaining({
              licenseId: "CC-BY-2.0",
              intendedUseApproved: true
            })
          ])
        }),
        expect.objectContaining({
          recordId: "ipm-normal-senescence-open-001",
          caseId: "normal_senescence"
        }),
        expect.objectContaining({
          recordId: "ipm-mealybugs-wax-lookalike-open-001",
          caseId: "mealybugs"
        }),
        expect.objectContaining({
          recordId: "ipm-whiteflies-beneficial-context-open-001",
          caseId: "whiteflies"
        }),
        expect.objectContaining({
          recordId: "ipm-leafminers-damage-larva-open-001",
          caseId: "leafminers"
        }),
        expect.objectContaining({
          recordId: "ipm-scale-insects-necrosis-open-001",
          caseId: "scale_insects"
        }),
        expect.objectContaining({
          recordId: "diagnosis-botrytis-gray-mold-open-001",
          caseId: "botrytis_gray_mold_bud_rot"
        }),
        expect.objectContaining({
          recordId: "diagnosis-pythium-wilt-insufficient-root-evidence-open-001",
          caseId: "pythium_root_rot"
        }),
        expect.objectContaining({
          recordId: "diagnosis-mosaic-virus-symptom-class-open-001",
          caseId: "mosaic_virus_symptoms"
        }),
        expect.objectContaining({
          recordId: "ipm-broad-mite-tarsonemid-lookalike-open-001",
          caseId: "broad_mites"
        }),
        expect.objectContaining({
          recordId: "ipm-russet-mite-eriophyid-boundary-open-001",
          caseId: "russet_mites"
        }),
        expect.objectContaining({
          recordId: "ipm-root-aphid-phylloxera-evidence-boundary-open-001",
          caseId: "root_aphids"
        }),
        expect.objectContaining({
          recordId: "ipm-fungus-gnat-adult-evidence-boundary-open-001",
          caseId: "fungus_gnats"
        }),
        expect.objectContaining({
          recordId: "ipm-caterpillar-sawfly-chewing-boundary-open-001",
          caseId: "caterpillars"
        }),
        expect.objectContaining({
          recordId: "ipm-beneficial-harmless-lookalikes-open-001",
          caseId: "beneficial_and_harmless_lookalikes"
        }),
        expect.objectContaining({
          recordId: "diagnosis-rust-pustule-host-boundary-open-001",
          caseId: "rust"
        }),
        expect.objectContaining({
          recordId: "diagnosis-septoria-leaf-spot-boundary-open-001",
          caseId: "septoria_and_leaf_spots"
        }),
        expect.objectContaining({
          recordId: "diagnosis-bacterial-leaf-spot-boundary-open-001",
          caseId: "bacterial_leaf_spot"
        }),
        expect.objectContaining({
          recordId: "diagnosis-fusarium-wilt-vascular-boundary-open-001",
          caseId: "fusarium"
        }),
        expect.objectContaining({
          recordId: "diagnosis-downy-mildew-surface-boundary-open-001",
          caseId: "downy_mildew"
        }),
        expect.objectContaining({
          recordId: "diagnosis-physical-hail-damage-boundary-open-001",
          caseId: "physical_damage"
        }),
        expect.objectContaining({
          recordId: "diagnosis-herbicide-injury-pattern-boundary-open-001",
          caseId: "spray_burn"
        }),
        expect.objectContaining({
          recordId: "diagnosis-acid-soil-nutrient-deficiency-boundary-open-001",
          caseId: "nutrient_deficiency"
        }),
        expect.objectContaining({
          recordId: "diagnosis-acid-soil-aluminum-root-boundary-open-001",
          caseId: "ph_problem"
        })
      ])
    );
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
        }),
        expect.objectContaining({
          sourceId: "facebook_grower_groups",
          status: "external_lead_only_pending_platform_and_creator_permission"
        }),
        expect.objectContaining({
          sourceId: "usda_ars_image_gallery",
          status: "approved"
        }),
        expect.objectContaining({
          sourceId: "wikimedia_individual_public_domain",
          status: "approved"
        })
      ])
    );
  });

  it("uses social posts only as authorized QA leads and negative controls", () => {
    const catalog = loadCatalog();

    expect(catalog.socialContentPolicy).toMatchObject({
      automatedCollectionRequiresPlatformAuthorization: true,
      privateGroupContentRequiresGroupAccessAndCreatorPermission: true,
      deidentificationRequired: true,
      engagementIsNotGroundTruth: true,
      confirmedOutcomeRequiredForGoldCase: true,
      tierACrossCheckRequiredForDiagnosticLabel: true,
      useForModelTraining: false
    });
    expect(catalog.photoEvidencePolicy).toMatchObject({
      maxPhotosPerDiagnosisIpmOrHarvestWorkflow: 12,
      minimumPhotosForHarvestProviderReview: 4
    });
    expect(catalog.photoEvidencePolicy.reviewTimeChecks).toEqual(
      expect.arrayContaining([
        "blur or missed focus",
        "missing zoomed-out context or distribution view",
        "irrelevant subject or insufficient diagnostic evidence"
      ])
    );
  });

  it("records only anonymized patterns from the manual Facebook reconnaissance", () => {
    const catalog = loadCatalog();

    expect(catalog.anonymizedManualReconnaissance).toMatchObject({
      reviewedAt: "2026-07-25",
      collectionMode: "manual visible-UI sampling",
      relevantGroupCount: 3,
      automatedCollectionUsed: false,
      personalIdentifiersRetained: false,
      postUrlsRetained: false,
      mediaRetained: false,
      creatorPermissionObtained: false,
      goldCaseRecordsAdded: 0,
      negativeControlMediaRecordsAdded: 0
    });
    expect(catalog.anonymizedManualReconnaissance.observedPatterns).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/target visible only/i),
        expect.stringMatching(/multiple organism/i),
        expect.stringMatching(/high photo count/i),
        expect.stringMatching(/diagnostically limited/i)
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
