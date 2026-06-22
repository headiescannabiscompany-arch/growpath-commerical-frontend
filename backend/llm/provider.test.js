"use strict";

const {
  applyExternalConfidence,
  callOpenAiValidator,
  clampConfidenceDelta,
  externalValidate,
  getProviderConfig,
  normalizeExternalValidation,
  shouldUseExternalValidator
} = require("./provider");

describe("LLM provider", () => {
  test("getProviderConfig defaults to disabled", () => {
    expect(getProviderConfig({})).toEqual({ provider: "disabled" });
  });

  test("getProviderConfig reads OpenAI environment", () => {
    expect(
      getProviderConfig({
        LLM_PROVIDER: "openai",
        OPENAI_API_KEY: "test-key",
        OPENAI_BASE_URL: "https://example.test/v1/",
        OPENAI_MODEL: "model-a"
      })
    ).toEqual({
      provider: "openai",
      apiKey: "test-key",
      baseUrl: "https://example.test/v1",
      model: "model-a"
    });
  });

  test("shouldUseExternalValidator only accepts gray-zone confidence", () => {
    expect(shouldUseExternalValidator(0.59)).toBe(false);
    expect(shouldUseExternalValidator(0.6)).toBe(true);
    expect(shouldUseExternalValidator(0.8)).toBe(true);
    expect(shouldUseExternalValidator(0.85)).toBe(true);
    expect(shouldUseExternalValidator(0.86)).toBe(false);
    expect(shouldUseExternalValidator("not-a-number")).toBe(false);
  });

  test("normalizeExternalValidation clamps confidence delta and removes invalid strings", () => {
    expect(
      normalizeExternalValidation({
        outcome: "PASS",
        critique: [" useful ", "", 12],
        suggestions: ["one", null],
        confidenceDelta: 0.45
      })
    ).toEqual({
      outcome: "PASS",
      critique: ["useful"],
      suggestions: ["one"],
      confidenceDelta: 0.1
    });
  });

  test("externalValidate is insufficient when no provider is configured", async () => {
    await expect(
      externalValidate({ fn: "harvest.estimateHarvestWindow", packet: {} }, { env: {} })
    ).resolves.toEqual({
      outcome: "INSUFFICIENT",
      critique: [],
      suggestions: ["No production LLM provider configured"],
      confidenceDelta: 0
    });
  });

  test("callOpenAiValidator posts JSON validator request and normalizes response", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                outcome: "WARN",
                critique: ["Distribution input is estimated"],
                suggestions: ["Ask for a second sample"],
                confidenceDelta: -0.2
              })
            }
          }
        ]
      })
    });

    await expect(
      callOpenAiValidator(
        {
          fn: "harvest.estimateHarvestWindow",
          packet: { computedMetrics: { recommendation: "WAIT_2_DAYS" } }
        },
        {
          fetchImpl,
          config: {
            provider: "openai",
            apiKey: "test-key",
            baseUrl: "https://api.example.test/v1",
            model: "validator-model"
          }
        }
      )
    ).resolves.toEqual({
      outcome: "WARN",
      critique: ["Distribution input is estimated"],
      suggestions: ["Ask for a second sample"],
      confidenceDelta: -0.1
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.test/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
          "Content-Type": "application/json"
        })
      })
    );

    const requestBody = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(requestBody).toEqual(
      expect.objectContaining({
        model: "validator-model",
        temperature: 0,
        response_format: { type: "json_object" }
      })
    );
    expect(requestBody.messages).toHaveLength(2);
  });

  test("externalValidate returns insufficient when OpenAI request fails", async () => {
    await expect(
      externalValidate(
        { fn: "harvest.estimateHarvestWindow", packet: {} },
        {
          fetchImpl: jest.fn().mockResolvedValue({ ok: false, status: 503 }),
          config: {
            provider: "openai",
            apiKey: "test-key",
            baseUrl: "https://api.example.test/v1",
            model: "validator-model"
          }
        }
      )
    ).resolves.toEqual({
      outcome: "INSUFFICIENT",
      critique: [],
      suggestions: ["OpenAI validator request failed with status 503"],
      confidenceDelta: 0
    });
  });

  test("confidence helpers clamp deltas and final confidence", () => {
    expect(clampConfidenceDelta(2)).toBe(0.1);
    expect(clampConfidenceDelta(-2)).toBe(-0.1);
    expect(applyExternalConfidence(0.98, { confidenceDelta: 0.1 })).toBe(1);
    expect(applyExternalConfidence(0.02, { confidenceDelta: -0.1 })).toBe(0);
  });
});
