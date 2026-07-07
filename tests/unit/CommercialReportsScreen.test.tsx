import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import CommercialReportsScreen from "@/screens/commercial/CommercialReportsScreen";

describe("CommercialReportsScreen", () => {
  it("shows product-trial analytics without vendor-order framing", () => {
    const navigate = jest.fn();
    const screen = render(<CommercialReportsScreen navigation={{ navigate }} />);

    expect(screen.getByText("Reports & Analytics")).toBeTruthy();
    expect(screen.getByText("Product trial outcomes")).toBeTruthy();
    expect(screen.getByText("Storefront and product activity")).toBeTruthy();
    expect(screen.getByText("Feed, course, and forum outcomes")).toBeTruthy();
    expect(screen.getByText("Orders / external tracking")).toBeTruthy();
    expect(screen.queryByText("Vendor Analytics")).toBeNull();
    expect(screen.queryByText("Recent Orders")).toBeNull();

    fireEvent.press(screen.getByText("Open Product Trials"));

    expect(navigate).toHaveBeenCalledWith("CommercialProductTrials");
  });
});
