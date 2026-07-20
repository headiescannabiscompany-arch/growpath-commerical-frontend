import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import CommercialToolsIndex from "@/app/home/commercial/tools";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush })
}));

jest.mock("@/components/TokenBalanceWidget", () => {
  const React = require("react");
  const { View } = require("react-native");
  return () => React.createElement(View, { testID: "token-balance" });
});

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children, header }: any) => React.createElement(View, null, header, children);
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children, ...props }: any) => React.createElement(View, props, children);
});

describe("CommercialToolsIndex", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it("surfaces the soil and nutrient batch planner only through Commercial", () => {
    const screen = render(<CommercialToolsIndex />);

    expect(screen.getByText("Soil & Nutrient Batch Planner")).toBeTruthy();
    expect(
      screen.getByText(
        "Estimate production batch costs, bag counts, pull sheets, labor, packaging, and margin."
      )
    ).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Open Soil & Nutrient Batch Planner"));

    expect(mockPush).toHaveBeenCalledWith("/home/commercial/tools/soil-nutrient-batch");
  });
});
