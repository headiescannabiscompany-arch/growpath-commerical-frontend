import {
  buildModuleRecordInput,
  getModuleRecordTypeForTool
} from "../moduleRecordPersistence";

describe("moduleRecordPersistence", () => {
  test("maps approved real tools to durable module record types", () => {
    expect(getModuleRecordTypeForTool("soil-builder")).toBe("soil_builder_recipe");
    expect(getModuleRecordTypeForTool("topdress-plan")).toBe("topdress_plan");
    expect(getModuleRecordTypeForTool("nutrient-source-comparison")).toBe(
      "nutrient_source_comparison"
    );
    expect(getModuleRecordTypeForTool("soil-nutrient-batch")).toBe("soil_nutrient_batch");
    expect(getModuleRecordTypeForTool("crop-steering-project")).toBe(
      "crop_steering_entry"
    );
    expect(getModuleRecordTypeForTool("ph-ec-check")).toBe("ph_ec_check");
    expect(getModuleRecordTypeForTool("ipm-scout")).toBe("ipm_scout");
    expect(getModuleRecordTypeForTool("run-comparison")).toBe("run_comparison");
    expect(getModuleRecordTypeForTool("vpd")).toBeNull();
  });

  test("builds a durable pheno hunt module record from calculator inputs and outputs", () => {
    const payload = buildModuleRecordInput({
      tool: "pheno-hunt",
      title: "Pheno hunt: Sour Diesel",
      growId: "grow-1",
      plantId: null,
      cropProfileId: null,
      cropIdentity: null,
      selectedPlantContext: null,
      inputs: {
        growId: "grow-1",
        plants: [{ label: "SD-4", vigor: 9 }]
      },
      outputs: {
        projectName: "Sour Diesel",
        comparisonMatrix: [{ label: "SD-4", score: 8.8 }],
        recommendations: ["Retest SD-4"],
        warnings: ["Missing smoke review"]
      },
      toolRun: { id: "tool-run-1", schemaVersion: 1, calculatorVersion: "2026.07" }
    });

    expect(payload?.recordType).toBe("pheno_hunt");
    expect(payload?.title).toBe("Pheno hunt: Sour Diesel");
    expect(payload?.growId).toBe("grow-1");
    expect(payload?.linkedToolRunId).toBe("tool-run-1");
    expect(payload?.recommendations).toContain("Retest SD-4");
    expect(payload?.warnings).toContain("Missing smoke review");
  });

  test("preserves IPM local and AI verification results for second-opinion review", () => {
    const payload = buildModuleRecordInput({
      tool: "ipm-scout",
      title: "IPM scout: possible thrips",
      growId: "grow-ipm",
      plantId: "plant-1",
      cropProfileId: "crop-1",
      cropIdentity: { likelyCrop: "Cannabis" },
      selectedPlantContext: { id: "plant-1", label: "Plant 1" },
      inputs: {
        growId: "grow-ipm",
        pestSeen: "none",
        leafDamage: "stippling"
      },
      outputs: {
        growPathRuleResult: {
          suspectedIssues: [{ issueName: "thrips possible", category: "pest" }]
        },
        gptVerification: {
          status: "completed",
          agreementStatus: "partially_agrees",
          likelyIssues: [{ issueName: "possible thrips pressure", category: "pest" }]
        },
        taskSuggestions: [{ title: "Re-scout leaf undersides" }]
      },
      toolRun: { id: "tool-run-ipm" }
    });

    expect(payload?.recordType).toBe("ipm_scout");
    expect(payload?.localRuleResult).toEqual({
      suspectedIssues: [{ issueName: "thrips possible", category: "pest" }]
    });
    expect(payload?.aiVerificationResult).toEqual({
      status: "completed",
      agreementStatus: "partially_agrees",
      likelyIssues: [{ issueName: "possible thrips pressure", category: "pest" }]
    });
    expect(payload?.outputs?.gptVerification).toEqual({
      status: "completed",
      agreementStatus: "partially_agrees",
      likelyIssues: [{ issueName: "possible thrips pressure", category: "pest" }]
    });
    expect(payload?.agreementStatus).toBe("partially_agrees");
    expect(payload?.tasksToCreate?.[0].title).toBe("Re-scout leaf undersides");
  });
});
