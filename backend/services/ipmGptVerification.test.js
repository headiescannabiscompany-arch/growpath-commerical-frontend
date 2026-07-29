"use strict";

const {
  applyIpmGptVerification,
  buildIpmVerificationMessages
} = require("./ipmGptVerification");

describe("ipmGptVerification", () => {
  test("builds verification messages with the same scout input and GrowPath answer", () => {
    const messages = buildIpmVerificationMessages({
      inputSnapshot: { pestSeen: "mites", leafDamage: "stippling" },
      primaryAnswer: { suspectedOrganism: "mites possible" }
    });

    const payload = JSON.parse(messages[1].content);
    expect(payload.sameScoutInput).toEqual({
      pestSeen: "mites",
      leafDamage: "stippling"
    });
    expect(payload.growPathAiAnswer).toEqual({ suspectedOrganism: "mites possible" });
  });

  test("calls configured OpenAI-compatible provider and returns completed GPT verification", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                suspectedIssue: "pest_pressure",
                suspectedOrganism: "spider mites",
                confidence: "medium",
                severity: "medium",
                answer: "Mites are plausible; verify eggs or moving pests first.",
                supportingEvidence: ["stippling"],
                counterEvidence: ["no photo evidence"],
                nextInspectionSteps: ["inspect leaf undersides"],
                agreementStatus: "partially_agrees"
              })
            }
          }
        ]
      })
    });

    const outputs = await applyIpmGptVerification(
      {
        suspectedIssue: "pest_pressure",
        suspectedOrganism: "mites possible",
        confidence: "medium",
        severity: "medium",
        primaryAnswer: {
          source: "growpathai_ipm_scout",
          suspectedOrganism: "mites possible"
        },
        gptVerification: {
          provider: "gpt",
          status: "pending_gpt_review",
          prompt: "prompt",
          inputSnapshot: { pestSeen: "mites", leafDamage: "stippling" }
        },
        verificationDisplay: [
          { label: "GrowPathAI scout answer", status: "complete", answer: {} },
          { label: "GPT verification answer", status: "pending_gpt_review", answer: null }
        ]
      },
      {
        fetchImpl,
        config: {
          provider: "openai",
          apiKey: "test-key",
          baseUrl: "https://api.example.test/v1",
          model: "gpt-test"
        }
      }
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.test/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer test-key" })
      })
    );
    const requestBody = JSON.parse(fetchImpl.mock.calls[0][1].body);
    const userPayload = JSON.parse(requestBody.messages[1].content);
    expect(userPayload.sameScoutInput).toEqual({
      pestSeen: "mites",
      leafDamage: "stippling"
    });
    expect(outputs.gptVerification).toMatchObject({
      status: "completed",
      answer: "Mites are plausible; verify eggs or moving pests first.",
      agreementStatus: "partially_agrees"
    });
    expect(outputs.verificationDisplay[1]).toMatchObject({
      label: "GPT verification answer",
      status: "completed"
    });
  });

  test("reports that verification was not run when no provider is configured", async () => {
    const outputs = {
      gptVerification: {
        provider: "gpt",
        status: "pending_gpt_review",
        inputSnapshot: { pestSeen: "mites" }
      }
    };

    await expect(
      applyIpmGptVerification(outputs, { config: { provider: "disabled" } })
    ).resolves.toMatchObject({
      gptVerification: {
        status: "not_configured",
        agreementStatus: "not_run",
        mediaAnalysisPerformed: false
      }
    });
  });
});
