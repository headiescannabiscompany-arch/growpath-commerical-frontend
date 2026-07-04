import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import CommercialToolsScreen from "@/screens/commercial/CommercialToolsScreen";

describe("CommercialToolsScreen", () => {
  it("routes marketing work to Marketing Planner instead of fake advertising", () => {
    const navigate = jest.fn();
    const screen = render(<CommercialToolsScreen navigation={{ navigate }} />);

    expect(screen.getByText("Marketing Planner")).toBeTruthy();
    expect(screen.queryByText("Advertising")).toBeNull();

    fireEvent.press(screen.getByText("Marketing Planner"));

    expect(navigate).toHaveBeenCalledWith("MarketingPlanner");
  });
});
