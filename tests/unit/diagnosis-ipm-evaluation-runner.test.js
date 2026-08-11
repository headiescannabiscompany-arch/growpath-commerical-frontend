const fs = require("node:fs");
const path = require("node:path");

const {
  EXECUTE_CONFIRMATION,
  assertSeedReadyCatalog,
  buildCaseInput,
  evidenceEnvelopeDigest,
  normalizeCauseClass,
  parseExecutionConfig,
  saveEvidence,
  summarizeResults,
  validateEvaluationResponse
} = require("../../scripts/run-diagnosis-ipm-evaluation.cjs");

function loadCatalog() {
  return JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), "tests", "fixtures", "diagnosis-ipm-qa-catalog.json"),
      "utf8"
    )
  );
}

function executionEnv(overrides = {}) {
  return {
    GROWPATH_DIAGNOSIS_IPM_EVALUATION_ENV: "staging",
    GROWPATH_DIAGNOSIS_IPM_EVALUATION_CONFIRM: EXECUTE_CONFIRMATION,
    GROWPATH_DIAGNOSIS_IPM_EVALUATION_NAMESPACE:
      "growpath-qa-diagnosis-ipm-contract-20260811",
    GROWPATH_DIAGNOSIS_IPM_EVALUATION_URL: "https://growpath-api-staging.onrender.com",
    GROWPATH_DIAGNOSIS_IPM_EVALUATION_TOKEN: "test-token-not-a-real-secret",
    GROWPATH_DIAGNOSIS_IPM_EVALUATION_GIT_SHA: "bdb1e33f2c13d8973dcd9bfc8c8993b955111b0a",
    ...overrides
  };
}

describe("Diagnosis/IPM evaluation runner", () => {
  it("accepts only the complete seed-ready governed catalog", () => {
    const catalog = loadCatalog();

    expect(assertSeedReadyCatalog(catalog)).toBe(catalog);
    expect(catalog.mediaRecords).toHaveLength(252);
    expect(catalog.mediaRecords.flatMap((record) => record.imageSet)).toHaveLength(504);

    expect(() => assertSeedReadyCatalog({ ...catalog, status: "planning" })).toThrow(
      /must be seed_ready/i
    );
    expect(() =>
      assertSeedReadyCatalog({ ...catalog, mediaRecords: catalog.mediaRecords.slice(1) })
    ).toThrow(/exactly 252/i);
  });

  it("builds a shared structured envelope without claiming pixel inspection", () => {
    const catalog = loadCatalog();
    const record = catalog.mediaRecords[0];
    const input = buildCaseInput(record, "growpath-qa-diagnosis-ipm-contract-20260811");

    expect(input.qaEvaluation).toMatchObject({
      recordId: record.recordId,
      caseId: record.caseId,
      useForModelTraining: false
    });
    expect(input.mediaEvidence).toHaveLength(record.imageSet.length);
    expect(input.imageAnalysis).toMatchObject({
      requested: true,
      performed: false,
      photosAnalyzed: 0,
      photoCount: record.imageSet.length
    });
    expect(input.imageAnalysis.limitations.join(" ")).toMatch(
      /must not claim that image pixels were inspected/i
    );
  });

  it("requires explicit test or staging execution and refuses production hosts", () => {
    expect(parseExecutionConfig(executionEnv())).toMatchObject({
      environment: "staging",
      namespace: "growpath-qa-diagnosis-ipm-contract-20260811",
      baseUrl: "https://growpath-api-staging.onrender.com",
      gitSha: "bdb1e33f2c13d8973dcd9bfc8c8993b955111b0a"
    });

    expect(() =>
      parseExecutionConfig(
        executionEnv({
          GROWPATH_DIAGNOSIS_IPM_EVALUATION_URL: "https://api.growpathai.com"
        })
      )
    ).toThrow(/refusing non-QA evaluation host/i);
    expect(() =>
      parseExecutionConfig(
        executionEnv({ GROWPATH_DIAGNOSIS_IPM_EVALUATION_CONFIRM: "RUN_ANYWHERE" })
      )
    ).toThrow(/refusing execution/i);
    expect(() =>
      parseExecutionConfig(
        executionEnv({ GROWPATH_DIAGNOSIS_IPM_EVALUATION_GIT_SHA: "bdb1e33" })
      )
    ).toThrow(/exact 40-character SHA/i);
    expect(() =>
      parseExecutionConfig(
        executionEnv({
          GROWPATH_DIAGNOSIS_IPM_EVALUATION_URL:
            "https://user:secret@growpath-api-staging.onrender.com/proxy"
        })
      )
    ).toThrow(/credential-free API origin/i);
  });

  it("accepts persisted answers only when all shared-envelope digests match", () => {
    const record = loadCatalog().mediaRecords[0];
    const inputSnapshot = {
      cropContext: record.plant,
      evidence: record.diagnosticSigns
    };
    const digest = evidenceEnvelopeDigest(inputSnapshot);
    const body = {
      toolRun: {
        id: "tool-run-1",
        plantId: "plant-1",
        growId: "grow-1",
        linkedLogId: "log-1",
        linkedTaskIds: ["task-1"],
        facilityId: "facility-1"
      },
      outputs: {
        primaryAnswer: {
          suspectedIssue: "disease_or_leaf_spot",
          supportingEvidence: [],
          counterEvidence: [],
          missingInformation: []
        },
        gptVerification: {
          status: "completed",
          inputSnapshot,
          evidenceEnvelopeDigest: digest,
          suspectedIssue: "disease_or_leaf_spot",
          supportingEvidence: [],
          counterEvidence: [],
          missingInformation: []
        },
        evidenceEnvelopeDigest: digest,
        verificationComparison: {
          evidenceEnvelopeDigest: digest,
          sameEvidenceEnvelope: true
        },
        agreementStatus: "agrees",
        disagreements: [],
        requestedFollowUps: ["Inspect again"],
        billingEvidence: {
          aiCreditsUsed: 1,
          ledgerReceiptPresent: true,
          receiptId: "ledger-1"
        }
      }
    };

    expect(validateEvaluationResponse(record, body)).toMatchObject({
      status: "persisted",
      toolRunId: "tool-run-1",
      evidenceEnvelopeDigest: digest,
      evidencePersistenceComplete: true,
      primaryCauseClass: "disease",
      gptCauseClass: "disease",
      billingEvidenceComplete: true,
      missingLinkedRecordTypes: []
    });

    body.outputs.verificationComparison.evidenceEnvelopeDigest = "sha256:wrong";
    expect(() => validateEvaluationResponse(record, body)).toThrow(
      /identical-envelope digest check/i
    );
  });

  it("does not call an evaluation complete without all records, provider, ledger, and links", () => {
    const complete = {
      recordId: "case-1",
      status: "persisted",
      gptAnswer: { status: "completed" },
      evidencePersistenceComplete: true,
      billingEvidenceComplete: true,
      missingLinkedRecordTypes: [],
      primaryWithinExpected: true,
      gptWithinExpected: true
    };

    expect(summarizeResults([complete], 1)).toMatchObject({
      persistedRecords: 1,
      providerCompletedRecords: 1,
      completeEvidencePersistenceRecords: 1,
      completeBillingEvidenceRecords: 1,
      completeLinkedRecordRecords: 1,
      acceptanceComplete: true
    });
    expect(
      summarizeResults(
        [
          {
            ...complete,
            billingEvidenceComplete: false,
            missingLinkedRecordTypes: ["Log", "Task"]
          }
        ],
        1
      )
    ).toMatchObject({
      completeBillingEvidenceRecords: 0,
      completeLinkedRecordRecords: 0,
      acceptanceComplete: false
    });
    expect(summarizeResults([complete], 252).acceptanceComplete).toBe(false);
  });

  it("finishes an all-record run as incomplete when acceptance proof is missing", () => {
    const outputPath = path.join(
      process.cwd(),
      "tmp",
      "diagnosis-ipm-runner-state-test.json"
    );
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    const evidence = {
      status: "in_progress",
      completedAt: null,
      records: [
        {
          recordId: "case-1",
          status: "persisted",
          gptAnswer: { status: "completed" },
          billingEvidenceComplete: false,
          missingLinkedRecordTypes: ["Log"]
        }
      ]
    };

    try {
      saveEvidence(outputPath, evidence, 1);
      const saved = JSON.parse(fs.readFileSync(outputPath, "utf8"));
      expect(saved).toMatchObject({
        status: "incomplete",
        summary: { acceptanceComplete: false }
      });
      expect(saved.completedAt).toEqual(expect.any(String));
    } finally {
      fs.rmSync(outputPath, { force: true });
    }
  });

  it("maps saved candidate language to the governed broad cause classes", () => {
    expect(normalizeCauseClass({ suspectedIssue: "disease_or_leaf_spot" })).toBe(
      "disease"
    );
    expect(normalizeCauseClass({ suspectedOrganism: "thrips possible" })).toBe("pest");
    expect(
      normalizeCauseClass({ suspectedIssue: "monitoring_and_differential_needed" })
    ).toBe("insufficient_evidence");
    expect(normalizeCauseClass({ suspectedIssue: "nutrient antagonism" })).toBe(
      "antagonism"
    );
  });
});
