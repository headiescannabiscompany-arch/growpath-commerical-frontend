import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import QuoteEstimateTool, {
  quoteArtifactOutcomeMessage
} from "@/features/businessDesk/QuoteEstimateTool";

const mockCalculate = jest.fn();
const mockCreate = jest.fn();
const mockExport = jest.fn();
const mockList = jest.fn();
const mockPrepare = jest.fn();
const mockRevisions = jest.fn();
const mockUpdate = jest.fn();

jest.mock("@/api/businessDesk", () => ({
  calculateBusinessDesk: (...args: any[]) => mockCalculate(...args),
  createBusinessDeskRecord: (...args: any[]) => mockCreate(...args),
  listBusinessDeskRecords: (...args: any[]) => mockList(...args),
  listBusinessDeskRevisions: (...args: any[]) => mockRevisions(...args),
  prepareBusinessDeskQuoteArtifact: (...args: any[]) => mockPrepare(...args),
  updateBusinessDeskRecord: (...args: any[]) => mockUpdate(...args)
}));

jest.mock("@/utils/exportToCsv", () => ({
  exportCsvContent: (...args: any[]) => mockExport(...args)
}));

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ header, children }: any) => React.createElement(View, null, header, children);
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return ({ title, subtitle, children }: any) =>
    React.createElement(
      View,
      null,
      title ? React.createElement(Text, null, title) : null,
      subtitle ? React.createElement(Text, null, subtitle) : null,
      children
    );
});

jest.mock("@/components/forms/CalendarDateField", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return ({ accessibilityLabel, onChange }: any) =>
    React.createElement(
      Pressable,
      { accessibilityLabel, onPress: () => onChange("2026-09-30") },
      React.createElement(Text, null, "Choose expiration")
    );
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

describe("QuoteEstimateTool", () => {
  beforeEach(() => {
    mockCalculate.mockReset();
    mockCreate.mockReset();
    mockExport.mockReset().mockResolvedValue({
      ok: true,
      filename: "quote",
      rowCount: 0,
      method: "web-download"
    });
    mockList.mockReset().mockResolvedValue([]);
    mockPrepare.mockReset();
    mockRevisions.mockReset().mockResolvedValue([]);
    mockUpdate.mockReset();
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
    expect(screen.getByLabelText("Copy reviewed quote").props.accessibilityState).toEqual(
      { disabled: false }
    );
    expect(
      screen.getByLabelText("Payment provider draft handoff unavailable").props
        .accessibilityState
    ).toEqual({ disabled: true });
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
    mockPrepare.mockResolvedValue({
      mode: "csv",
      contentType: "text/csv; charset=utf-8",
      filename: "Q-100.csv",
      content: '"section","field"\r\n',
      preparedFromVersion: 4,
      checksumSha256: "a".repeat(64),
      deliveryStatus: "not_observed"
    });
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
    fireEvent.press(screen.getByLabelText("Export reviewed quote"));

    await waitFor(() => expect(mockPrepare).toHaveBeenCalledTimes(1));
    expect(mockPrepare).toHaveBeenCalledWith(
      { workspaceType: "facility", facilityId: "facility-1" },
      "quote-1",
      expect.objectContaining({
        expectedVersion: 4,
        mode: "csv",
        idempotencyKey: expect.stringMatching(/^business-desk:prepare-csv:quote-1:/)
      })
    );
    expect(mockExport).toHaveBeenCalledWith("Q-100.csv", '"section","field"\r\n');
    expect(
      await screen.findByText(
        /Reviewed revision 4 was prepared.*local CSV download was started/i
      )
    ).toBeTruthy();
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
    mockPrepare.mockResolvedValue({
      mode: "csv",
      contentType: "text/csv; charset=utf-8",
      filename: "Q-100.csv",
      content: '"section","field"\r\n',
      preparedFromVersion: 4,
      checksumSha256: "a".repeat(64),
      deliveryStatus: "not_observed"
    });
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
      screen.getByLabelText("Export reviewed quote").props.accessibilityState
    ).toEqual({ disabled: false });
    fireEvent.press(screen.getByLabelText("Export reviewed quote"));
    await waitFor(() => expect(mockPrepare).toHaveBeenCalledTimes(1));
    expect(mockPrepare.mock.calls[0][2]).toEqual(
      expect.objectContaining({ expectedVersion: 4, mode: "csv" })
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
      screen.getByLabelText("Export reviewed quote").props.accessibilityState.disabled
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
