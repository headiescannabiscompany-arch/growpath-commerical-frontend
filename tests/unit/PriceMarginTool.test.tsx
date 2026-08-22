import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import PriceMarginTool from "@/features/businessDesk/PriceMarginTool";

const mockCalculate = jest.fn();

jest.mock("@/api/businessDesk", () => ({
  calculateBusinessDesk: (...args: any[]) => mockCalculate(...args)
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

describe("PriceMarginTool", () => {
  beforeEach(() => mockCalculate.mockReset());

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
});
