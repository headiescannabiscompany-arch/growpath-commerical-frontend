import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import QuoteEstimateTool, {
  quoteArtifactOutcomeMessage
} from "@/features/businessDesk/QuoteEstimateTool";

const mockCalculate = jest.fn();
const mockArchive = jest.fn();
const mockCreate = jest.fn();
const mockCorrectPayment = jest.fn();
const mockExport = jest.fn();
const mockLifecycle = jest.fn();
const mockList = jest.fn();
const mockPaymentChains = jest.fn();
const mockPaymentSummary = jest.fn();
const mockPreview = jest.fn();
const mockPrepare = jest.fn();
const mockRecordPayment = jest.fn();
const mockRevisions = jest.fn();
const mockUpdate = jest.fn();
const mockVoidPayment = jest.fn();

jest.mock("@/api/businessDesk", () => ({
  archiveBusinessDeskRecord: (...args: any[]) => mockArchive(...args),
  businessDeskWorkspaceKey: (workspace: any) =>
    workspace.workspaceType === "facility"
      ? `facility:${workspace.facilityId}`
      : "commercial",
  calculateBusinessDesk: (...args: any[]) => mockCalculate(...args),
  correctBusinessDeskQuotePayment: (...args: any[]) => mockCorrectPayment(...args),
  createBusinessDeskRecord: (...args: any[]) => mockCreate(...args),
  getBusinessDeskQuoteLifecycle: (...args: any[]) => mockLifecycle(...args),
  getBusinessDeskQuotePaymentEvidenceChains: (...args: any[]) =>
    mockPaymentChains(...args),
  getBusinessDeskQuotePaymentSummary: (...args: any[]) => mockPaymentSummary(...args),
  listBusinessDeskRecords: (...args: any[]) => mockList(...args),
  listBusinessDeskRevisions: (...args: any[]) => mockRevisions(...args),
  recordBusinessDeskQuotePayment: (...args: any[]) => mockRecordPayment(...args),
  updateBusinessDeskRecord: (...args: any[]) => mockUpdate(...args),
  voidBusinessDeskQuotePayment: (...args: any[]) => mockVoidPayment(...args)
}));

jest.mock("@/api/businessDeskArtifacts", () => ({
  ...jest.requireActual("@/api/businessDeskArtifacts"),
  previewBusinessDeskArtifact: (...args: any[]) => mockPreview(...args),
  prepareBusinessDeskArtifact: (...args: any[]) => mockPrepare(...args)
}));

jest.mock("@/utils/exportToCsv", () => ({
  exportCsvContent: (...args: any[]) => mockExport(...args)
}));

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockAppPage({ header, children }: any) {
    return React.createElement(View, null, header, children);
  };
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return function MockAppCard({ title, subtitle, children }: any) {
    return React.createElement(
      View,
      null,
      title ? React.createElement(Text, null, title) : null,
      subtitle ? React.createElement(Text, null, subtitle) : null,
      children
    );
  };
});

jest.mock("@/components/forms/CalendarDateField", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return function MockCalendarDateField({ accessibilityLabel, onChange }: any) {
    return React.createElement(
      Pressable,
      { accessibilityLabel, onPress: () => onChange("2026-09-30") },
      React.createElement(Text, null, "Choose expiration")
    );
  };
});

function quoteResult(overrides: Record<string, unknown> = {}) {
  return {
    calculator: "quote",
    currency: "USD",
    minorUnitDigits: 2,
    quantityScale: 1_000_000,
    basisPointScale: 10_000,
    lineItems: [
      {
        quantityMicros: 2_500_000,
        unitPriceMinor: 1234,
        lineTotalMinor: 3085,
        unitDirectCostMinor: null,
        lineDirectCostMinor: null
      }
    ],
    totals: {
      subtotalMinor: 3085,
      discount: {
        order: "percent_then_fixed",
        percentBasisPoints: 1000,
        fixedMinor: 100,
        percentMinor: 309,
        totalMinor: 409,
        discountedSubtotalMinor: 2676
      },
      customerShippingMinor: 500,
      tax: {
        type: "percent",
        basisPoints: 600,
        base: "discounted_subtotal_plus_shipping",
        amountMinor: 191
      },
      totalMinor: 3367,
      depositDueMinor: 842,
      balanceAfterDepositMinor: 2525,
      directCostMinor: null,
      businessFeesMinor: 50,
      shippingCostMinor: 200,
      knownCostMinor: null,
      grossProfitMinor: null,
      marginBasisPoints: null,
      markupBasisPoints: null,
      complete: false,
      incompleteReasons: ["DIRECT_COST_UNKNOWN"],
      ...(overrides.totals || {})
    },
    resultMetadata: {
      formulaVersion: "business-desk-money-v1",
      roundingRule: "half_away_from_zero_at_conversion_boundaries",
      calculatedAt: "2026-08-22T12:00:00.000Z",
      inputSnapshot: { calculator: "quote" },
      inputDigestSha256: "f".repeat(64),
      missingInputs: ["DIRECT_COST_UNKNOWN"]
    }
  };
}

function fillMinimum(screen: ReturnType<typeof render>) {
  fireEvent.changeText(screen.getByLabelText("Quote title"), "Spring install");
  fireEvent.changeText(screen.getByLabelText("Quote project"), "North greenhouse");
  fireEvent.changeText(
    screen.getByLabelText("Quote line 1 description"),
    "Irrigation design labor"
  );
  fireEvent.changeText(screen.getByLabelText("Quote line 1 quantity"), "2.5");
  fireEvent.changeText(screen.getByLabelText("Quote line 1 unit price"), "12.34");
}

function savedQuotePayload() {
  return {
    quote: {
      customer: { name: "Alex", company: "", email: "", phone: "" },
      project: "Greenhouse",
      quoteNumber: "Q-100",
      expiresAt: null,
      currency: "USD",
      minorUnitDigits: 2,
      lineItems: [
        {
          kind: "material",
          description: "Irrigation tubing",
          quantityMicros: 1_000_000,
          unitPriceMinor: 1000,
          unitDirectCostMinor: 600,
          currency: "USD"
        }
      ],
      discount: {
        order: "percent_then_fixed",
        percentBasisPoints: 0,
        fixedMinor: 0,
        currency: "USD"
      },
      customerShippingMinor: 0,
      tax: { type: "none" },
      businessFeesMinor: 0,
      shippingCostMinor: 0,
      deposit: { type: "none" },
      scope: "Install one line",
      customerNotes: "Access by side gate",
      terms: "",
      assumptions: "Water is available",
      exclusions: "Electrical work",
      internalNotes: ""
    }
  };
}

function paymentSummaryFixture(recordId = "quote-1", revisionNumber = 4) {
  return {
    quoteRecordId: recordId,
    quoteRevisionNumber: revisionNumber,
    currency: "USD",
    minorUnitDigits: 2,
    quoteTotalMinor: 10_000,
    requestedDepositMinor: 2_500,
    requestedDepositIsPaymentEvidence: false,
    paidMinor: 2_000,
    userConfirmedPaidMinor: 2_000,
    outstandingMinor: 8_000,
    overpaymentMinor: 0,
    depositOutstandingMinor: 500,
    depositSatisfied: false,
    evidenceSource: "user_confirmed",
    evidenceScope: "user_confirmed_only",
    evidenceEventCount: 1,
    paymentChainCount: 1,
    activePaymentCount: 1,
    voidedPaymentCount: 0,
    providerObservation: {
      supported: false,
      code: "BUSINESS_DESK_PAYMENT_PROVIDER_OBSERVATION_NOT_CONFIGURED"
    }
  };
}

function lifecycleFixture(recordId = "quote-1", revisionNumber = 4) {
  return {
    quoteRecordId: recordId,
    quoteRevisionNumber: revisionNumber,
    derivedAt: "2026-08-22T18:00:00.000Z",
    facets: {
      content: "reviewed",
      artifact: "copy_prepared",
      provider: "none",
      time: "current",
      revision: "current"
    },
    displayStatus: "reviewed",
    evidence: { verifiedArtifactCount: 1, verifiedProviderEventCount: 0 },
    providerHandoff: {
      supported: false,
      code: "BUSINESS_DESK_PAYMENT_HANDOFF_NOT_CONFIGURED"
    }
  };
}

function paymentChainsFixture(recordId = "quote-1", revisionNumber = 4) {
  return {
    quoteRecordId: recordId,
    quoteRevisionNumber: revisionNumber,
    currency: "USD",
    minorUnitDigits: 2,
    evidenceScope: "user_confirmed_only",
    chains: [
      {
        rootPaymentEvidenceId: "507f191e810c19729de86021",
        latestEvidenceId: "507f191e810c19729de86021",
        latestEventType: "payment",
        source: "user_confirmed",
        amountMinor: 2_000,
        occurredAt: "2026-08-20T00:00:00.000Z",
        reference: "Receipt 12",
        reason: "",
        sequence: 1,
        active: true,
        canCorrect: true,
        canVoid: true,
        createdAt: "2026-08-22T18:01:00.000Z"
      }
    ]
  };
}

function paymentMutationResult(
  eventType: "payment" | "correction" | "void",
  recordId = "quote-1",
  revisionNumber = 4
) {
  return {
    evidence: {
      id: "507f191e810c19729de86022",
      quoteRecordId: recordId,
      quoteRevisionNumber: revisionNumber,
      eventType,
      source: "user_confirmed",
      amountMinor: eventType === "void" ? 0 : eventType === "correction" ? 2_200 : 2_000,
      currency: "USD",
      minorUnitDigits: 2,
      occurredAt: "2026-09-30T00:00:00.000Z",
      reference: eventType === "payment" ? "Receipt 12" : "",
      reason: eventType === "payment" ? "" : "Reviewed bank record",
      rootPaymentEvidenceId: "507f191e810c19729de86021",
      supersedesEvidenceId: eventType === "payment" ? null : "507f191e810c19729de86021",
      sequence: eventType === "payment" ? 1 : 2,
      confirmation: {
        confirmed: true,
        confirmedAt: "2026-08-22T18:02:00.000Z"
      },
      createdAt: "2026-08-22T18:02:00.000Z"
    },
    idempotentReplay: false
  };
}

function artifactPreview(kind: "quote_copy" | "quote_csv", version = 4) {
  const content = kind === "quote_csv" ? '"section","field"\r\n' : "Quote Q-100";
  const artifact = {
    mode: kind === "quote_csv" ? ("csv" as const) : ("copy" as const),
    contentType:
      kind === "quote_csv"
        ? ("text/csv; charset=utf-8" as const)
        : ("text/plain; charset=utf-8" as const),
    filename: kind === "quote_csv" ? "Q-100.csv" : "Q-100.txt",
    content,
    projectionVersion: "business-desk-artifact-projection-v1" as const,
    redactionProfile:
      kind === "quote_csv" ? "quote_customer_csv_v1" : "quote_customer_copy_v1",
    fieldManifest: ["section", "field"],
    checksumSha256: "a".repeat(64),
    bytes: content.length,
    rowCount: 1,
    recordCount: 1,
    deliveryStatus: "not_observed" as const
  };
  return {
    artifactKind: kind,
    artifact,
    recordPins: [
      { recordId: "quote-1", revisionId: "revision-4", recordKind: "quote", version }
    ],
    previewConfirmationSha256: "b".repeat(64)
  };
}

function preparedArtifact(preview: ReturnType<typeof artifactPreview>, replay = false) {
  const { content: _content, ...metadata } = preview.artifact;
  return {
    artifactKind: preview.artifactKind,
    receipt: {
      id: "receipt-1",
      artifactKind: preview.artifactKind,
      exportKind: preview.artifactKind,
      recordPins: preview.recordPins,
      preparedArtifact: metadata,
      actorRelationship: { prepared: true },
      createdAt: "2026-08-22T18:00:00.000Z"
    },
    artifact: preview.artifact,
    recordPins: preview.recordPins,
    idempotentReplay: replay
  };
}

describe("QuoteEstimateTool", () => {
  beforeEach(() => {
    mockArchive.mockReset();
    mockCalculate.mockReset();
    mockCorrectPayment.mockReset();
    mockCreate.mockReset();
    mockExport.mockReset().mockResolvedValue({
      ok: true,
      filename: "quote",
      rowCount: 0,
      method: "web-download"
    });
    mockList.mockReset().mockResolvedValue([]);
    mockLifecycle
      .mockReset()
      .mockImplementation(async (_workspace, id, version) =>
        lifecycleFixture(id, version)
      );
    mockPaymentChains
      .mockReset()
      .mockImplementation(async (_workspace, id, version) =>
        paymentChainsFixture(id, version)
      );
    mockPaymentSummary
      .mockReset()
      .mockImplementation(async (_workspace, id, version) =>
        paymentSummaryFixture(id, version)
      );
    mockPreview.mockReset();
    mockPrepare.mockReset();
    mockRecordPayment.mockReset();
    mockRevisions.mockReset().mockResolvedValue([]);
    mockUpdate.mockReset();
    mockVoidPayment.mockReset();
  });

  it("sends exact integer quote math and preserves unknown direct cost", async () => {
    mockCalculate.mockResolvedValue(quoteResult());
    const screen = render(
      <QuoteEstimateTool
        workspace={{ workspaceType: "facility", facilityId: "facility-1" }}
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    fillMinimum(screen);
    fireEvent.press(screen.getByLabelText("Quote line 1 type Labor"));
    fireEvent.changeText(screen.getByLabelText("Quote discount percent"), "10");
    fireEvent.changeText(screen.getByLabelText("Quote fixed discount"), "1.00");
    fireEvent.changeText(screen.getByLabelText("Quote customer shipping"), "5");
    fireEvent.changeText(screen.getByLabelText("Quote scenario fees"), "0.50");
    fireEvent.changeText(screen.getByLabelText("Quote fulfillment cost"), "2");
    fireEvent.press(screen.getByLabelText("Quote tax type percent"));
    fireEvent.changeText(screen.getByLabelText("Quote tax rate"), "6");
    fireEvent.press(screen.getByLabelText("Include quote shipping in tax base"));
    fireEvent.press(screen.getByLabelText("Quote deposit type percent"));
    fireEvent.changeText(screen.getByLabelText("Quote deposit percent"), "25");
    fireEvent.press(screen.getByLabelText("Calculate quote"));

    await waitFor(() => expect(mockCalculate).toHaveBeenCalledTimes(1));
    expect(mockCalculate).toHaveBeenCalledWith(
      { workspaceType: "facility", facilityId: "facility-1" },
      expect.objectContaining({
        calculator: "quote",
        currency: "USD",
        minorUnitDigits: 2,
        lineItems: [
          expect.objectContaining({
            kind: "labor",
            description: "Irrigation design labor",
            quantityMicros: 2_500_000,
            unitPriceMinor: 1234,
            unitDirectCostMinor: null,
            currency: "USD"
          })
        ],
        discount: expect.objectContaining({
          order: "percent_then_fixed",
          percentBasisPoints: 1000,
          fixedMinor: 100
        }),
        customerShippingMinor: 500,
        businessFeesMinor: 50,
        shippingCostMinor: 200,
        tax: expect.objectContaining({
          type: "percent",
          basisPoints: 600,
          base: "discounted_subtotal_plus_shipping"
        }),
        deposit: { type: "percent", basisPoints: 2500 }
      })
    );
    expect(await screen.findByText("Profitability is incomplete")).toBeTruthy();
    expect(screen.getAllByText("Unknown").length).toBeGreaterThan(1);
    expect(screen.getByText(/Unknown cost remains unknown/i)).toBeTruthy();
    expect(screen.getByText("Customer shipping")).toBeTruthy();
    expect(screen.getByText("Business / payment fees")).toBeTruthy();
    expect(screen.getAllByText("Fulfillment / shipping cost").length).toBeGreaterThan(1);
    expect(screen.getByText(/Tax source: 6% entered by the operator/i)).toBeTruthy();
    expect(screen.getByText(/Tax is not treated as revenue or cost/i)).toBeTruthy();
    expect(screen.getByText(/Formula: business-desk-money-v1/i)).toBeTruthy();
    expect(
      screen.getByText(new RegExp(`input fingerprint: ${"f".repeat(64)}`, "i"))
    ).toBeTruthy();
  });

  it("rejects a calculation response without reproducibility metadata", async () => {
    mockCalculate.mockResolvedValue({ ...quoteResult(), resultMetadata: undefined });
    const screen = render(
      <QuoteEstimateTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    fillMinimum(screen);
    fireEvent.press(screen.getByLabelText("Calculate quote"));

    expect(await screen.findByText(/calculation response was incomplete/i)).toBeTruthy();
    expect(screen.queryByText("Deterministic quote totals")).toBeNull();
  });

  it("rejects unsupported money precision before calling the calculator", async () => {
    const screen = render(
      <QuoteEstimateTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    fillMinimum(screen);
    fireEvent.changeText(screen.getByLabelText("Quote line 1 unit price"), "12.345");
    fireEvent.press(screen.getByLabelText("Calculate quote"));

    expect(
      await screen.findByText(/supports at most 2 decimal places in USD/i)
    ).toBeTruthy();
    expect(mockCalculate).not.toHaveBeenCalled();
  });

  it("rejects entered percentages above 100 before calling the calculator", async () => {
    const screen = render(
      <QuoteEstimateTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    fillMinimum(screen);
    fireEvent.changeText(screen.getByLabelText("Quote discount percent"), "100.01");
    fireEvent.press(screen.getByLabelText("Calculate quote"));

    expect(
      await screen.findByText(/Discount percentage cannot exceed 100%/i)
    ).toBeTruthy();
    expect(mockCalculate).not.toHaveBeenCalled();
  });

  it("does not display a calculation after its exact input has changed", async () => {
    let resolveCalculation: ((value: ReturnType<typeof quoteResult>) => void) | null =
      null;
    mockCalculate.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCalculation = resolve;
        })
    );
    const screen = render(
      <QuoteEstimateTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    fillMinimum(screen);
    fireEvent.press(screen.getByLabelText("Calculate quote"));
    fireEvent.changeText(
      screen.getByLabelText("Quote title"),
      "Changed while calculating"
    );

    await act(async () => {
      resolveCalculation?.(quoteResult());
    });

    expect(screen.queryByText("Deterministic quote totals")).toBeNull();
  });

  it("discloses when fixed discount and deposit inputs are capped", async () => {
    mockCalculate.mockResolvedValue(quoteResult());
    const screen = render(
      <QuoteEstimateTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    fillMinimum(screen);
    fireEvent.changeText(screen.getByLabelText("Quote fixed discount"), "100");
    fireEvent.press(screen.getByLabelText("Quote deposit type fixed"));
    fireEvent.changeText(screen.getByLabelText("Quote deposit amount"), "100");
    fireEvent.press(screen.getByLabelText("Calculate quote"));

    expect(await screen.findByText("Fixed discount limited to subtotal")).toBeTruthy();
    expect(screen.getByText("Deposit limited to customer total")).toBeTruthy();
    expect(screen.getByText(/no charge or payment occurred/i)).toBeTruthy();
  });

  it("saves a draft, then reviews that exact revision with CAS and idempotency", async () => {
    mockCalculate.mockResolvedValue(quoteResult());
    let draftRecord: any;
    mockCreate.mockImplementation(async (_workspace, input) => {
      draftRecord = {
        _id: "quote-1",
        kind: "quote",
        title: input.title,
        status: input.status,
        version: 1,
        payload: input.payload,
        updatedAt: "2026-08-22T12:00:00.000Z"
      };
      return draftRecord;
    });
    mockUpdate.mockImplementation(async (_workspace, _id, input) => ({
      ...draftRecord,
      status: input.status,
      version: 2,
      updatedAt: "2026-08-22T12:01:00.000Z"
    }));
    mockRevisions.mockResolvedValue([
      { _id: "revision-1", recordId: "quote-1", revisionNumber: 1, operation: "create" }
    ]);
    const screen = render(
      <QuoteEstimateTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    fillMinimum(screen);
    fireEvent.changeText(screen.getByLabelText("Quote customer name"), "Alex Garden");
    fireEvent.changeText(
      screen.getByLabelText("Quote assumptions"),
      "Water access provided"
    );
    fireEvent.changeText(screen.getByLabelText("Quote exclusions"), "Permit fees");
    fireEvent.press(screen.getByLabelText("Quote expiration date"));
    fireEvent.press(screen.getByLabelText("Save quote draft"));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith(
      { workspaceType: "commercial" },
      expect.objectContaining({
        kind: "quote",
        title: "Spring install",
        status: "draft",
        idempotencyKey: expect.stringMatching(/^business-desk:draft:new:/),
        payload: {
          quote: expect.objectContaining({
            project: "North greenhouse",
            expiresAt: "2026-09-30",
            customer: expect.objectContaining({ name: "Alex Garden" }),
            assumptions: "Water access provided",
            exclusions: "Permit fees",
            lineItems: [expect.objectContaining({ kind: "service" })]
          })
        }
      })
    );
    await waitFor(() =>
      expect(
        screen.getByLabelText("Review and save quote revision").props.accessibilityState
      ).toEqual({ disabled: false })
    );
    fireEvent.press(screen.getByLabelText("Review and save quote revision"));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate).toHaveBeenCalledWith({ workspaceType: "commercial" }, "quote-1", {
      expectedVersion: 1,
      status: "reviewed",
      idempotencyKey: expect.stringMatching(/^business-desk:reviewed:quote-1:/)
    });
    expect(mockUpdate.mock.calls[0][2]).not.toHaveProperty("title");
    expect(mockUpdate.mock.calls[0][2]).not.toHaveProperty("payload");
    expect(mockUpdate.mock.calls[0][2]).not.toHaveProperty("sourceLinks");
    expect(
      await screen.findByText(/Revision 2 reviewed. Nothing was sent or charged/i)
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Preview reviewed quote copy").props.accessibilityState
    ).toEqual({ busy: false, disabled: false });
    expect(
      screen.getByLabelText("Payment provider draft handoff unavailable").props
        .accessibilityState
    ).toEqual({ disabled: true });
  });

  it("loads exact reviewed lifecycle, deposit, payment, and balance truth", async () => {
    mockList.mockResolvedValue([
      {
        _id: "quote-1",
        kind: "quote",
        title: "Evidence quote",
        status: "reviewed",
        version: 4,
        payload: savedQuotePayload()
      }
    ]);
    const screen = render(
      <QuoteEstimateTool
        workspace={{ workspaceType: "facility", facilityId: "facility-1" }}
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );

    fireEvent.press(await screen.findByLabelText("Open saved quote Evidence quote"));
    expect(
      await screen.findByText("Reviewed quote lifecycle and payment evidence")
    ).toBeTruthy();
    await waitFor(() => expect(mockPaymentSummary).toHaveBeenCalledTimes(1));
    expect(mockPaymentSummary).toHaveBeenCalledWith(
      { workspaceType: "facility", facilityId: "facility-1" },
      "quote-1",
      4,
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(mockLifecycle).toHaveBeenCalledWith(
      { workspaceType: "facility", facilityId: "facility-1" },
      "quote-1",
      4,
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(mockPaymentChains).toHaveBeenCalledWith(
      { workspaceType: "facility", facilityId: "facility-1" },
      "quote-1",
      4,
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(screen.getByText("$100.00")).toBeTruthy();
    expect(screen.getByText("$25.00")).toBeTruthy();
    expect(screen.getAllByText("$20.00").length).toBeGreaterThan(0);
    expect(screen.getByText("$80.00")).toBeTruthy();
    expect(screen.getByText("$5.00")).toBeTruthy();
    expect(
      screen.getByText(/requested deposit is a quote term, not payment evidence/i)
    ).toBeTruthy();
    expect(
      screen.getAllByText(/provider observations.*not configured/i).length
    ).toBeGreaterThan(0);
  });

  it("records a confirmed manual payment and reuses its key after an ambiguous failure", async () => {
    mockList.mockResolvedValue([
      {
        _id: "quote-1",
        kind: "quote",
        title: "Retry payment quote",
        status: "reviewed",
        version: 4,
        payload: savedQuotePayload()
      }
    ]);
    mockRecordPayment
      .mockRejectedValueOnce(new Error("Connection closed after commit"))
      .mockResolvedValueOnce(paymentMutationResult("payment"));
    const screen = render(
      <QuoteEstimateTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );

    fireEvent.press(await screen.findByLabelText("Open saved quote Retry payment quote"));
    await screen.findByText("$100.00");
    fireEvent.changeText(
      screen.getByLabelText("Confirmed quote payment amount"),
      "20.00"
    );
    fireEvent.changeText(
      screen.getByLabelText("Confirmed quote payment reference"),
      "Receipt 12"
    );
    fireEvent.press(screen.getByLabelText("Confirmed quote payment date"));
    fireEvent.press(
      screen.getByLabelText("Confirm user-reported quote payment evidence")
    );
    fireEvent.press(screen.getByLabelText("Record confirmed manual quote payment"));

    expect(await screen.findByText(/Connection closed after commit/i)).toBeTruthy();
    await waitFor(() =>
      expect(
        screen.getByLabelText("Record confirmed manual quote payment").props
          .accessibilityState.disabled
      ).toBe(false)
    );
    fireEvent.press(screen.getByLabelText("Record confirmed manual quote payment"));

    await waitFor(() => expect(mockRecordPayment).toHaveBeenCalledTimes(2));
    expect(mockRecordPayment.mock.calls[0][2]).toEqual(
      expect.objectContaining({
        expectedVersion: 4,
        amountMinor: 2_000,
        currency: "USD",
        minorUnitDigits: 2,
        occurredAt: "2026-09-30",
        reference: "Receipt 12",
        confirmed: true,
        idempotencyKey: expect.stringMatching(/^business-desk:payment:/)
      })
    );
    expect(mockRecordPayment.mock.calls[1][2].idempotencyKey).toBe(
      mockRecordPayment.mock.calls[0][2].idempotencyKey
    );
    expect(
      await screen.findByText(/No customer was charged and no inventory changed/i)
    ).toBeTruthy();
  });

  it("corrects and voids only the latest active evidence returned by the durable list", async () => {
    mockList.mockResolvedValue([
      {
        _id: "quote-1",
        kind: "quote",
        title: "Adjust payment quote",
        status: "reviewed",
        version: 4,
        payload: savedQuotePayload()
      }
    ]);
    mockCorrectPayment.mockResolvedValue(paymentMutationResult("correction"));
    mockVoidPayment.mockResolvedValue(paymentMutationResult("void"));
    const screen = render(
      <QuoteEstimateTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );

    fireEvent.press(
      await screen.findByLabelText("Open saved quote Adjust payment quote")
    );
    fireEvent.press(await screen.findByLabelText("Correct user-confirmed payment 1"));
    fireEvent.changeText(
      screen.getByLabelText("Corrected quote payment amount"),
      "22.00"
    );
    fireEvent.changeText(
      screen.getByLabelText("Quote payment correction reason"),
      "Reviewed bank record"
    );
    fireEvent.press(screen.getByLabelText("Quote payment correction date"));
    fireEvent.press(screen.getByLabelText("Confirm quote payment correction"));
    fireEvent.press(screen.getByLabelText("Save quote payment correction"));

    await waitFor(() => expect(mockCorrectPayment).toHaveBeenCalledTimes(1));
    expect(mockCorrectPayment).toHaveBeenCalledWith(
      { workspaceType: "commercial" },
      "quote-1",
      "507f191e810c19729de86021",
      expect.objectContaining({
        expectedVersion: 4,
        amountMinor: 2_200,
        reason: "Reviewed bank record",
        occurredAt: "2026-09-30",
        confirmed: true
      })
    );

    fireEvent.press(await screen.findByLabelText("Void user-confirmed payment 1"));
    fireEvent.changeText(
      screen.getByLabelText("Quote payment void reason"),
      "Duplicate bank entry"
    );
    fireEvent.press(screen.getByLabelText("Quote payment void date"));
    fireEvent.press(screen.getByLabelText("Confirm quote payment void"));
    fireEvent.press(screen.getByLabelText("Save quote payment void"));

    await waitFor(() => expect(mockVoidPayment).toHaveBeenCalledTimes(1));
    expect(mockVoidPayment).toHaveBeenCalledWith(
      { workspaceType: "commercial" },
      "quote-1",
      "507f191e810c19729de86021",
      expect.objectContaining({
        expectedVersion: 4,
        reason: "Duplicate bank entry",
        occurredAt: "2026-09-30",
        confirmed: true
      })
    );
  });

  it("locks payment mutations when the selected reviewed revision is superseded or dirty", async () => {
    mockList.mockResolvedValue([
      {
        _id: "quote-1",
        kind: "quote",
        title: "Stale payment quote",
        status: "reviewed",
        version: 4,
        payload: savedQuotePayload()
      }
    ]);
    mockLifecycle.mockImplementation(async (_workspace, id, version) => ({
      ...lifecycleFixture(id, version),
      facets: {
        ...lifecycleFixture(id, version).facets,
        revision: "superseded"
      },
      displayStatus: "superseded"
    }));
    const screen = render(
      <QuoteEstimateTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );

    fireEvent.press(await screen.findByLabelText("Open saved quote Stale payment quote"));
    await screen.findByText("Payment changes are locked");
    expect(
      screen.getByLabelText("Record confirmed manual quote payment").props
        .accessibilityState.disabled
    ).toBe(true);
    expect(
      screen.getByLabelText("Correct user-confirmed payment 1").props.accessibilityState
        .disabled
    ).toBe(true);
    fireEvent.changeText(screen.getByLabelText("Quote title"), "Unsaved edit");
    expect(screen.getByText(/editor differs from reviewed revision 4/i)).toBeTruthy();
    expect(mockRecordPayment).not.toHaveBeenCalled();
  });

  it("prepares and exports only the exact reviewed revision", async () => {
    const payload = {
      quote: {
        customer: { name: "Alex", company: "", email: "", phone: "" },
        project: "Greenhouse",
        quoteNumber: "Q-100",
        expiresAt: null,
        currency: "USD",
        minorUnitDigits: 2,
        lineItems: [
          {
            kind: "material",
            description: "Irrigation tubing",
            quantityMicros: 1_000_000,
            unitPriceMinor: 1000,
            unitDirectCostMinor: 600,
            currency: "USD"
          }
        ],
        discount: {
          order: "percent_then_fixed",
          percentBasisPoints: 0,
          fixedMinor: 0,
          currency: "USD"
        },
        customerShippingMinor: 0,
        tax: { type: "none" },
        businessFeesMinor: 0,
        shippingCostMinor: 0,
        deposit: { type: "none" },
        scope: "Install one line",
        customerNotes: "Access by side gate",
        terms: "",
        assumptions: "Water is available",
        exclusions: "Electrical work",
        internalNotes: ""
      }
    };
    mockList.mockResolvedValue([
      {
        _id: "quote-1",
        kind: "quote",
        title: "Greenhouse irrigation",
        status: "reviewed",
        version: 4,
        payload
      }
    ]);
    const preview = artifactPreview("quote_csv");
    mockPreview.mockResolvedValue(preview);
    mockPrepare.mockResolvedValue(preparedArtifact(preview));
    const screen = render(
      <QuoteEstimateTool
        workspace={{ workspaceType: "facility", facilityId: "facility-1" }}
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );
    fireEvent.press(
      await screen.findByLabelText("Open saved quote Greenhouse irrigation")
    );
    fireEvent.press(screen.getByLabelText("Preview reviewed quote CSV"));
    await screen.findByLabelText("Reviewed quote CSV preview content");
    fireEvent.press(screen.getByLabelText("Confirm and export reviewed quote CSV"));

    await waitFor(() => expect(mockPrepare).toHaveBeenCalledTimes(1));
    expect(mockPreview).toHaveBeenCalledWith(
      { workspaceType: "facility", facilityId: "facility-1" },
      expect.objectContaining({
        artifactKind: "quote_csv",
        revisionSelections: [{ recordId: "quote-1", revisionNumber: 4 }]
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(mockPrepare.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        artifactKind: "quote_csv",
        revisionSelections: [{ recordId: "quote-1", revisionNumber: 4 }],
        previewConfirmationSha256: "b".repeat(64),
        confirmed: true,
        expectedPreview: preview
      })
    );
    expect(mockExport).toHaveBeenCalledWith("Q-100.csv", '"section","field"\r\n');
    expect(
      await screen.findByText(/audited preparation.*local file download was started/i)
    ).toBeTruthy();
  });

  it("reuses the exact artifact operation key after an ambiguous preparation failure", async () => {
    mockList.mockResolvedValue([
      {
        _id: "quote-1",
        kind: "quote",
        title: "Retry quote",
        status: "reviewed",
        version: 4,
        payload: savedQuotePayload()
      }
    ]);
    const preview = artifactPreview("quote_csv");
    mockPreview.mockResolvedValue(preview);
    mockPrepare
      .mockRejectedValueOnce(new Error("Connection closed after request"))
      .mockResolvedValueOnce(preparedArtifact(preview, true));
    const screen = render(
      <QuoteEstimateTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );
    fireEvent.press(await screen.findByLabelText("Open saved quote Retry quote"));
    fireEvent.press(screen.getByLabelText("Preview reviewed quote CSV"));
    await screen.findByLabelText("Reviewed quote CSV preview content");
    fireEvent.press(screen.getByLabelText("Confirm and export reviewed quote CSV"));
    expect(await screen.findByText(/Connection closed after request/i)).toBeTruthy();
    await waitFor(() =>
      expect(
        screen.getByLabelText("Confirm and export reviewed quote CSV").props
          .accessibilityState
      ).toEqual({ busy: false, disabled: false })
    );

    fireEvent.press(screen.getByLabelText("Confirm and export reviewed quote CSV"));
    await waitFor(() => expect(mockPrepare).toHaveBeenCalledTimes(2));
    expect(mockPrepare.mock.calls[1][1].idempotencyKey).toBe(
      mockPrepare.mock.calls[0][1].idempotencyKey
    );
    expect(mockExport).toHaveBeenCalledTimes(1);
  });

  it("refreshes current records and archives with CAS while preserving history", async () => {
    const first = {
      _id: "quote-1",
      kind: "quote",
      title: "Current quote",
      status: "draft",
      version: 1,
      payload: savedQuotePayload()
    };
    const refreshed = { ...first, status: "reviewed", version: 2 };
    mockList
      .mockReset()
      .mockResolvedValueOnce([first])
      .mockResolvedValueOnce([refreshed]);
    mockArchive.mockResolvedValue({
      ...refreshed,
      archivedAt: "2026-08-22T18:00:00.000Z"
    });
    const screen = render(
      <QuoteEstimateTool
        workspace={{ workspaceType: "facility", facilityId: "facility-1" }}
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );
    await screen.findByLabelText("Open saved quote Current quote");
    fireEvent.press(screen.getByLabelText("Refresh saved quote list"));
    expect(await screen.findByText(/reviewed · revision 2/i)).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Open saved quote Current quote"));
    fireEvent.changeText(
      screen.getByLabelText("Quote archive reason"),
      "Duplicate quote"
    );
    fireEvent.press(screen.getByLabelText("Archive selected quote"));

    await waitFor(() => expect(mockArchive).toHaveBeenCalledTimes(1));
    expect(mockArchive).toHaveBeenCalledWith(
      { workspaceType: "facility", facilityId: "facility-1" },
      "quote-1",
      {
        expectedVersion: 2,
        reason: "Duplicate quote",
        idempotencyKey: expect.stringMatching(/^business-desk:archive:quote-1:/)
      }
    );
    expect(await screen.findByText(/immutable history was preserved/i)).toBeTruthy();
    expect(screen.queryByLabelText("Open saved quote Current quote")).toBeNull();
  });

  it("keeps export pinned to the reviewed revision while edits become a draft", async () => {
    const reviewedRecord = {
      _id: "quote-1",
      kind: "quote",
      title: "Greenhouse irrigation",
      status: "reviewed",
      version: 4,
      payload: savedQuotePayload()
    };
    mockList.mockResolvedValue([reviewedRecord]);
    mockCalculate.mockResolvedValue(quoteResult());
    const preview = artifactPreview("quote_csv");
    mockPreview.mockResolvedValue(preview);
    mockPrepare.mockResolvedValue(preparedArtifact(preview));
    mockUpdate.mockImplementation(async (_workspace, id, input) => ({
      _id: id,
      kind: "quote",
      title: input.title,
      status: input.status,
      version: 5,
      payload: input.payload
    }));
    const screen = render(
      <QuoteEstimateTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );
    fireEvent.press(
      await screen.findByLabelText("Open saved quote Greenhouse irrigation")
    );
    fireEvent.changeText(screen.getByLabelText("Quote title"), "Edited irrigation");

    expect(
      screen.getByLabelText("Preview reviewed quote CSV").props.accessibilityState
    ).toEqual({ busy: false, disabled: false });
    expect(
      screen.getAllByText(/editor contains unsaved changes.*revision 4/i)
    ).toHaveLength(2);
    fireEvent.press(screen.getByLabelText("Preview reviewed quote CSV"));
    await screen.findByLabelText("Reviewed quote CSV preview content");
    fireEvent.press(screen.getByLabelText("Confirm and export reviewed quote CSV"));
    await waitFor(() => expect(mockPrepare).toHaveBeenCalledTimes(1));
    expect(mockPrepare.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        artifactKind: "quote_csv",
        revisionSelections: [{ recordId: "quote-1", revisionNumber: 4 }]
      })
    );

    await waitFor(() => expect(mockExport).toHaveBeenCalledTimes(1));
    fireEvent.press(screen.getByLabelText("Save quote draft"));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate).toHaveBeenCalledWith(
      { workspaceType: "commercial" },
      "quote-1",
      expect.objectContaining({
        expectedVersion: 4,
        title: "Edited irrigation",
        status: "draft",
        payload: { quote: expect.any(Object) },
        idempotencyKey: expect.stringMatching(/^business-desk:draft:quote-1:/)
      })
    );
    expect(
      screen.getByLabelText("Preview reviewed quote CSV").props.accessibilityState
        .disabled
    ).toBe(true);
  });
});

describe("quote artifact local outcome wording", () => {
  it("does not claim that a dismissed share was shared or delivered", () => {
    const message = quoteArtifactOutcomeMessage(7, {
      method: "native-share",
      action: "dismissed"
    });

    expect(message).toMatch(/share sheet was dismissed/i);
    expect(message).toMatch(/did not observe a completed share/i);
    expect(message).not.toMatch(/was shared/i);
  });

  it("limits a device shared action to what the device actually observed", () => {
    const message = quoteArtifactOutcomeMessage(8, {
      method: "native-share",
      action: "shared"
    });

    expect(message).toMatch(/device reported a completed local share action/i);
    expect(message).toMatch(/did not observe recipient delivery or acceptance/i);
  });
});
