"use strict";

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const GRAY_ZONE_MIN = 0.6;
const GRAY_ZONE_MAX = 0.85;
const MAX_CONFIDENCE_DELTA = 0.1;
const VALID_OUTCOMES = new Set(["PASS", "WARN", "FAIL", "INSUFFICIENT"]);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clampConfidenceDelta(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return clamp(numeric, -MAX_CONFIDENCE_DELTA, MAX_CONFIDENCE_DELTA);
}

function clampConfidence(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return clamp(numeric, 0, 1);
}

function asStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim());
}

function normalizeExternalValidation(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const outcome = VALID_OUTCOMES.has(source.outcome) ? source.outcome : "INSUFFICIENT";

  return {
    outcome,
    critique: asStringArray(source.critique),
    suggestions: asStringArray(source.suggestions),
    confidenceDelta: clampConfidenceDelta(source.confidenceDelta)
  };
}

function parseJsonObject(text) {
  if (typeof text !== "string") return {};

  try {
    return JSON.parse(text);
  } catch (err) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return {};

    try {
      return JSON.parse(match[0]);
    } catch (nestedErr) {
      return {};
    }
  }
}

function getProviderConfig(env = process.env) {
  const provider = (env.LLM_PROVIDER || env.AI_PROVIDER || "disabled").toLowerCase();

  if (provider === "openai") {
    return {
      provider,
      apiKey: env.OPENAI_API_KEY || "",
      baseUrl: (env.OPENAI_BASE_URL || DEFAULT_OPENAI_BASE_URL).replace(/\/+$/, ""),
      model: env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL
    };
  }

  return { provider: "disabled" };
}

function shouldUseExternalValidator(confidence) {
  const numeric = Number(confidence);
  return Number.isFinite(numeric) && numeric >= GRAY_ZONE_MIN && numeric <= GRAY_ZONE_MAX;
}

function buildValidatorMessages({ fn, packet }) {
  return [
    {
      role: "system",
      content:
        "You are a cautious cultivation decision validator. Return only JSON with outcome, critique, suggestions, and confidenceDelta. The confidenceDelta must be between -0.10 and 0.10. Do not override the deterministic decision."
    },
    {
      role: "user",
      content: JSON.stringify({
        fn,
        packet,
        responseSchema: {
          outcome: "PASS | WARN | FAIL | INSUFFICIENT",
          critique: ["short issue strings"],
          suggestions: ["short action strings"],
          confidenceDelta: "number between -0.10 and 0.10"
        }
      })
    }
  ];
}

async function callOpenAiValidator({ fn, packet }, deps = {}) {
  const config = deps.config || getProviderConfig(deps.env);
  const fetchImpl = deps.fetchImpl || globalThis.fetch;

  if (!config.apiKey) {
    return normalizeExternalValidation({
      outcome: "INSUFFICIENT",
      suggestions: ["OPENAI_API_KEY is not configured"],
      confidenceDelta: 0
    });
  }

  if (typeof fetchImpl !== "function") {
    return normalizeExternalValidation({
      outcome: "INSUFFICIENT",
      suggestions: ["Fetch API is not available in this runtime"],
      confidenceDelta: 0
    });
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
      messages: buildValidatorMessages({ fn, packet })
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI validator request failed with status ${response.status}`);
  }

  const body = await response.json();
  const content = body?.choices?.[0]?.message?.content || "{}";
  return normalizeExternalValidation(parseJsonObject(content));
}

async function externalValidate({ fn, packet }, deps = {}) {
  const config = deps.config || getProviderConfig(deps.env);

  if (config.provider !== "openai") {
    return normalizeExternalValidation({
      outcome: "INSUFFICIENT",
      suggestions: ["No production LLM provider configured"],
      confidenceDelta: 0
    });
  }

  try {
    return await callOpenAiValidator({ fn, packet }, { ...deps, config });
  } catch (err) {
    return normalizeExternalValidation({
      outcome: "INSUFFICIENT",
      suggestions: [err?.message || "External validator request failed"],
      confidenceDelta: 0
    });
  }
}

function applyExternalConfidence(confidence, external) {
  return clampConfidence(Number(confidence) + clampConfidenceDelta(external?.confidenceDelta));
}

module.exports = {
  applyExternalConfidence,
  callOpenAiValidator,
  clampConfidenceDelta,
  externalValidate,
  getProviderConfig,
  normalizeExternalValidation,
  shouldUseExternalValidator
};
