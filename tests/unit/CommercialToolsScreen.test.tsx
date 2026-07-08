import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import CommercialToolsScreen from "@/screens/commercial/CommercialToolsScreen";

describe("CommercialToolsScreen", () => {
  it("routes marketing work to Marketing Planner instead of fake advertising", () => {
    const navigate = jest.fn();
    const screen = render(<CommercialToolsScreen navigation={{ navigate }} />);

    expect(screen.getByText("Marketing Planner")).toBeTruthy();
    expect(screen.getByText("Storefront Offers")).toBeTruthy();
    expect(screen.getByText("Feed / Campaigns")).toBeTruthy();
    expect(screen.queryByText("Advertising")).toBeNull();
    expect(screen.queryByText("Marketplace")).toBeNull();
    expect(screen.queryByText("Marketplace Integrations")).toBeNull();

    fireEvent.press(screen.getByText("Storefront Offers"));
    fireEvent.press(screen.getByText("Marketing Planner"));
    fireEvent.press(screen.getByText("Feed / Campaigns"));

    expect(navigate).toHaveBeenCalledWith("Storefront");
    expect(navigate).toHaveBeenCalledWith("MarketingPlanner");
    expect(navigate).toHaveBeenCalledWith("Feed");
    expect(navigate).not.toHaveBeenCalledWith("Marketplace");
    expect(navigate).not.toHaveBeenCalledWith("MarketplaceIntegration");
  });
});
