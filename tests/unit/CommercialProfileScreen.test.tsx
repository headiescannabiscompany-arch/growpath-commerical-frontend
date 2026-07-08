import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import CommercialProfileScreen from "@/screens/commercial/CommercialProfileScreen";

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    user: {
      email: "brand@growpathai.com",
      business: {
        name: "Living Soil Labs",
        contactEmail: "support@growpathai.com",
        phone: "555-0100"
      }
    }
  })
}));

describe("CommercialProfileScreen", () => {
  it("renders commercial account identity and billing navigation", () => {
    const navigate = jest.fn();
    const screen = render(<CommercialProfileScreen navigation={{ navigate }} />);

    expect(screen.getByText("Commercial Profile")).toBeTruthy();
    expect(screen.getByText("Living Soil Labs")).toBeTruthy();
    expect(screen.getByText("support@growpathai.com")).toBeTruthy();
    expect(screen.getByText("555-0100")).toBeTruthy();

    fireEvent.press(screen.getByText("View Plans and Pricing"));
    fireEvent.press(screen.getByText("Manage Subscription"));

    expect(navigate).toHaveBeenCalledWith("PricingMatrix");
    expect(navigate).toHaveBeenCalledWith("Subscription");
  });
});
