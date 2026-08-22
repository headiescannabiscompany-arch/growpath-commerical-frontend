import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import CommercialProfileScreen from "@/screens/commercial/CommercialProfileScreen";

let mockUser: any;

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ user: mockUser })
}));

describe("CommercialProfileScreen", () => {
  beforeEach(() => {
    mockUser = {
      email: "brand@growpathai.com",
      status: "inactive",
      business: {
        name: "Living Soil Labs",
        contactEmail: "support@growpathai.com",
        phone: "555-0100"
      }
    };
  });
  it("renders commercial account identity and billing navigation", () => {
    const navigate = jest.fn();
    const screen = render(<CommercialProfileScreen navigation={{ navigate }} />);

    expect(screen.getByText("Commercial Brand Profile")).toBeTruthy();
    expect(screen.getByText("Brand")).toBeTruthy();
    expect(screen.getByText("Living Soil Labs")).toBeTruthy();
    expect(screen.getByText("support@growpathai.com")).toBeTruthy();
    expect(screen.getByText("555-0100")).toBeTruthy();

    fireEvent.press(screen.getByText("Open Storefront"));
    fireEvent.press(screen.getByText("Manage Subscription"));

    expect(navigate).toHaveBeenCalledWith("Storefront");
    expect(screen.queryByText("View Plans and Pricing")).toBeNull();
    expect(navigate).not.toHaveBeenCalledWith("PricingMatrix");
    expect(navigate).toHaveBeenCalledWith("SubscriptionStatus");
  });

  it("keeps active Commercial access on management instead of plan checkout", () => {
    mockUser = { ...mockUser, plan: "commercial", subscriptionStatus: "active" };
    const screen = render(
      <CommercialProfileScreen navigation={{ navigate: jest.fn() }} />
    );

    expect(screen.queryByText("View Plans and Pricing")).toBeNull();
    expect(screen.getByText("Manage Subscription")).toBeTruthy();
  });
});
