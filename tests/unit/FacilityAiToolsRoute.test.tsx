import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import FacilityAiToolsRoute, {
  FACILITY_CORE_TOOLS,
  FACILITY_CANNABIS_TOOLS,
  FACILITY_OWNER_QA_TOOLS,
  FACILITY_RECORD_TOOLS,
  facilityToolHref
} from "@/app/home/facility/(tabs)/ai-tools";

const mockTokenBalanceWidget = jest.fn((_props: any) => null);
const mockPush = jest.fn();
let mockEntitlements = {
  facilityRole: "OWNER",
  can: jest.fn(() => true)
};

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { FACILITY_SETTINGS_EDIT: "facility.settings.edit" },
  useEntitlements: () => mockEntitlements
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
    mockEntitlements = {
      facilityRole: "OWNER",
      can: jest.fn(() => true)
    };
  });

  it("shows grow-optional Harvest Readiness from the general Facility hub", () => {
    const screen = render(<FacilityAiToolsRoute />);

    expect(screen.getByText("Harvest intelligence")).toBeTruthy();
    for (const item of FACILITY_CANNABIS_TOOLS) {
      expect(screen.getByText(item.title)).toBeTruthy();
      expect(screen.getByRole("button", { name: item.actionLabel })).toBeTruthy();
    }
    expect(
      screen.getByText(/Harvest Readiness can be reviewed without a grow/i)
    ).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Open Harvest Readiness" }));
    expect(mockPush).toHaveBeenLastCalledWith(
      "/home/facility/tools/harvest-readiness?workspace=facility&facilityId=facility-headies"
    );
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

  it("shows the selected Facility as balance owner and keeps all tools Facility-scoped", () => {
    const screen = render(<FacilityAiToolsRoute />);

    expect(screen.getByText("Selected Facility boundary")).toBeTruthy();
    expect(screen.getByText(/Headies Facility owns the balance above/i)).toBeTruthy();
    expect(screen.getByText("Shared grow intelligence")).toBeTruthy();
    expect(screen.getByText("Facility records and operations")).toBeTruthy();

    const allItems = [
      ...FACILITY_CORE_TOOLS,
      ...FACILITY_CANNABIS_TOOLS,
      ...FACILITY_RECORD_TOOLS
    ];
    for (const item of allItems) {
      expect(screen.getByText(item.title)).toBeTruthy();
      expect(screen.getByRole("button", { name: item.actionLabel })).toBeTruthy();
      expect(item.href).toMatch(/^\/home\/facility\//);
    }
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

    fireEvent.press(screen.getByRole("button", { name: "Open pH / EC Range Check" }));
    expect(mockPush).toHaveBeenLastCalledWith(
      "/home/facility/tools/ph-ec?workspace=facility&facilityId=facility-headies"
    );
  });

  it("surfaces AI templates for Facility users and gates the validation lab entry to a capable owner", () => {
    const ownerScreen = render(<FacilityAiToolsRoute />);

    expect(ownerScreen.getByText("Facility AI Templates")).toBeTruthy();
    fireEvent.press(ownerScreen.getByRole("button", { name: "Open AI Templates" }));
    expect(mockPush).toHaveBeenLastCalledWith("/home/facility/ai-template");

    expect(ownerScreen.getByText("Owner AI quality controls")).toBeTruthy();
    expect(ownerScreen.getByText(FACILITY_OWNER_QA_TOOLS[0].title)).toBeTruthy();
    fireEvent.press(ownerScreen.getByRole("button", { name: "Open AI Validation Lab" }));
    expect(mockPush).toHaveBeenLastCalledWith("/home/facility/ai-validation");

    ownerScreen.unmount();
    mockEntitlements = {
      facilityRole: "STAFF",
      can: jest.fn(() => false)
    };
    const staffScreen = render(<FacilityAiToolsRoute />);
    expect(staffScreen.getByText("Facility AI Templates")).toBeTruthy();
    expect(staffScreen.queryByText("Owner AI quality controls")).toBeNull();
    expect(staffScreen.queryByText("AI Validation Lab")).toBeNull();
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
