import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityAiToolsRoute, {
  FACILITY_CORE_TOOLS,
  FACILITY_CANNABIS_TOOLS,
  FACILITY_RECORD_TOOLS,
  facilityToolHref
} from "@/app/home/facility/(tabs)/ai-tools";

const mockTokenBalanceWidget = jest.fn((_props: any) => null);
const mockPush = jest.fn();
const mockListGrows = jest.fn();

jest.mock("@/api/grows", () => ({
  listGrows: (...args: any[]) => mockListGrows(...args)
}));

jest.mock(
  "@/components/TokenBalanceWidget",
  () => (props: any) => mockTokenBalanceWidget(props)
);

jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({
    selectedId: "facility-headies",
    selected: { id: "facility-headies", name: "Headies Facility" }
  })
}));

jest.mock("expo-router", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Redirect: ({ href }: any) => React.createElement(Text, null, String(href)),
    useLocalSearchParams: () => ({ toolRunId: "toolrun-1" }),
    useRouter: () => ({ push: mockPush, replace: jest.fn() })
  };
});

describe("FacilityAiToolsRoute", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockTokenBalanceWidget.mockClear();
    mockListGrows.mockReset();
    mockListGrows.mockResolvedValue([]);
  });

  it("shows cannabis-specific tools only when a structured Facility grow is eligible", async () => {
    mockListGrows.mockResolvedValue([
      { id: "grow-1", cropTypes: ["Cannabis"], growInterests: { crops: ["Cannabis"] } }
    ]);
    const screen = render(<FacilityAiToolsRoute />);

    await waitFor(() =>
      expect(screen.getByText("Cannabis grow intelligence")).toBeTruthy()
    );
    for (const item of FACILITY_CANNABIS_TOOLS) {
      expect(screen.getByText(item.title)).toBeTruthy();
      expect(screen.getByRole("button", { name: item.actionLabel })).toBeTruthy();
    }
    expect(mockListGrows).toHaveBeenCalledWith("facility-headies");
  });

  it("consolidates the legacy second AI page into the command center", () => {
    const screen = render(<FacilityAiToolsRoute />);
    expect(
      screen.getByRole("header", { name: "Facility Grow Intelligence" }).props[
        "aria-level"
      ]
    ).toBe(1);
    expect(screen.getByText("Ask AI")).toBeTruthy();
    expect(screen.getByRole("header", { name: "Tool Library" }).props["aria-level"]).toBe(
      2
    );
    expect(screen.getByRole("button", { name: "Open Ask AI" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Open Nutrient Mix Builder" })
    ).toBeTruthy();
    expect(mockTokenBalanceWidget).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceType: "facility",
        facilityId: "facility-headies",
        workspaceName: "Headies Facility"
      })
    );
  });

  it("shows the selected Facility as balance owner and keeps cannabis tools contextual", () => {
    const screen = render(<FacilityAiToolsRoute />);

    expect(screen.getByText("Selected Facility boundary")).toBeTruthy();
    expect(screen.getByText(/Headies Facility owns the balance above/i)).toBeTruthy();
    expect(screen.getByText("Shared grow intelligence")).toBeTruthy();
    expect(screen.getByText("Facility records and operations")).toBeTruthy();

    const allItems = [...FACILITY_CORE_TOOLS, ...FACILITY_RECORD_TOOLS];
    for (const item of allItems) {
      expect(screen.getByText(item.title)).toBeTruthy();
      expect(screen.getByRole("button", { name: item.actionLabel })).toBeTruthy();
      expect(item.href).toMatch(/^\/home\/facility\//);
    }

    const discoveryText = allItems
      .map((item) => `${item.title} ${item.description}`)
      .join(" ");
    expect(discoveryText).not.toMatch(/harvest|trichome|dry \/ cure|pheno|genetics/i);
  });

  it("carries the selected Facility into shared calculator and library routes", () => {
    const screen = render(<FacilityAiToolsRoute />);

    fireEvent.press(screen.getByRole("button", { name: "Open Environment Review" }));
    expect(mockPush).toHaveBeenLastCalledWith(
      "/home/facility/tools/environment?workspace=facility&facilityId=facility-headies"
    );

    fireEvent.press(screen.getByRole("button", { name: "Open Nutrient Mix Builder" }));
    expect(mockPush).toHaveBeenLastCalledWith(
      "/home/facility/tools/npk?workspace=facility&facilityId=facility-headies"
    );
  });

  it("does not invent a Facility identifier when none is selected", () => {
    expect(facilityToolHref("/home/facility/tools/npk", "")).toBe(
      "/home/facility/tools/npk?workspace=facility"
    );
    expect(facilityToolHref("/home/facility/reports", "facility-headies")).toBe(
      "/home/facility/reports"
    );
  });
});
