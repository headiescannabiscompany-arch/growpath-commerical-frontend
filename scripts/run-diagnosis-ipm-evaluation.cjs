#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const CATALOG_PATH = path.join(
  ROOT,
  "tests",
  "fixtures",
  "diagnosis-ipm-qa-catalog.json"
);
const OUTPUT_DIR = path.join(ROOT, "tmp", "spec", "diagnosis-ipm-evaluation");
const EXECUTE_CONFIRMATION = "RUN_GROWPATH_DIAGNOSIS_IPM_STAGING";
const PRODUCTION_HOSTS = new Set([
  "api.growpathai.com",
  "growpathai.com",
  "www.growpathai.com"
]);

function clean(value) {
  return String(value ?? "").trim();
}

function unique(values) {
  return Array.from(new Set(values.map(clean).filter(Boolean)));
}

function sha256(value) {
  return `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;
}

function evidenceEnvelopeDigest(value) {
  return sha256(JSON.stringify(value || {}));
}

function normalizeCauseClass(answer = {}) {
  const value = clean(
    answer.causeClass ||
      answer.suspectedIssue ||
      answer.category ||
      answer.suspectedOrganism
  ).toLowerCase();
  if (/insufficient|unresolved|monitoring|not[_ ]confirmed|unknown/.test(value)) {
    return "insufficient_evidence";
  }
  if (/disease|mildew|mold|rot|spot|rust|virus|bacter|fusarium|pythium/.test(value)) {
    return "disease";
  }
  if (
    /pest|mite|thrip|aphid|whitefl|gnat|mealy|scale|leafminer|caterpillar/.test(value)
  ) {
    return "pest";
  }
  if (/senesc/.test(value)) return "normal_senescence";
  if (/lockout|ph[_ ]problem/.test(value)) return "lockout";
  if (/antagon/.test(value)) return "antagonism";
  if (/deficien/.test(value)) return "deficiency";
  if (/excess|toxicit|ec[_ ]problem/.test(value)) return "excess";
  if (/organic|release[_ ]timing/.test(value)) return "organic_release_timing";
  if (/abiotic|water|heat|cold|light|wind|edema|spray|physical/.test(value)) {
    return "other_abiotic";
  }
  return "unmapped";
}

function loadCatalog(filePath = CATALOG_PATH) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assertSeedReadyCatalog(catalog) {
  if (catalog?.status !== "seed_ready") {
    throw new Error("Diagnosis/IPM catalog must be seed_ready before evaluation.");
  }
  if (!Array.isArray(catalog.mediaRecords) || catalog.mediaRecords.length !== 252) {
    throw new Error("Diagnosis/IPM evaluation requires exactly 252 governed records.");
  }
  for (const record of catalog.mediaRecords) {
    if (!clean(record.recordId) || !clean(record.caseId)) {
      throw new Error("Every Diagnosis/IPM record requires recordId and caseId.");
    }
    if (!Array.isArray(record.imageSet) || record.imageSet.length < 1) {
      throw new Error(`${record.recordId} has no governed image references.`);
    }
    for (const image of record.imageSet) {
      if (
        image.intendedUseApproved !== true ||
        !clean(image.rightsReviewedAt) ||
        !clean(image.licenseId) ||
        !clean(image.mediaUrl)
      ) {
        throw new Error(`${record.recordId}/${image.imageId} is not rights-ready.`);
      }
    }
  }
  return catalog;
}

function buildCaseInput(record, namespace) {
  const diagnosticSigns = unique(record.diagnosticSigns || []);
  const sourceIds = unique((record.imageSet || []).map((image) => image.sourceId));
  const cropContext = unique([record.plant, record.cultivar]).join("; ");
  const environmentConditions = unique([
    record.environment,
    record.mediumRootZone ? `Root-zone context: ${record.mediumRootZone}` : "",
    record.measuredValues ? `Measured values: ${record.measuredValues}` : ""
  ]).join(" ");

  return {
    cropContext,
    stage: clean(record.lifeStage),
    scoutLocation: clean(record.affectedLocation),
    leafDamage: diagnosticSigns.join("; "),
    pestSeen: "not confirmed",
    undersideInspection: "not recorded in the governed source envelope",
    magnification: "not recorded in the governed source envelope",
    distribution: clean(record.distribution),
    progression: clean(record.progression),
    environmentConditions,
    evidence: diagnosticSigns,
    additionalInformation: unique([
      `Governed QA record: ${record.recordId}.`,
      `Plausible alternatives: ${unique(record.plausibleAlternatives || []).join("; ")}.`,
      `Confirmation method: ${clean(record.confirmationMethod)}.`,
      `Expected urgency: ${clean(record.expectedUrgency)}.`
    ]).join(" "),
    mediaEvidence: (record.imageSet || []).map((image) => ({
      id: clean(image.imageId),
      type: "image",
      sourceId: clean(image.sourceId),
      externalReferenceUrl: clean(image.mediaUrl),
      licenseId: clean(image.licenseId),
      rightsReviewedAt: clean(image.rightsReviewedAt),
      intendedUseApproved: image.intendedUseApproved === true
    })),
    imageAnalysis: {
      requested: true,
      performed: false,
      photoCount: (record.imageSet || []).length,
      photosAnalyzed: 0,
      evidenceUsed: [],
      limitations: [
        "This evaluation request carries governed external image references, not a verified pixel-analysis receipt. It must not claim that image pixels were inspected."
      ]
    },
    assistantMethodIds: ["plant-diagnosis-etgu"],
    assistantSourceIds: sourceIds,
    qaEvaluation: {
      namespace,
      catalogSchemaVersion: "growpath-diagnosis-ipm-qa-v1",
      recordId: clean(record.recordId),
      caseId: clean(record.caseId),
      useForModelTraining: false
    }
  };
}

function parseExecutionConfig(env = process.env) {
  const environment = clean(env.GROWPATH_DIAGNOSIS_IPM_EVALUATION_ENV).toLowerCase();
  if (!new Set(["test", "staging"]).has(environment)) {
    throw new Error("GROWPATH_DIAGNOSIS_IPM_EVALUATION_ENV must be test or staging.");
  }
  if (clean(env.GROWPATH_DIAGNOSIS_IPM_EVALUATION_CONFIRM) !== EXECUTE_CONFIRMATION) {
    throw new Error(
      `Refusing execution. Set GROWPATH_DIAGNOSIS_IPM_EVALUATION_CONFIRM=${EXECUTE_CONFIRMATION}.`
    );
  }

  const namespace = clean(env.GROWPATH_DIAGNOSIS_IPM_EVALUATION_NAMESPACE);
  if (!/^growpath-qa-diagnosis-ipm-[a-z0-9-]+$/.test(namespace)) {
    throw new Error(
      "GROWPATH_DIAGNOSIS_IPM_EVALUATION_NAMESPACE must start with growpath-qa-diagnosis-ipm-."
    );
  }

  const rawBaseUrl = clean(env.GROWPATH_DIAGNOSIS_IPM_EVALUATION_URL);
  let baseUrl;
  try {
    baseUrl = new URL(rawBaseUrl);
  } catch {
    throw new Error("GROWPATH_DIAGNOSIS_IPM_EVALUATION_URL must be a valid URL.");
  }
  const hostname = baseUrl.hostname.toLowerCase();
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  if (
    PRODUCTION_HOSTS.has(hostname) ||
    (!isLocal && !/(staging|test|qa)/i.test(hostname))
  ) {
    throw new Error(`Refusing non-QA evaluation host: ${hostname}.`);
  }
  if (baseUrl.protocol !== "https:" && !isLocal) {
    throw new Error("Remote evaluation URLs must use HTTPS.");
  }
  if (
    baseUrl.username ||
    baseUrl.password ||
    baseUrl.search ||
    baseUrl.hash ||
    !new Set(["", "/"]).has(baseUrl.pathname)
  ) {
    throw new Error(
      "Evaluation URL must be a credential-free API origin without a path."
    );
  }

  const token = clean(env.GROWPATH_DIAGNOSIS_IPM_EVALUATION_TOKEN);
  if (!token) {
    throw new Error("GROWPATH_DIAGNOSIS_IPM_EVALUATION_TOKEN is required.");
  }
  const gitSha = clean(env.GROWPATH_DIAGNOSIS_IPM_EVALUATION_GIT_SHA).toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(gitSha)) {
    throw new Error(
      "GROWPATH_DIAGNOSIS_IPM_EVALUATION_GIT_SHA must be an exact 40-character SHA."
    );
  }

  return {
    environment,
    namespace,
    baseUrl: baseUrl.toString().replace(/\/$/, ""),
    token,
    gitSha
  };
}

function validateEvaluationResponse(record, body) {
  const outputs = body?.outputs;
  const toolRunId = clean(body?.toolRun?.id || body?.toolRun?._id);
  if (!toolRunId || !outputs || typeof outputs !== "object") {
    throw new Error(`${record.recordId} did not persist a ToolRun response.`);
  }
  if (!outputs.primaryAnswer || !outputs.gptVerification) {
    throw new Error(`${record.recordId} is missing one of the two persisted answers.`);
  }
  const snapshot = outputs.gptVerification.inputSnapshot || {};
  const expectedDigest = evidenceEnvelopeDigest(snapshot);
  if (
    outputs.evidenceEnvelopeDigest !== expectedDigest ||
    outputs.gptVerification.evidenceEnvelopeDigest !== expectedDigest ||
    outputs.verificationComparison?.evidenceEnvelopeDigest !== expectedDigest ||
    outputs.verificationComparison?.sameEvidenceEnvelope !== true
  ) {
    throw new Error(`${record.recordId} failed the identical-envelope digest check.`);
  }

  const billing =
    outputs.billingEvidence || outputs.gptVerification.billingEvidence || null;
  const evidencePersistenceComplete = [
    outputs.primaryAnswer,
    outputs.gptVerification
  ].every(
    (answer) =>
      Array.isArray(answer.supportingEvidence) &&
      Array.isArray(answer.counterEvidence) &&
      Array.isArray(answer.missingInformation)
  );
  const expectedCauseRanking = unique(record.expectedCauseRanking || []);
  const primaryCauseClass = normalizeCauseClass(outputs.primaryAnswer);
  const gptCauseClass = normalizeCauseClass(outputs.gptVerification);
  const linkedRecordIds = {
    plantId: clean(body.toolRun?.plantId) || null,
    growId: clean(body.toolRun?.growId) || null,
    logId: clean(body.toolRun?.linkedLogId) || null,
    toolRunId,
    taskIds: Array.isArray(body.toolRun?.linkedTaskIds)
      ? body.toolRun.linkedTaskIds.map(clean).filter(Boolean)
      : [],
    facilityId: clean(body.toolRun?.facilityId) || null
  };
  const missingLinkedRecordTypes = [
    ["Plant", linkedRecordIds.plantId],
    ["Grow", linkedRecordIds.growId],
    ["Log", linkedRecordIds.logId],
    ["ToolRun", linkedRecordIds.toolRunId],
    ["Task", linkedRecordIds.taskIds.length],
    ["Facility", linkedRecordIds.facilityId]
  ]
    .filter(([, value]) => !value)
    .map(([type]) => type);

  return {
    recordId: record.recordId,
    caseId: record.caseId,
    status: "persisted",
    toolRunId,
    evidenceEnvelopeDigest: expectedDigest,
    growPathAnswer: outputs.primaryAnswer,
    gptAnswer: outputs.gptVerification,
    agreementStatus: clean(outputs.agreementStatus) || "not_run",
    disagreements: Array.isArray(outputs.disagreements) ? outputs.disagreements : [],
    requestedFollowUps: Array.isArray(outputs.requestedFollowUps)
      ? outputs.requestedFollowUps
      : [],
    evidencePersistenceComplete,
    expectedCauseRanking,
    primaryCauseClass,
    gptCauseClass,
    primaryWithinExpected: expectedCauseRanking.includes(primaryCauseClass),
    gptWithinExpected: expectedCauseRanking.includes(gptCauseClass),
    billingEvidence: billing,
    billingEvidenceComplete: Boolean(
      billing?.ledgerReceiptPresent === true &&
      Number.isFinite(Number(billing.aiCreditsUsed)) &&
      clean(billing.receiptId || billing.ledgerEntryId || billing.transactionId)
    ),
    linkedRecordIds,
    missingLinkedRecordTypes
  };
}

function summarizeResults(records, totalRecords) {
  const persisted = records.filter((record) => record.status === "persisted");
  const failed = records.filter((record) => record.status === "failed");
  const providerCompleted = persisted.filter(
    (record) => record.gptAnswer?.status === "completed"
  ).length;
  const evidenceComplete = persisted.filter(
    (record) => record.evidencePersistenceComplete
  ).length;
  const billingComplete = persisted.filter(
    (record) => record.billingEvidenceComplete
  ).length;
  const linkedRecordComplete = persisted.filter(
    (record) => record.missingLinkedRecordTypes.length === 0
  ).length;
  const primaryWithinExpected = persisted.filter(
    (record) => record.primaryWithinExpected
  ).length;
  const gptWithinExpected = persisted.filter((record) => record.gptWithinExpected).length;
  return {
    totalRecords,
    attemptedRecords: records.length,
    persistedRecords: persisted.length,
    failedRecords: failed.length,
    providerCompletedRecords: providerCompleted,
    completeEvidencePersistenceRecords: evidenceComplete,
    completeBillingEvidenceRecords: billingComplete,
    completeLinkedRecordRecords: linkedRecordComplete,
    primaryWithinExpectedRecords: primaryWithinExpected,
    gptWithinExpectedRecords: gptWithinExpected,
    acceptanceComplete:
      records.length === totalRecords &&
      persisted.length === totalRecords &&
      providerCompleted === totalRecords &&
      evidenceComplete === totalRecords &&
      billingComplete === totalRecords &&
      linkedRecordComplete === totalRecords
  };
}

function evidenceFilePath(namespace) {
  return path.join(OUTPUT_DIR, `${namespace}.json`);
}

function createEvidence(config, catalog) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outputPath = evidenceFilePath(config.namespace);
  const evidence = {
    schemaVersion: "growpath-diagnosis-ipm-evaluation-v1",
    status: "in_progress",
    environment: config.environment,
    namespace: config.namespace,
    apiUrl: config.baseUrl,
    gitSha: config.gitSha,
    catalogSchemaVersion: catalog.schemaVersion,
    catalogDigest: sha256(JSON.stringify(catalog)),
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
    records: [],
    summary: summarizeResults([], catalog.mediaRecords.length)
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, { flag: "wx" });
  return { outputPath, evidence };
}

function loadEvidenceForResume(config, catalog) {
  const outputPath = evidenceFilePath(config.namespace);
  const evidence = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  if (
    evidence.schemaVersion !== "growpath-diagnosis-ipm-evaluation-v1" ||
    evidence.namespace !== config.namespace ||
    evidence.environment !== config.environment ||
    evidence.apiUrl !== config.baseUrl ||
    evidence.gitSha !== config.gitSha ||
    evidence.catalogDigest !== sha256(JSON.stringify(catalog))
  ) {
    throw new Error(
      "Resume evidence does not match this environment, namespace, SHA, or catalog."
    );
  }
  if (!Array.isArray(evidence.records)) {
    throw new Error("Resume evidence has an invalid records collection.");
  }
  return { outputPath, evidence };
}

function saveEvidence(outputPath, evidence, totalRecords) {
  evidence.updatedAt = new Date().toISOString();
  evidence.summary = summarizeResults(evidence.records, totalRecords);
  evidence.status = evidence.summary.acceptanceComplete
    ? "passed"
    : evidence.summary.failedRecords
      ? "failed"
      : evidence.summary.attemptedRecords === totalRecords
        ? "incomplete"
        : "in_progress";
  evidence.completedAt = evidence.status === "in_progress" ? null : evidence.updatedAt;
  const temporaryPath = `${outputPath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(evidence, null, 2)}\n`);
  fs.renameSync(temporaryPath, outputPath);
}

async function postEvaluation(record, input, config, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function")
    throw new Error("A fetch implementation is required.");
  const response = await fetchImpl(`${config.baseUrl}/api/tools/ipm-scout`, {
    method: "POST",
    redirect: "error",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      "X-GrowPath-QA-Namespace": config.namespace,
      "X-GrowPath-QA-Record": record.recordId,
      "X-GrowPath-Evaluation-SHA": config.gitSha
    },
    body: JSON.stringify(input)
  });
  let body = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }
  if (response.status !== 201) {
    throw new Error(
      `${record.recordId} returned HTTP ${response.status}: ${clean(body?.message) || "no JSON error"}`
    );
  }
  return validateEvaluationResponse(record, body);
}

async function executeCatalog({ catalog, config, resume = false, fetchImpl }) {
  const state = resume
    ? loadEvidenceForResume(config, catalog)
    : createEvidence(config, catalog);
  const completedIds = new Set(
    state.evidence.records
      .filter((record) => record.status === "persisted")
      .map((record) => record.recordId)
  );

  for (const record of catalog.mediaRecords) {
    if (completedIds.has(record.recordId)) continue;
    try {
      const result = await postEvaluation(
        record,
        buildCaseInput(record, config.namespace),
        config,
        fetchImpl
      );
      state.evidence.records = state.evidence.records.filter(
        (existing) => existing.recordId !== record.recordId
      );
      state.evidence.records.push(result);
    } catch (error) {
      state.evidence.records = state.evidence.records.filter(
        (existing) => existing.recordId !== record.recordId
      );
      state.evidence.records.push({
        recordId: record.recordId,
        caseId: record.caseId,
        status: "failed",
        error: clean(error?.message || error)
      });
      saveEvidence(state.outputPath, state.evidence, catalog.mediaRecords.length);
      throw error;
    }
    saveEvidence(state.outputPath, state.evidence, catalog.mediaRecords.length);
  }

  saveEvidence(state.outputPath, state.evidence, catalog.mediaRecords.length);
  return state;
}

function printPlan(catalog) {
  const caseCounts = Object.fromEntries(
    Object.entries(
      catalog.mediaRecords.reduce((counts, record) => {
        counts[record.caseId] = (counts[record.caseId] || 0) + 1;
        return counts;
      }, {})
    ).sort(([left], [right]) => left.localeCompare(right))
  );
  console.log(
    JSON.stringify(
      {
        mode: "dry_run",
        networkRequests: 0,
        databaseWrites: 0,
        catalogStatus: catalog.status,
        recordCount: catalog.mediaRecords.length,
        imageReferenceCount: catalog.mediaRecords.reduce(
          (count, record) => count + record.imageSet.length,
          0
        ),
        caseCounts,
        executionConfirmation: EXECUTE_CONFIRMATION,
        warning:
          "Execution spends provider credits and writes staging ToolRuns. It remains incomplete unless every response contains provider, ledger, and linked-record evidence."
      },
      null,
      2
    )
  );
}

async function main() {
  const catalog = assertSeedReadyCatalog(loadCatalog());
  const execute = process.argv.includes("--execute");
  const resume = process.argv.includes("--resume");
  if (!execute) {
    printPlan(catalog);
    return;
  }
  const config = parseExecutionConfig(process.env);
  const state = await executeCatalog({ catalog, config, resume });
  console.log(
    `Diagnosis/IPM evaluation evidence: ${path.relative(ROOT, state.outputPath)}`
  );
  console.log(JSON.stringify(state.evidence.summary, null, 2));
  if (!state.evidence.summary.acceptanceComplete) process.exitCode = 2;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[diagnosis-ipm-evaluation] ${clean(error?.message || error)}`);
    process.exit(1);
  });
}

module.exports = {
  EXECUTE_CONFIRMATION,
  assertSeedReadyCatalog,
  buildCaseInput,
  createEvidence,
  evidenceEnvelopeDigest,
  executeCatalog,
  loadEvidenceForResume,
  normalizeCauseClass,
  parseExecutionConfig,
  postEvaluation,
  saveEvidence,
  sha256,
  summarizeResults,
  validateEvaluationResponse
};
