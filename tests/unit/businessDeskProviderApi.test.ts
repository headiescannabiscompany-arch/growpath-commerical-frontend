import { apiRequest } from "@/api/apiRequest";
import {
  applyExpenseReceiptExtraction,
  getBusinessAskAttestation,
  getBusinessDeskProviderOperation,
  getBusinessDeskProviderCapabilities,
  listBusinessDeskProviderOperations,
  startBusinessAsk,
  startExpenseReceiptExtraction
} from "@/api/businessDeskProvider";
import { COMMERCIAL_BUSINESS_DESK_WORKSPACE } from "@/api/businessDesk";

jest.mock("@/api/apiRequest", () => ({ apiRequest: jest.fn() }));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;
const digest = "a".repeat(64);

function operation(kind: "business_ask" | "expense_receipt_extraction", result: any) {
  return {
    id: "provider-operation-1",
    kind,
    state: result ? "succeeded" : "processing",
    version: 2,
    clientOperationKey: "stable-operation-key",
    requestDigest: digest,
    cancellable: false,
    timestamps: {
      createdAt: "2026-08-22T12:00:00.000Z",
      updatedAt: "2026-08-22T12:00:01.000Z",
      queuedAt: "2026-08-22T12:00:00.000Z",
      processingAt: "2026-08-22T12:00:01.000Z",
      completedAt: result ? "2026-08-22T12:00:02.000Z" : null,
      cancelledAt: null
    },
    error: null,
    credit: { credits: 1, status: result ? "charged" : "reserved" },
    result
  };
}

function askResult(overrides: Record<string, unknown> = {}): any {
  return {
    type: "business_ask",
    schemaVersion: "business-desk-business-ask-v1",
    resultDigestSha256: digest,
    answer: "The open quote needs a reviewed next step.",
    incomplete: false,
    answerCitationIds: ["citation-1"],
    facts: [{ statement: "One quote is open.", citationIds: ["citation-1"] }],
    calculations: [],
    assumptions: [],
    scenarios: [],
    recommendations: [
      {
        statement: "Review the quote with its owner.",
        citationIds: ["citation-1"],
        requiresReview: true
      }
    ],
    limitations: ["Only the selected date range was considered."],
    missingInformation: [],
    citations: [
      {
        id: "citation-1",
        sourceType: "business_desk_record",
        recordId: "507f191e810c19729de86010",
        parentRecordId: null,
        recordKind: "quote",
        title: "Spring quote",
        version: 3,
        sourceDate: "2026-08-21T12:00:00.000Z",
        dateRange: { from: "2026-07-01", to: "2026-08-22" }
      }
    ],
    dateRange: { from: "2026-07-01", to: "2026-08-22" },
    selectedRecordCount: 1,
    truncated: false,
    assistantDraftRecordId: "507f191e810c19729de86011",
    assistantDraftVersion: 1,
    ...overrides
  };
}

function extractionResult(overrides: Record<string, unknown> = {}): any {
  const field = <T>(value: T) => ({ value, confidenceBasisPoints: 9000 });
  return {
    type: "expense_receipt_extraction",
    schemaVersion: "business-desk-expense-receipt-v1",
    resultDigestSha256: digest,
    fields: {
      merchant: field("Garden Supply"),
      occurredAt: field("2026-08-22"),
      amountMinor: field(1525),
      taxMinor: field(125),
      currency: field("USD"),
      minorUnitDigits: field(2),
      category: field("supplies"),
      paymentMethod: field("card"),
      notes: field("")
    },
    itemLines: [],
    missingFields: [],
    validationErrors: [],
    duplicate: { status: "unique" },
    provenance: {
      sourceAttachmentId: "507f191e810c19729de86012",
      sourceContentSha256: digest,
      provider: "openai",
      model: "configured-model",
      schemaVersion: "business-desk-expense-receipt-v1",
      promptVersion: "receipt-v1",
      extractedAt: "2026-08-22T12:00:02.000Z",
      fieldConfidenceBasisPoints: { merchant: 9000 }
    },
    reviewerChanges: [],
    ...overrides
  };
}

describe("Business Desk provider API", () => {
  beforeEach(() => mockApiRequest.mockReset());

  it("fails closed when provider capability fields are absent", async () => {
    mockApiRequest.mockResolvedValue({ data: {} });
    await expect(
      getBusinessDeskProviderCapabilities(COMMERCIAL_BUSINESS_DESK_WORKSPACE)
    ).resolves.toEqual(
      expect.objectContaining({
        expenseReceiptExtraction: expect.objectContaining({ enabled: false }),
        businessAsk: expect.objectContaining({ enabled: false })
      })
    );
  });

  it("maps the exact nested provider capability contract and inherited credit cost", async () => {
    mockApiRequest.mockResolvedValue({
      data: {
        providerOperations: {
          creditCost: 1,
          maxAskRecords: 40,
          maxAskDateRangeDays: 180,
          askRecordKinds: ["quote", "expense"],
          inventorySelection: "explicit_boolean",
          operations: {
            expenseReceiptExtraction: {
              enabled: true,
              availabilityCode: "available",
              schemaVersion: "business-desk-expense-receipt-v1",
              promptVersion: "receipt-v1",
              requiresReadyProtectedAttachment: true
            },
            businessAsk: {
              enabled: false,
              availabilityCode: "provider_not_configured",
              schemaVersion: "business-desk-business-ask-v1",
              promptVersion: "ask-v1",
              savesAssistantDraftOnly: true,
              performsActions: false
            }
          }
        }
      }
    });

    await expect(
      getBusinessDeskProviderCapabilities(COMMERCIAL_BUSINESS_DESK_WORKSPACE)
    ).resolves.toEqual({
      expenseReceiptExtraction: {
        enabled: true,
        requiresReview: true,
        creditCost: 1,
        code: null
      },
      businessAsk: {
        enabled: false,
        createsDraftOnly: true,
        creditCost: 1,
        code: "provider_not_configured"
      },
      maxAskRecords: 40,
      maxAskDateRangeDays: 180,
      askRecordKinds: ["quote", "expense"],
      inventorySelection: "explicit_boolean"
    });
  });

  it("fails closed when a capability safety flag or exact keyset drifts", async () => {
    mockApiRequest.mockResolvedValue({
      data: {
        providerOperations: {
          creditCost: 1,
          maxAskRecords: 40,
          maxAskDateRangeDays: 180,
          askRecordKinds: ["quote"],
          inventorySelection: "explicit_boolean",
          operations: {
            expenseReceiptExtraction: {
              enabled: true,
              availabilityCode: "available",
              schemaVersion: "business-desk-expense-receipt-v1",
              promptVersion: "receipt-v1",
              requiresReadyProtectedAttachment: false
            },
            businessAsk: {
              enabled: true,
              availabilityCode: "available",
              schemaVersion: "business-desk-business-ask-v1",
              promptVersion: "ask-v1",
              savesAssistantDraftOnly: true,
              performsActions: true
            }
          }
        }
      }
    });
    await expect(
      getBusinessDeskProviderCapabilities(COMMERCIAL_BUSINESS_DESK_WORKSPACE)
    ).resolves.toEqual(
      expect.objectContaining({
        expenseReceiptExtraction: expect.objectContaining({
          enabled: false,
          code: "invalid_capability_contract"
        }),
        businessAsk: expect.objectContaining({
          enabled: false,
          code: "invalid_capability_contract"
        })
      })
    );
  });

  it("submits an exact bounded Ask request including the explicit inventory selector", async () => {
    mockApiRequest.mockResolvedValue({
      data: { operation: operation("business_ask", null), idempotentReplay: false }
    });
    const input = {
      clientOperationKey: "business-ask-stable-1",
      question: "What needs attention?",
      dateRange: { from: "2026-07-01", to: "2026-08-22" },
      recordKinds: [] as [],
      includeInventory: true
    };

    await expect(
      startBusinessAsk(COMMERCIAL_BUSINESS_DESK_WORKSPACE, input)
    ).resolves.toMatchObject({ operation: { state: "processing" } });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/business-desk/provider-operations/business-ask",
      { method: "POST", body: input }
    );
  });

  it("rejects impossible operation state, credit, result, and timestamp combinations", async () => {
    mockApiRequest.mockResolvedValue({
      data: {
        operation: {
          ...operation("business_ask", null),
          cancellable: true,
          credit: { credits: 1, status: "charged" }
        }
      }
    });
    await expect(
      startBusinessAsk(COMMERCIAL_BUSINESS_DESK_WORKSPACE, {
        clientOperationKey: "business-ask-state-drift",
        question: "What needs attention?",
        dateRange: { from: "2026-07-01", to: "2026-08-22" },
        recordKinds: ["quote"],
        includeInventory: false
      })
    ).rejects.toThrow("operation state was inconsistent");
  });

  it.each([
    [
      "queued",
      {
        state: "queued",
        cancellable: true,
        credit: { credits: 1, status: "not_reserved" },
        timestamps: {
          ...operation("business_ask", null).timestamps,
          processingAt: null,
          completedAt: null,
          cancelledAt: null
        }
      }
    ],
    ["processing", {}],
    [
      "failed",
      {
        state: "failed",
        cancellable: false,
        error: { code: "PROVIDER_FAILED", message: "Provider failed.", retryable: true },
        credit: { credits: 1, status: "refunded" },
        timestamps: {
          ...operation("business_ask", null).timestamps,
          completedAt: "2026-08-22T12:00:02.000Z",
          cancelledAt: null
        }
      }
    ],
    [
      "cancelled",
      {
        state: "cancelled",
        cancellable: false,
        credit: { credits: 1, status: "not_reserved" },
        timestamps: {
          ...operation("business_ask", null).timestamps,
          processingAt: null,
          completedAt: "2026-08-22T12:00:02.000Z",
          cancelledAt: "2026-08-22T12:00:02.000Z"
        }
      }
    ]
  ])("accepts the exact %s operation invariant", async (_label, overrides) => {
    mockApiRequest.mockResolvedValue({
      data: { operation: { ...operation("business_ask", null), ...overrides } }
    });
    await expect(
      getBusinessDeskProviderOperation(
        COMMERCIAL_BUSINESS_DESK_WORKSPACE,
        "provider-operation-1",
        "business_ask"
      )
    ).resolves.toMatchObject({ operation: expect.objectContaining(overrides) });
  });

  it("accepts cited answers and the exact citation-free insufficiency result", async () => {
    mockApiRequest
      .mockResolvedValueOnce({
        data: {
          operation: operation("business_ask", askResult()),
          idempotentReplay: true
        }
      })
      .mockResolvedValueOnce({
        data: {
          operation: operation(
            "business_ask",
            askResult({
              answer: "The authorized records are insufficient to answer this question.",
              incomplete: true,
              answerCitationIds: [],
              facts: [],
              calculations: [],
              assumptions: [],
              scenarios: [],
              recommendations: [],
              citations: [],
              selectedRecordCount: 0
            })
          )
        }
      });
    const input = {
      clientOperationKey: "business-ask-stable-1",
      question: "What needs attention?",
      dateRange: { from: "2026-07-01", to: "2026-08-22" },
      recordKinds: ["quote"] as const,
      includeInventory: false
    };

    await expect(
      startBusinessAsk(COMMERCIAL_BUSINESS_DESK_WORKSPACE, {
        ...input,
        recordKinds: [...input.recordKinds]
      })
    ).resolves.toMatchObject({ idempotentReplay: true });
    await expect(
      startBusinessAsk(COMMERCIAL_BUSINESS_DESK_WORKSPACE, {
        ...input,
        recordKinds: [...input.recordKinds]
      })
    ).resolves.toMatchObject({ operation: { result: { incomplete: true } } });
  });

  it("rejects uncited complete answers and citation IDs outside the returned set", async () => {
    mockApiRequest.mockResolvedValue({
      data: {
        operation: operation(
          "business_ask",
          askResult({ answerCitationIds: ["not-returned"] })
        )
      }
    });
    await expect(
      startBusinessAsk(COMMERCIAL_BUSINESS_DESK_WORKSPACE, {
        clientOperationKey: "business-ask-stable-2",
        question: "What needs attention?",
        dateRange: { from: "2026-07-01", to: "2026-08-22" },
        recordKinds: ["quote"],
        includeInventory: false
      })
    ).rejects.toThrow("provider result was invalid");
  });

  it("rejects material Ask rows without one to twenty valid citations", async () => {
    mockApiRequest.mockResolvedValue({
      data: {
        operation: operation(
          "business_ask",
          askResult({
            facts: [{ statement: "Unbound claim", citationIds: [] }]
          })
        )
      }
    });
    await expect(
      startBusinessAsk(COMMERCIAL_BUSINESS_DESK_WORKSPACE, {
        clientOperationKey: "business-ask-stable-3",
        question: "What needs attention?",
        dateRange: { from: "2026-07-01", to: "2026-08-22" },
        recordKinds: ["quote"],
        includeInventory: false
      })
    ).rejects.toThrow("provider result was invalid");
  });

  it("rejects provider calculations without explicit unverified review markers", async () => {
    mockApiRequest.mockResolvedValue({
      data: {
        operation: operation(
          "business_ask",
          askResult({
            calculations: [
              {
                statement: "A margin was calculated.",
                formula: "revenue - cost",
                inputs: ["revenue", "cost"],
                citationIds: ["citation-1"],
                incomplete: false
              }
            ]
          })
        )
      }
    });
    await expect(
      startBusinessAsk(COMMERCIAL_BUSINESS_DESK_WORKSPACE, {
        clientOperationKey: "business-ask-stable-unverified",
        question: "What is the margin?",
        dateRange: { from: "2026-07-01", to: "2026-08-22" },
        recordKinds: ["quote"],
        includeInventory: false
      })
    ).rejects.toThrow("provider result was invalid");
  });

  it("rejects inventory-lot citations without an exact parent binding", async () => {
    const invalid = askResult();
    invalid.citations = [
      {
        ...invalid.citations[0],
        sourceType: "business_inventory_lot",
        recordKind: "business_inventory_lot",
        version: null,
        parentRecordId: null
      }
    ];
    mockApiRequest.mockResolvedValue({
      data: { operation: operation("business_ask", invalid) }
    });

    await expect(
      startBusinessAsk(COMMERCIAL_BUSINESS_DESK_WORKSPACE, {
        clientOperationKey: "business-ask-stable-lot",
        question: "Which lot needs attention?",
        dateRange: { from: "2026-07-01", to: "2026-08-22" },
        recordKinds: [],
        includeInventory: true
      })
    ).rejects.toThrow("provider result was invalid");
  });

  it("rejects parent bindings on citations that are not inventory lots", async () => {
    const invalid = askResult();
    invalid.citations = [
      {
        ...invalid.citations[0],
        parentRecordId: "507f191e810c19729de86020"
      }
    ];
    mockApiRequest.mockResolvedValue({
      data: { operation: operation("business_ask", invalid) }
    });

    await expect(
      startBusinessAsk(COMMERCIAL_BUSINESS_DESK_WORKSPACE, {
        clientOperationKey: "business-ask-stable-parent",
        question: "Which quote needs attention?",
        dateRange: { from: "2026-07-01", to: "2026-08-22" },
        recordKinds: ["quote"],
        includeInventory: false
      })
    ).rejects.toThrow("provider result was invalid");
  });

  it("loads strict digest-only Business Ask attestation evidence", async () => {
    mockApiRequest.mockResolvedValue({
      data: {
        attestation: {
          operationId: "provider-operation-1",
          kind: "business_ask",
          state: "succeeded",
          providerInputDigestSha256: "1".repeat(64),
          sourceManifestDigestSha256: "2".repeat(64),
          resultDigestSha256: digest,
          provider: "openai",
          model: "configured-model",
          schemaVersion: "business-desk-business-ask-v1",
          promptVersion: "business-ask-v1",
          completedAt: "2026-08-22T12:00:02.000Z",
          sources: [
            {
              id: "citation-1",
              sourceType: "business_desk_record",
              recordId: "507f191e810c19729de86010",
              parentRecordId: null,
              recordKind: "quote",
              version: 3,
              sourceDate: "2026-08-21T12:00:00.000Z"
            }
          ]
        }
      }
    });

    await expect(
      getBusinessAskAttestation(
        COMMERCIAL_BUSINESS_DESK_WORKSPACE,
        "provider-operation-1"
      )
    ).resolves.toMatchObject({
      operationId: "provider-operation-1",
      sourceManifestDigestSha256: "2".repeat(64)
    });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/business-desk/provider-operations/provider-operation-1/attestation",
      {}
    );
  });

  it("rejects malformed or cross-bound attestation source metadata", async () => {
    mockApiRequest.mockResolvedValue({
      data: {
        attestation: {
          operationId: "provider-operation-1",
          kind: "business_ask",
          state: "succeeded",
          providerInputDigestSha256: "not-a-digest",
          sourceManifestDigestSha256: "2".repeat(64),
          resultDigestSha256: digest,
          provider: "openai",
          model: "configured-model",
          schemaVersion: "business-desk-business-ask-v1",
          promptVersion: "business-ask-v1",
          completedAt: "2026-08-22T12:00:02.000Z",
          sources: []
        }
      }
    });

    await expect(
      getBusinessAskAttestation(
        COMMERCIAL_BUSINESS_DESK_WORKSPACE,
        "provider-operation-1"
      )
    ).rejects.toThrow("attestation response was invalid");
  });

  it("applies only an explicitly reviewed expense to an exact saved version", async () => {
    const reviewedExpense = {
      title: "August supply receipt",
      merchant: "Garden Supply",
      occurredAt: "2026-08-22",
      amountMinor: 1525,
      taxMinor: 125,
      currency: "USD",
      minorUnitDigits: 2,
      category: "supplies",
      paymentMethod: "card",
      itemLines: [],
      notes: "",
      reviewNotes: "Compared with the protected PDF."
    };
    mockApiRequest.mockResolvedValue({
      data: {
        operation: operation("expense_receipt_extraction", extractionResult()),
        record: {
          id: "507f191e810c19729de86013",
          kind: "expense",
          title: reviewedExpense.title,
          status: "draft",
          version: 5,
          payload: { expense: reviewedExpense }
        },
        revision: {
          id: "507f191e810c19729de86014",
          recordId: "507f191e810c19729de86013",
          revisionNumber: 5
        },
        idempotentReplay: false
      }
    });

    await applyExpenseReceiptExtraction(
      COMMERCIAL_BUSINESS_DESK_WORKSPACE,
      "provider-operation-1",
      {
        recordId: "507f191e810c19729de86013",
        expectedVersion: 4,
        idempotencyKey: "expense-apply-stable-1",
        reviewedExpense
      }
    );
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/business-desk/provider-operations/provider-operation-1/apply",
      {
        method: "POST",
        body: {
          recordId: "507f191e810c19729de86013",
          expectedVersion: 4,
          idempotencyKey: "expense-apply-stable-1",
          reviewedExpense
        }
      }
    );
  });

  it("starts extraction only from a protected attachment ID and preserves replay truth", async () => {
    mockApiRequest.mockResolvedValue({
      data: {
        operation: operation("expense_receipt_extraction", null),
        idempotentReplay: true
      }
    });
    await expect(
      startExpenseReceiptExtraction(COMMERCIAL_BUSINESS_DESK_WORKSPACE, {
        clientOperationKey: "receipt-extract-stable-1",
        attachmentId: "507f191e810c19729de86012"
      })
    ).resolves.toMatchObject({ idempotentReplay: true });
  });

  it("recovers bounded workspace provider history through the exact kind filter", async () => {
    mockApiRequest.mockResolvedValue({
      data: {
        operations: [operation("business_ask", askResult())],
        nextCursor: "next-page"
      }
    });

    await expect(
      listBusinessDeskProviderOperations(COMMERCIAL_BUSINESS_DESK_WORKSPACE, {
        kind: "business_ask",
        limit: 10
      })
    ).resolves.toMatchObject({
      operations: [{ id: "provider-operation-1", kind: "business_ask" }],
      nextCursor: "next-page"
    });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/business-desk/provider-operations?kind=business_ask&limit=10",
      {}
    );
  });

  it("rejects drifted operation packets returned by provider history", async () => {
    mockApiRequest.mockResolvedValue({
      data: {
        operations: [
          {
            ...operation("business_ask", askResult()),
            credit: { credits: 1, status: "reserved" }
          }
        ],
        nextCursor: null
      }
    });

    await expect(
      listBusinessDeskProviderOperations(COMMERCIAL_BUSINESS_DESK_WORKSPACE, {
        kind: "business_ask",
        limit: 10
      })
    ).rejects.toThrow("operation state was inconsistent");
  });

  it("accepts a succeeded extraction with a missing receipt date for reviewer completion", async () => {
    mockApiRequest.mockResolvedValue({
      data: {
        operation: operation(
          "expense_receipt_extraction",
          extractionResult({
            fields: {
              ...extractionResult().fields,
              occurredAt: { value: null, confidenceBasisPoints: 0 }
            },
            missingFields: ["occurredAt"]
          })
        ),
        idempotentReplay: false
      }
    });

    await expect(
      getBusinessDeskProviderOperation(
        COMMERCIAL_BUSINESS_DESK_WORKSPACE,
        "provider-operation-1",
        "expense_receipt_extraction"
      )
    ).resolves.toMatchObject({
      operation: {
        result: { fields: { occurredAt: { value: null } } }
      }
    });
  });
});
