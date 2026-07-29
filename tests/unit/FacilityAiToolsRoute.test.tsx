import React from "react";
import { render } from "@testing-library/react-native";

import FacilityAiToolsRoute from "@/app/home/facility/(tabs)/ai-tools";

const mockTokenBalanceWidget = jest.fn((_props: any) => null);

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
    useRouter: () => ({ replace: jest.fn() })
  };
});

describe("FacilityAiToolsRoute", () => {
  it("consolidates the legacy second AI page into the command center", () => {
    const screen = render(<FacilityAiToolsRoute />);
    expect(screen.getByText("Facility Grow Intelligence")).toBeTruthy();
    expect(screen.getByText("Ask AI")).toBeTruthy();
    expect(screen.getByText("Tool Library")).toBeTruthy();
    expect(mockTokenBalanceWidget).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceType: "facility",
        facilityId: "facility-headies",
        workspaceName: "Headies Facility"
      })
    );
  });
});
