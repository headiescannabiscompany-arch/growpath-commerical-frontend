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
        "You are GrowPathAI's IPM verification assistant. Return only JSON. Review the same IPM scout inputs and the GrowPathAI scout answer. Do not recommend treatment until organism identity is verified with photos, magnification, trap counts, and inspection notes."
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
          nextInspectionSteps: ["strings"],
          agreementStatus: "agrees | partially_agrees | disagrees | insufficient_evidence"
        }
      })
    }
  ];
}

function normalizeGptVerification(raw, fallback = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    provider: "gpt",
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
    nextInspectionSteps: Array.isArray(source.nextInspectionSteps)
      ? source.nextInspectionSteps
      : [],
    agreementStatus: firstText(source.agreementStatus, "insufficient_evidence"),
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

  try {
    const raw = await requestGptVerification({ inputSnapshot, primaryAnswer }, deps);
    if (!raw) return outputs;
    const gptVerification = {
      ...existing,
      ...normalizeGptVerification(raw, {
        suspectedIssue: outputs.suspectedIssue,
        suspectedOrganism: outputs.suspectedOrganism,
        confidence: outputs.confidence,
        severity: outputs.severity
      }),
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
        status: existing.status || "pending_gpt_review",
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
