import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import PriceMarginTool from "@/features/businessDesk/PriceMarginTool";

const mockCalculate = jest.fn();
const mockListRecords = jest.fn();
const mockCreateRecord = jest.fn();
const mockUpdateRecord = jest.fn();
const mockArchiveRecord = jest.fn();

jest.mock("@/api/businessDesk", () => ({
  archiveBusinessDeskRecord: (...args: any[]) => mockArchiveRecord(...args),
  businessDeskWorkspaceKey: (workspace: any) =>
    workspace.workspaceType === "facility"
      ? `facility:${workspace.facilityId}`
      : "commercial",
  calculateBusinessDesk: (...args: any[]) => mockCalculate(...args),
  createBusinessDeskRecord: (...args: any[]) => mockCreateRecord(...args),
  listBusinessDeskRecords: (...args: any[]) => mockListRecords(...args),
  updateBusinessDeskRecord: (...args: any[]) => mockUpdateRecord(...args)
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

function result(overrides: Record<string, unknown> = {}) {
  return {
    calculator: "price_margin",
    currency: "USD",
    minorUnitDigits: 2,
    quantityScale: 1_000_000,
    basisPointScale: 10_000,
    totals: {
      quantityMicros: 2_000_000,
      unitPriceMinor: 2500,
      lineRevenueMinor: 5000,
      discount: {
        order: "percent_then_fixed",
        percentBasisPoints: 1000,
        fixedMinor: 0,
        percentMinor: 500,
        totalMinor: 500,
        discountedSubtotalMinor: 4500
      },
      customerShippingMinor: 500,
      tax: { type: "none", amountMinor: 0 },
      customerRevenueBeforeTaxMinor: 5000,
      totalMinor: 5000,
      unitDirectCostMinor: 1000,
      directCostMinor: 2000,
      businessFeesMinor: 100,
      shippingCostMinor: 300,
      knownCostMinor: 2400,
      grossProfitMinor: 2600,
      marginBasisPoints: 5200,
      markupBasisPoints: 10833,
      complete: true,
      incompleteReasons: [],
      ...(overrides.totals || {})
    },
    breakEven: {
      salesScenarios: 4,
      quantityMicros: 8_000_000,
      contributionMinor: 2600,
      revenueMinor: 20_000,
      reason: null,
      ...(overrides.breakEven || {})
    },
    desiredMargin: {
      targetMarginBasisPoints: null,
      desiredUnitPriceMinor: null,
      reason: null,
      ...(overrides.desiredMargin || {})
    }
  };
}

function savedScenario(
  overrides: Partial<{
    id: string;
    title: string;
    status: "draft" | "reviewed";
    version: number;
    currency: string;
    minorUnitDigits: number;
    unitPriceMinor: number;
    totalMinor: number;
    grossProfitMinor: number | null;
    marginBasisPoints: number | null;
    complete: boolean;
    calculatedAt: string;
  }> = {}
) {
  const currency = overrides.currency || "USD";
  const minorUnitDigits = overrides.minorUnitDigits ?? 2;
  const unitPriceMinor = overrides.unitPriceMinor ?? 2500;
  const totalMinor = overrides.totalMinor ?? unitPriceMinor;
  const complete = overrides.complete ?? true;
  return {
    id: overrides.id || "507f191e810c19729de86020",
    kind: "price_margin_scenario",
    title: overrides.title || "Current retail case",
    status: overrides.status || "draft",
    version: overrides.version || 1,
    payload: {
      priceMarginScenario: {
        currency,
        minorUnitDigits,
        quantityMicros: 1_000_000,
        unitPriceMinor,
        unitDirectCostMinor: complete ? 1000 : null,
        discount: {
          order: "percent_then_fixed",
          percentBasisPoints: 0,
          fixedMinor: 0
        },
        customerShippingMinor: 0,
        tax: { type: "none" },
        businessFeesMinor: 0,
        shippingCostMinor: 0,
        fixedCostsMinor: 1000,
        targetMarginBasisPoints: null,
        notes: "Saved assumptions"
      }
    },
    totals: {
      calculator: "price_margin",
      currency,
      minorUnitDigits,
      scenarioQuantityMicros: 1_000_000,
      unitPriceMinor,
      unitDirectCostMinor: complete ? 1000 : null,
      lineRevenueMinor: unitPriceMinor,
      subtotalMinor: unitPriceMinor,
      discountPercentMinor: 0,
      discountFixedAppliedMinor: 0,
      discountMinor: 0,
      discountedSubtotalMinor: unitPriceMinor,
      customerShippingMinor: 0,
      customerRevenueBeforeTaxMinor: unitPriceMinor,
      taxMinor: 0,
      totalMinor,
      directCostMinor: complete ? 1000 : null,
      businessFeesMinor: 0,
      shippingCostMinor: 0,
      knownCostMinor: complete ? 1000 : null,
      grossProfitMinor: overrides.grossProfitMinor ?? (complete ? 1500 : null),
      marginBasisPoints: overrides.marginBasisPoints ?? (complete ? 6000 : null),
      markupBasisPoints: complete ? 15000 : null,
      fixedCostsMinor: 1000,
      contributionMinor: complete ? 1500 : null,
      breakEvenSalesScenarios: complete ? 1 : null,
      breakEvenQuantityMicros: complete ? 1_000_000 : null,
      breakEvenRevenueMinor: complete ? totalMinor : null,
      breakEvenReason: complete ? "" : "DIRECT_COST_UNKNOWN",
      targetMarginBasisPoints: null,
      desiredUnitPriceMinor: null,
      desiredMarginReason: "",
      complete,
      incompleteReasons: complete ? [] : ["DIRECT_COST_UNKNOWN"],
      formulaVersion: "business-desk-money-v1",
      roundingRule: "half_away_from_zero",
      calculatedAt: overrides.calculatedAt || "2026-08-22T12:00:00.000Z",
      inputDigestSha256: "a".repeat(64),
      inputSnapshotJson: JSON.stringify({ currency, minorUnitDigits, unitPriceMinor }),
      missingInputs: complete ? [] : ["DIRECT_COST_UNKNOWN"]
    }
  };
}

describe("PriceMarginTool", () => {
  beforeEach(() => {
    mockCalculate.mockReset();
    mockListRecords.mockReset().mockResolvedValue([]);
    mockCreateRecord.mockReset();
    mockUpdateRecord.mockReset();
    mockArchiveRecord.mockReset();
  });

  it("submits reviewed integer inputs and shows exact-scenario break-even", async () => {
    mockCalculate.mockResolvedValue(
      result({
        desiredMargin: {
          targetMarginBasisPoints: 2500,
          desiredUnitPriceMinor: 1333,
          reason: null
        }
      })
    );
    const screen = render(
      <PriceMarginTool
        workspace={{ workspaceType: "facility", facilityId: "facility-1" }}
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );

    fireEvent.changeText(
      screen.getByLabelText("Price and margin selling price"),
      "25.00"
    );
    fireEvent.changeText(screen.getByLabelText("Price and margin quantity"), "2");
    fireEvent.changeText(
      screen.getByLabelText("Price and margin direct unit cost"),
      "10"
    );
    fireEvent.changeText(
      screen.getByLabelText("Price and margin discount percent"),
      "10"
    );
    fireEvent.changeText(
      screen.getByLabelText("Price and margin customer shipping"),
      "5"
    );
    fireEvent.changeText(screen.getByLabelText("Price and margin business fees"), "1");
    fireEvent.changeText(screen.getByLabelText("Price and margin fulfillment cost"), "3");
    fireEvent.changeText(
      screen.getByLabelText("Price and margin target margin percent"),
      "25"
    );
    fireEvent.press(screen.getByLabelText("Calculate price and margin"));

    await waitFor(() => expect(mockCalculate).toHaveBeenCalledTimes(1));
    expect(mockCalculate).toHaveBeenCalledWith(
      { workspaceType: "facility", facilityId: "facility-1" },
      expect.objectContaining({
        calculator: "price_margin",
        currency: "USD",
        minorUnitDigits: 2,
        unitPriceMinor: 2500,
        quantityMicros: 2_000_000,
        unitDirectCostMinor: 1000,
        customerShippingMinor: 500,
        businessFeesMinor: 100,
        shippingCostMinor: 300,
        targetMarginBasisPoints: 2500,
        discount: expect.objectContaining({ percentBasisPoints: 1000 })
      })
    );
    expect(await screen.findByText("52%")).toBeTruthy();
    expect(screen.getByText("$13.33")).toBeTruthy();
    expect(
      screen.getByText(/This price uses the reviewed direct unit cost only/i)
    ).toBeTruthy();
    expect(screen.getByText("8")).toBeTruthy();
    expect(screen.getByText(/repeats the exact 2-unit sales scenario/i)).toBeTruthy();
    expect(mockCreateRecord).not.toHaveBeenCalled();
    expect(mockUpdateRecord).not.toHaveBeenCalled();
  });

  it("sends an unknown direct cost as null and never presents it as zero", async () => {
    mockCalculate.mockResolvedValue(
      result({
        totals: {
          unitDirectCostMinor: null,
          directCostMinor: null,
          knownCostMinor: null,
          grossProfitMinor: null,
          marginBasisPoints: null,
          markupBasisPoints: null,
          complete: false,
          incompleteReasons: ["DIRECT_COST_UNKNOWN"]
        },
        breakEven: {
          salesScenarios: null,
          quantityMicros: null,
          revenueMinor: null,
          reason: "DIRECT_COST_UNKNOWN"
        },
        desiredMargin: {
          targetMarginBasisPoints: 3000,
          desiredUnitPriceMinor: null,
          reason: "DIRECT_COST_UNKNOWN"
        }
      })
    );
    const screen = render(
      <PriceMarginTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );

    fireEvent.changeText(screen.getByLabelText("Price and margin selling price"), "25");
    fireEvent.changeText(
      screen.getByLabelText("Price and margin target margin percent"),
      "30"
    );
    fireEvent.press(screen.getByLabelText("Calculate price and margin"));

    await waitFor(() => expect(mockCalculate).toHaveBeenCalledTimes(1));
    expect(mockCalculate.mock.calls[0][1].unitDirectCostMinor).toBeNull();
    expect(mockCalculate.mock.calls[0][1].targetMarginBasisPoints).toBe(3000);
    expect(await screen.findByText("Profitability is incomplete")).toBeTruthy();
    expect(screen.getAllByText("Unknown").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Missing direct cost is not treated as zero/i)).toBeTruthy();
    expect(screen.getByText("Desired unit price unavailable")).toBeTruthy();
    expect(
      screen.getByText(
        /Add a reviewed direct unit cost before using a target-margin price/i
      )
    ).toBeTruthy();
  });

  it("rejects a target margin at or above 100 percent", async () => {
    const screen = render(
      <PriceMarginTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );

    fireEvent.changeText(screen.getByLabelText("Price and margin selling price"), "25");
    fireEvent.changeText(
      screen.getByLabelText("Price and margin target margin percent"),
      "100"
    );
    fireEvent.press(screen.getByLabelText("Calculate price and margin"));

    expect(await screen.findByText("Target margin must be less than 100%.")).toBeTruthy();
    expect(mockCalculate).not.toHaveBeenCalled();
  });

  it("omits targetMarginBasisPoints when the optional target is blank", async () => {
    mockCalculate.mockResolvedValue(result());
    const screen = render(
      <PriceMarginTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );

    fireEvent.changeText(screen.getByLabelText("Price and margin selling price"), "25");
    fireEvent.press(screen.getByLabelText("Calculate price and margin"));

    await waitFor(() => expect(mockCalculate).toHaveBeenCalledTimes(1));
    expect(mockCalculate.mock.calls[0][1]).not.toHaveProperty("targetMarginBasisPoints");
    expect(screen.queryByText("Target-margin unit price")).toBeNull();
  });

  it("resets every scenario input and clears the prior result without persisting", async () => {
    mockCalculate.mockResolvedValue(result());
    const screen = render(
      <PriceMarginTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );

    fireEvent.changeText(screen.getByLabelText("Price and margin currency"), "CAD");
    fireEvent.changeText(screen.getByLabelText("Price and margin selling price"), "25");
    fireEvent.changeText(screen.getByLabelText("Price and margin quantity"), "4");
    fireEvent.changeText(
      screen.getByLabelText("Price and margin direct unit cost"),
      "10"
    );
    fireEvent.changeText(
      screen.getByLabelText("Price and margin target margin percent"),
      "25"
    );
    fireEvent.press(screen.getByLabelText("Tax type fixed"));
    fireEvent.changeText(screen.getByLabelText("Price and margin tax amount"), "2");
    fireEvent.press(screen.getByLabelText("Calculate price and margin"));

    await waitFor(() => expect(mockCalculate).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Scenario result")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Reset price and margin scenario"));

    expect(screen.getByLabelText("Price and margin currency").props.value).toBe("USD");
    expect(screen.getByLabelText("Price and margin selling price").props.value).toBe("");
    expect(screen.getByLabelText("Price and margin quantity").props.value).toBe("1");
    expect(screen.getByLabelText("Price and margin direct unit cost").props.value).toBe(
      ""
    );
    expect(
      screen.getByLabelText("Price and margin target margin percent").props.value
    ).toBe("");
    expect(screen.getByLabelText("Tax type none").props.accessibilityState.checked).toBe(
      true
    );
    expect(screen.queryByLabelText("Price and margin tax amount")).toBeNull();
    expect(screen.queryByText("Scenario result")).toBeNull();
    expect(mockCalculate).toHaveBeenCalledTimes(1);
  });

  it("explicitly saves a named exact scenario after calculation", async () => {
    mockCalculate.mockResolvedValue(result());
    const created = savedScenario({ title: "Retail launch", version: 1 });
    mockCreateRecord.mockResolvedValue(created);
    const screen = render(
      <PriceMarginTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );

    await waitFor(() => expect(mockListRecords).toHaveBeenCalledTimes(1));
    fireEvent.changeText(
      screen.getByLabelText("Price and margin scenario name"),
      "Retail launch"
    );
    fireEvent.changeText(screen.getByLabelText("Price and margin selling price"), "25");
    fireEvent.press(screen.getByLabelText("Calculate price and margin"));
    await waitFor(() => expect(mockCalculate).toHaveBeenCalledTimes(1));
    await screen.findByText("Scenario result");
    expect(mockCreateRecord).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText("Save named price and margin scenario"));

    await waitFor(() => expect(mockCreateRecord).toHaveBeenCalledTimes(1));
    expect(mockCreateRecord).toHaveBeenCalledWith(
      { workspaceType: "commercial" },
      expect.objectContaining({
        kind: "price_margin_scenario",
        title: "Retail launch",
        status: "draft",
        idempotencyKey: expect.any(String),
        payload: {
          priceMarginScenario: expect.objectContaining({
            currency: "USD",
            minorUnitDigits: 2,
            quantityMicros: 1_000_000,
            unitPriceMinor: 2500,
            unitDirectCostMinor: null,
            targetMarginBasisPoints: null,
            notes: ""
          })
        }
      })
    );
    expect(await screen.findByText("Scenario saved as draft revision 1.")).toBeTruthy();
    expect(screen.getByText("Named scenario revision 1")).toBeTruthy();
  });

  it("reuses one idempotency key after an ambiguous create failure", async () => {
    mockCalculate.mockResolvedValue(result());
    mockCreateRecord
      .mockRejectedValueOnce(new Error("The network response was ambiguous."))
      .mockResolvedValueOnce(savedScenario({ title: "Retry-safe scenario" }));
    const screen = render(
      <PriceMarginTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );

    fireEvent.changeText(
      screen.getByLabelText("Price and margin scenario name"),
      "Retry-safe scenario"
    );
    fireEvent.changeText(screen.getByLabelText("Price and margin selling price"), "25");
    fireEvent.press(screen.getByLabelText("Calculate price and margin"));
    await waitFor(() => expect(mockCalculate).toHaveBeenCalledTimes(1));
    await screen.findByText("Scenario result");

    fireEvent.press(screen.getByLabelText("Save named price and margin scenario"));
    expect(await screen.findByText("The network response was ambiguous.")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Save named price and margin scenario"));
    await waitFor(() => expect(mockCreateRecord).toHaveBeenCalledTimes(2));

    const firstKey = mockCreateRecord.mock.calls[0][1].idempotencyKey;
    const secondKey = mockCreateRecord.mock.calls[1][1].idempotencyKey;
    expect(firstKey).toBeTruthy();
    expect(secondKey).toBe(firstKey);
    expect(await screen.findByText("Scenario saved as draft revision 1.")).toBeTruthy();
  });

  it("loads all saved scenarios and compares exact values without inventing FX", async () => {
    const usd = savedScenario({
      id: "507f191e810c19729de86020",
      title: "USD retail",
      currency: "USD",
      totalMinor: 2500,
      calculatedAt: "2026-08-22T12:00:00.000Z"
    });
    const cad = savedScenario({
      id: "507f191e810c19729de86021",
      title: "CAD wholesale",
      currency: "CAD",
      totalMinor: 3000,
      complete: false,
      status: "reviewed",
      version: 4,
      calculatedAt: "2026-08-21T10:30:00.000Z"
    });
    mockListRecords.mockResolvedValue([usd, cad]);
    const screen = render(
      <PriceMarginTool
        workspace={{ workspaceType: "facility", facilityId: "facility-1" }}
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );

    expect(await screen.findByText("USD retail")).toBeTruthy();
    expect(screen.getByText("CAD wholesale")).toBeTruthy();
    expect(mockListRecords).toHaveBeenCalledWith(
      { workspaceType: "facility", facilityId: "facility-1" },
      { kind: "price_margin_scenario" },
      expect.objectContaining({ signal: expect.anything() })
    );

    fireEvent.press(
      screen.getByLabelText("Compare price and margin scenario USD retail")
    );
    fireEvent.press(
      screen.getByLabelText("Compare price and margin scenario CAD wholesale")
    );

    expect(
      await screen.findByText(/different currencies or minor-unit precision/i)
    ).toBeTruthy();
    expect(screen.getByText(/No FX rate was inferred/i)).toBeTruthy();
    expect(screen.getAllByText(/Customer total:/)).toHaveLength(2);
    expect(screen.getAllByText(/Calculation freshness:/).length).toBeGreaterThanOrEqual(
      4
    );
    expect(screen.getByText(/Incomplete — DIRECT_COST_UNKNOWN/i)).toBeTruthy();

    fireEvent.press(
      screen.getByLabelText("Open price and margin scenario CAD wholesale")
    );
    expect(screen.getByText("Named scenario revision 4")).toBeTruthy();
    expect(screen.getByLabelText("Price and margin currency").props.value).toBe("CAD");
    expect(screen.getByLabelText("Price and margin selling price").props.value).toBe(
      "25"
    );
    expect(mockCalculate).not.toHaveBeenCalled();
  });

  it("fails closed on mismatched saved totals and labels absent metadata unknown", async () => {
    const invalid = savedScenario({ title: "Mismatched context" });
    invalid.totals.currency = "CAD";
    mockListRecords.mockResolvedValueOnce([invalid]);
    const invalidScreen = render(
      <PriceMarginTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );

    expect(
      await invalidScreen.findByText(
        "The server returned an invalid saved Price & Margin scenario."
      )
    ).toBeTruthy();
    expect(invalidScreen.queryByText("Mismatched context")).toBeNull();
    invalidScreen.unmount();

    const unknownMetadata = savedScenario({
      id: "507f191e810c19729de86029",
      title: "Legacy exact scenario"
    });
    const unknownTotals = unknownMetadata.totals as Partial<
      typeof unknownMetadata.totals
    >;
    delete unknownTotals.formulaVersion;
    delete unknownTotals.roundingRule;
    delete unknownTotals.calculatedAt;
    delete unknownTotals.inputDigestSha256;
    delete unknownTotals.inputSnapshotJson;
    mockListRecords.mockResolvedValueOnce([unknownMetadata]);
    const metadataScreen = render(
      <PriceMarginTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );

    await metadataScreen.findByText("Legacy exact scenario");
    fireEvent.press(
      metadataScreen.getByLabelText(
        "Compare price and margin scenario Legacy exact scenario"
      )
    );
    expect(metadataScreen.getAllByText("Calculation freshness: Unknown").length).toBe(2);
    expect(metadataScreen.getByText("Formula: Unknown · rounding: Unknown")).toBeTruthy();
  });

  it("revises reviewed content to draft and reviews only the exact saved revision", async () => {
    const reviewed = savedScenario({
      title: "Reviewed retail",
      status: "reviewed",
      version: 3
    });
    const draft = savedScenario({ title: "Reviewed retail renamed", version: 4 });
    const rereviewed = savedScenario({
      title: "Reviewed retail renamed",
      status: "reviewed",
      version: 5
    });
    mockListRecords.mockResolvedValue([reviewed]);
    mockUpdateRecord.mockResolvedValueOnce(draft).mockResolvedValueOnce(rereviewed);
    const screen = render(
      <PriceMarginTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );

    await screen.findByText("Reviewed retail");
    fireEvent.press(
      screen.getByLabelText("Open price and margin scenario Reviewed retail")
    );
    fireEvent.changeText(
      screen.getByLabelText("Price and margin scenario name"),
      "Reviewed retail renamed"
    );
    fireEvent.press(screen.getByLabelText("Save named price and margin scenario"));

    await waitFor(() => expect(mockUpdateRecord).toHaveBeenCalledTimes(1));
    expect(mockUpdateRecord).toHaveBeenNthCalledWith(
      1,
      { workspaceType: "commercial" },
      reviewed.id,
      expect.objectContaining({
        expectedVersion: 3,
        title: "Reviewed retail renamed",
        status: "draft",
        payload: expect.any(Object),
        idempotencyKey: expect.any(String)
      })
    );
    expect(
      await screen.findByText(/Reviewed revision 3 remains in history/i)
    ).toBeTruthy();

    fireEvent.press(
      screen.getByLabelText("Review exact saved price and margin scenario")
    );
    await waitFor(() => expect(mockUpdateRecord).toHaveBeenCalledTimes(2));
    expect(mockUpdateRecord).toHaveBeenNthCalledWith(
      2,
      { workspaceType: "commercial" },
      draft.id,
      expect.objectContaining({
        expectedVersion: 4,
        status: "reviewed",
        idempotencyKey: expect.any(String)
      })
    );
    expect(mockUpdateRecord.mock.calls[1][2]).not.toHaveProperty("payload");
    expect(await screen.findByText("Exact revision 5 is now reviewed.")).toBeTruthy();
  });

  it("archives by exact version and blocks a stale selection after refresh", async () => {
    const original = savedScenario({ title: "Seasonal case", version: 2 });
    const newer = savedScenario({ title: "Seasonal case", version: 3 });
    mockListRecords.mockResolvedValueOnce([original]).mockResolvedValueOnce([newer]);
    mockArchiveRecord.mockResolvedValue({
      ...newer,
      archivedAt: "2026-08-22T13:00:00.000Z"
    });
    const screen = render(
      <PriceMarginTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );

    await screen.findByText("Seasonal case");
    fireEvent.press(
      screen.getByLabelText("Open price and margin scenario Seasonal case")
    );
    fireEvent.press(screen.getByLabelText("Refresh saved price and margin scenarios"));

    expect(
      await screen.findByText(/selection is no longer the current saved revision/i)
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Archive selected price and margin scenario").props
        .accessibilityState?.disabled ??
        screen.getByLabelText("Archive selected price and margin scenario").props.disabled
    ).toBe(true);
    expect(mockArchiveRecord).not.toHaveBeenCalled();

    fireEvent.press(
      screen.getByLabelText("Open price and margin scenario Seasonal case")
    );
    fireEvent.changeText(
      screen.getByLabelText("Price and margin archive reason"),
      "Superseded by fall pricing"
    );
    fireEvent.press(screen.getByLabelText("Archive selected price and margin scenario"));

    await waitFor(() => expect(mockArchiveRecord).toHaveBeenCalledTimes(1));
    expect(mockArchiveRecord).toHaveBeenCalledWith(
      { workspaceType: "commercial" },
      newer.id,
      expect.objectContaining({
        expectedVersion: 3,
        reason: "Superseded by fall pricing",
        idempotencyKey: expect.any(String)
      })
    );
    expect(
      await screen.findByText(/was archived; its revision history was preserved/i)
    ).toBeTruthy();
  });

  it("drops selected records immediately when the workspace changes", async () => {
    const first = savedScenario({ title: "North room" });
    const second = savedScenario({
      id: "507f191e810c19729de86021",
      title: "South room"
    });
    mockListRecords.mockImplementation((workspace: any) =>
      Promise.resolve(workspace.facilityId === "facility-1" ? [first] : [second])
    );
    const screen = render(
      <PriceMarginTool
        workspace={{ workspaceType: "facility", facilityId: "facility-1" }}
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );

    await screen.findByText("North room");
    fireEvent.press(screen.getByLabelText("Open price and margin scenario North room"));
    expect(screen.getByText("Named scenario revision 1")).toBeTruthy();

    screen.rerender(
      <PriceMarginTool
        workspace={{ workspaceType: "facility", facilityId: "facility-2" }}
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );

    expect(await screen.findByText("South room")).toBeTruthy();
    expect(screen.queryByText("Named scenario revision 1")).toBeNull();
    expect(screen.getByLabelText("Price and margin scenario name").props.value).toBe("");
    expect(mockUpdateRecord).not.toHaveBeenCalled();
    expect(mockArchiveRecord).not.toHaveBeenCalled();
  });
});
