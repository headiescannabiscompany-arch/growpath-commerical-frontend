"use strict";

const {
  applyIpmGptVerification,
  buildIpmComparison,
  buildIpmVerificationMessages
} = require("./ipmGptVerification");

describe("ipmGptVerification", () => {
  test("computes field-level disagreements from one fingerprinted evidence envelope", () => {
    const comparison = buildIpmComparison({
      inputSnapshot: { leafDamage: "silvering", pestSeen: "not confirmed" },
      primaryAnswer: {
        suspectedIssue: "pest_pressure",
        suspectedOrganism: "thrips possible",
        confidence: "low",
        severity: "low",
        nextInspectionSteps: ["Inspect the leaf underside."]
      },
      secondaryAnswer: {
        suspectedIssue: "disease_or_leaf_spot",
        suspectedOrganism: "powdery mildew-like growth",
        confidence: "medium",
        severity: "low",
        nextInspectionSteps: ["Try a wipe test on the surface growth."]
      },
      reportedAgreementStatus: "agrees"
    });

    expect(comparison).toMatchObject({
      sameEvidenceEnvelope: true,
      reportedAgreementStatus: "agrees",
      computedAgreementStatus: "conflicts",
      agreementStatus: "conflicts",
      disagreements: expect.arrayContaining([
        expect.objectContaining({
          field: "suspectedIssue",
          growPathValue: "pest_pressure",
          gptValue: "disease_or_leaf_spot",
          significance: "candidate_conflict"
        }),
        expect.objectContaining({ field: "confidence" })
      ]),
      requestedFollowUps: [
        "Inspect the leaf underside.",
        "Try a wipe test on the surface growth."
      ]
    });
    expect(comparison.evidenceEnvelopeDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(
      buildIpmComparison({
        primaryAnswer: { suspectedOrganism: "thrips possible" },
        secondaryAnswer: { suspectedOrganism: "powdery mildew-like growth" },
        reportedAgreementStatus: "insufficient_data"
      }).agreementStatus
    ).toBe("conflicts");
  });

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
      agreementStatus: "conflicts",
      sameEvidenceEnvelope: true,
      billingEvidence: {
        aiCreditsUsed: null,
        creditStatus: "charge_unverified",
        providerAttempted: true,
        providerCompleted: true,
        ledgerReceiptPresent: false
      }
    });
    expect(outputs.evidenceEnvelopeDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(outputs.disagreements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "suspectedOrganism",
          growPathValue: "mites possible",
          gptValue: "spider mites"
        })
      ])
    );
    expect(outputs.verificationComparison).toMatchObject({
      sameEvidenceEnvelope: true,
      agreementStatus: "conflicts"
    });
    expect(outputs.verificationDisplay[1]).toMatchObject({
      label: "GPT verification answer",
      status: "completed",
      answer: expect.objectContaining({
        evidenceEnvelopeDigest: outputs.evidenceEnvelopeDigest
      })
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
        mediaAnalysisPerformed: false,
        billingEvidence: {
          aiCreditsUsed: 0,
          creditStatus: "not_charged",
          providerAttempted: false
        }
      },
      disagreements: [],
      verificationComparison: {
        sameEvidenceEnvelope: true,
        agreementStatus: "not_run"
      }
    });
  });

  test("records an unverified refund boundary when the provider attempt fails", async () => {
    const outputs = await applyIpmGptVerification(
      {
        primaryAnswer: {
          suspectedIssue: "pest_pressure",
          suspectedOrganism: "not confirmed",
          nextInspectionSteps: ["Add a macro photo."]
        },
        gptVerification: {
          inputSnapshot: { leafDamage: "stippling" }
        }
      },
      {
        fetchImpl: jest.fn().mockResolvedValue({ ok: false, status: 503 }),
        config: {
          provider: "openai",
          apiKey: "test-key",
          baseUrl: "https://api.example.test/v1",
          model: "gpt-test"
        }
      }
    );

    expect(outputs).toMatchObject({
      agreementStatus: "not_run",
      disagreements: [],
      requestedFollowUps: ["Add a macro photo."],
      billingEvidence: {
        aiCreditsUsed: null,
        creditStatus: "refund_unverified",
        providerAttempted: true,
        providerCompleted: false,
        ledgerReceiptPresent: false
      },
      gptVerification: {
        status: "failed",
        agreementStatus: "not_run"
      }
    });
  });
});
