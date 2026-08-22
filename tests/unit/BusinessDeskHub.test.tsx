import React from "react";
import { render } from "@testing-library/react-native";

import BusinessDeskHub, {
  BUSINESS_DESK_TOOLS
} from "@/features/businessDesk/BusinessDeskHub";
import {
  BUSINESS_DESK_DETERMINISTIC_ROUTE_SUFFIXES,
  BUSINESS_DESK_PROVIDER_ROUTE_SUFFIXES
} from "@/navigation/businessDeskRoutes";

let mockLastBackFallback: string | undefined;

jest.mock("expo-router", () => ({
  Link: ({ children }: any) => children,
  useRouter: () => ({ back: jest.fn(), canGoBack: () => false, replace: jest.fn() })
}));

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  function MockAppPage(props: any) {
    mockLastBackFallback = props.backFallbackHref;
    return React.createElement(View, null, props.header, props.children);
  }
  return MockAppPage;
});

describe("Business Desk hub", () => {
  beforeEach(() => {
    mockLastBackFallback = undefined;
  });

  it("keeps the canonical launch set at exactly eight ordered tools", () => {
    expect(BUSINESS_DESK_TOOLS.map((tool) => tool.id)).toEqual([
      "price-margin-break-even",
      "quote-estimate",
      "lead-follow-up",
      "job-notes",
      "expense-receipt",
      "vendor-compare",
      "cash-flow-snapshot",
      "business-ask-ai"
    ]);
  });

  it("links all seven deterministic tools and the capability-gated provider tool", () => {
    const screen = render(
      <BusinessDeskHub
        basePath="/home/commercial/business-desk"
        workspaceLabel="Commercial"
      />
    );

    expect(screen.getByRole("header", { name: "Business Desk" })).toBeTruthy();
    expect(screen.getByLabelText("Open Price & Margin")).toBeTruthy();
    expect(screen.getByLabelText("Open Quote / Estimate")).toBeTruthy();
    expect(screen.getByLabelText("Open Lead Follow-up")).toBeTruthy();
    expect(screen.getByLabelText("Open Job Notes")).toBeTruthy();
    expect(screen.getByLabelText("Open Expense / Receipt Helper")).toBeTruthy();
    expect(screen.getByLabelText("Open Vendor Compare")).toBeTruthy();
    expect(screen.getByLabelText("Open Cash-Flow Snapshot")).toBeTruthy();
    expect(screen.getByLabelText("Open Business Ask AI")).toBeTruthy();
    expect(screen.getAllByText("Open workspace")).toHaveLength(8);
    expect(screen.queryByText("In the current construction sequence")).toBeNull();
    expect(
      screen.getByText(/Provider handoff is shown only when configured/i)
    ).toBeTruthy();
    expect(
      screen.getByText(/Extraction appears only after provider and scanner checks/i)
    ).toBeTruthy();
    expect(
      screen.getByText(/workspace capability check confirms availability/i)
    ).toBeTruthy();
  });

  it("keeps every deterministic card path aligned to the registered route manifest", () => {
    expect(
      BUSINESS_DESK_TOOLS.filter((tool) => tool.availability === "available")
        .filter((tool) => tool.engine !== "assistant")
        .map((tool) => tool.path)
    ).toEqual([...BUSINESS_DESK_DETERMINISTIC_ROUTE_SUFFIXES]);
    expect(
      BUSINESS_DESK_TOOLS.filter((tool) => tool.engine === "assistant").map(
        (tool) => tool.path
      )
    ).toEqual([BUSINESS_DESK_PROVIDER_ROUTE_SUFFIXES[0]]);
  });

  it("returns each hub to the active workspace's narrow-navigation More page", () => {
    const commercial = render(
      <BusinessDeskHub
        basePath="/home/commercial/business-desk"
        workspaceLabel="Commercial"
      />
    );
    expect(mockLastBackFallback).toBe("/home/commercial/more");
    commercial.unmount();

    render(
      <BusinessDeskHub
        basePath="/home/facility/business-desk"
        workspaceLabel="Facility"
      />
    );
    expect(mockLastBackFallback).toBe("/home/facility/more");
  });
});
