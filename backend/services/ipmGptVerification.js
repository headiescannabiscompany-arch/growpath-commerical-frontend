"use strict";

const { getProviderConfig } = require("../llm/provider");

function parseJsonObject(text) {
  if (typeof text !== "string") return {};
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return {};
    try {
      return JSON.parse(match[0]);
    } catch {
      return {};
    }
  }
}

function firstText(...values) {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
}

function buildIpmVerificationMessages({ inputSnapshot, primaryAnswer }) {
  return [
    {
      role: "system",
      content:
        "You are GrowPathAI's structured IPM second-opinion assistant. Return only JSON. Review the same saved scout inputs and GrowPathAI answer, including any written summary from a separate image-capable step. You are not inspecting image pixels in this request. Separate observation, inference, counter-evidence, and missing evidence. Do not recommend pesticide products or rates. Use only safe treatment categories and require identity, crop/site legality, label, safety, re-entry, and harvest checks before consequential action."
    },
    {
      role: "user",
      content: JSON.stringify({
        sameScoutInput: inputSnapshot,
        growPathAiAnswer: primaryAnswer,
        responseSchema: {
          suspectedIssue: "string",
          suspectedOrganism: "string",
          confidence: "low | medium | high",
          severity: "low | medium | high",
          answer: "short second-opinion summary",
          supportingEvidence: ["strings"],
          counterEvidence: ["strings"],
          missingInformation: ["strings"],
          nextInspectionSteps: ["strings"],
          treatmentCategories: [
            "monitor | isolate | remove damaged material | improve airflow | reduce leaf wetness | sanitation | sticky traps | biological control | mechanical removal | consult label/extension | professional testing"
          ],
          agreementStatus: "agrees | partially_agrees | conflicts | insufficient_data"
        }
      })
    }
  ];
}

function normalizeGptVerification(raw, fallback = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const rawAgreement = firstText(source.agreementStatus, "insufficient_data")
    .toLowerCase()
    .replaceAll(" ", "_");
  const agreementStatus =
    rawAgreement === "agrees" || rawAgreement === "agreement"
      ? "agrees"
      : rawAgreement === "partially_agrees" || rawAgreement === "partial_agreement"
        ? "partially_agrees"
        : rawAgreement === "conflict" ||
            rawAgreement === "conflicts" ||
            rawAgreement === "disagrees"
          ? "conflicts"
          : "insufficient_data";
  return {
    provider: "gpt",
    providerLabel: "GPT structured IPM second opinion",
    status: "completed",
    suspectedIssue: firstText(source.suspectedIssue, fallback.suspectedIssue),
    suspectedOrganism: firstText(source.suspectedOrganism, fallback.suspectedOrganism),
    confidence: firstText(source.confidence, fallback.confidence, "low"),
    severity: firstText(source.severity, fallback.severity, "low"),
    answer: firstText(source.answer, source.summary, source.finding),
    supportingEvidence: Array.isArray(source.supportingEvidence)
      ? source.supportingEvidence
      : [],
    counterEvidence: Array.isArray(source.counterEvidence) ? source.counterEvidence : [],
    missingInformation: Array.isArray(source.missingInformation)
      ? source.missingInformation
      : [],
    nextInspectionSteps: Array.isArray(source.nextInspectionSteps)
      ? source.nextInspectionSteps
      : [],
    treatmentCategories: Array.isArray(source.treatmentCategories)
      ? source.treatmentCategories
      : [],
    agreementStatus,
    structuredInputOnly: true,
    mediaAnalysisPerformed: false,
    limitations: [
      "This second-opinion request reviewed structured scout evidence; it did not inspect photo or video pixels."
    ],
    requiredForTreatmentDecision: true,
    documentationTarget: "ToolRun.outputs.gptVerification"
  };
}

async function requestGptVerification({ inputSnapshot, primaryAnswer }, deps = {}) {
  const config = deps.config || getProviderConfig(deps.env);
  const fetchImpl = deps.fetchImpl || globalThis.fetch;

  if (config.provider !== "openai" || !config.apiKey || typeof fetchImpl !== "function") {
    return null;
  }

  const response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: buildIpmVerificationMessages({ inputSnapshot, primaryAnswer })
    })
  });

  if (!response.ok) {
    throw new Error(`GPT IPM verification request failed with status ${response.status}`);
  }

  const body = await response.json();
  return parseJsonObject(body?.choices?.[0]?.message?.content || "{}");
}

async function applyIpmGptVerification(outputs = {}, deps = {}) {
  const inputSnapshot = outputs.gptVerification?.inputSnapshot || {};
  const primaryAnswer = outputs.primaryAnswer || outputs.growPathAi || outputs;
  const existing = outputs.gptVerification || {};
  const config = deps.config || getProviderConfig(deps.env);

  if (
    config.provider !== "openai" ||
    !config.apiKey ||
    typeof (deps.fetchImpl || globalThis.fetch) !== "function"
  ) {
    const gptVerification = {
      ...existing,
      provider: "gpt",
      providerLabel: "GPT structured IPM second opinion",
      status: "not_configured",
      answer:
        "No GPT second opinion was run. Use the GrowPath result as a working hypothesis and complete the listed inspection checks.",
      agreementStatus: "not_run",
      structuredInputOnly: true,
      mediaAnalysisPerformed: false,
      limitations: ["A configured OpenAI provider is required for the second opinion."]
    };
    return {
      ...outputs,
      gptVerification,
      aiVerification: gptVerification,
      verificationDisplay: [
        outputs.verificationDisplay?.[0] || {
          label: "GrowPathAI scout answer",
          status: "complete",
          answer: primaryAnswer
        },
        {
          label: "GPT verification answer",
          status: "not_configured",
          answer: gptVerification
        }
      ]
    };
  }

  try {
    const raw = await requestGptVerification(
      { inputSnapshot, primaryAnswer },
      { ...deps, config }
    );
    const gptVerification = {
      ...existing,
      ...normalizeGptVerification(raw, {
        suspectedIssue: outputs.suspectedIssue,
        suspectedOrganism: outputs.suspectedOrganism,
        confidence: outputs.confidence,
        severity: outputs.severity
      }),
      model: config.model,
      prompt: existing.prompt,
      inputSnapshot
    };
    return {
      ...outputs,
      gptVerification,
      aiVerification: gptVerification,
      verificationDisplay: [
        outputs.verificationDisplay?.[0] || {
          label: "GrowPathAI scout answer",
          status: "complete",
          answer: primaryAnswer
        },
        {
          label: "GPT verification answer",
          status: "completed",
          answer: gptVerification
        }
      ]
    };
  } catch (error) {
    return {
      ...outputs,
      gptVerification: {
        ...existing,
        providerLabel: "GPT structured IPM second opinion",
        status: "failed",
        answer:
          "The GPT second opinion failed. Continue with the GrowPath working hypothesis and missing-evidence checks.",
        agreementStatus: "not_run",
        structuredInputOnly: true,
        mediaAnalysisPerformed: false,
        error: error?.message || "GPT IPM verification request failed"
      }
    };
  }
}

module.exports = {
  applyIpmGptVerification,
  buildIpmVerificationMessages,
  normalizeGptVerification,
  requestGptVerification
};
