import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CommercialProfileRoute from "@/app/home/commercial/profile";

const mockApiRequest = jest.fn();

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children }: any) => React.createElement(React.Fragment, null, children)
  };
});

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    user: { email: "brand@example.com" }
  })
}));

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/components/InlineError", () => ({
  InlineError: () => null
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({
    ready: true,
    plan: "commercial",
    mode: "commercial"
  })
}));

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children, header }: any) => React.createElement(View, null, header, children);
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children }: any) => React.createElement(View, null, children);
});

describe("CommercialProfileRoute", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockApiRequest.mockImplementation((path: string, options?: any) => {
      if (path === "/api/commercial/storefront" && !options) {
        return Promise.resolve({
          storefront: {
            id: "storefront-1",
            businessName: "Living Soil Labs",
            name: "Living Soil Labs",
            slug: "living-soil-labs",
            accountType: "soil_nutrient_brand",
            bio: "Purpose-built soil and nutrient lines",
            websiteUrl: "https://example.com",
            supportEmail: "support@growpathai.com",
            socialLinks: ["https://instagram.com/livingsoil"],
            forumDisplayName: "Living Soil Support",
            storefrontStatus: "published",
            status: "published"
          }
        });
      }
      if (path === "/api/commercial/storefront" && options?.method === "PATCH") {
        return Promise.resolve({ storefront: { id: "storefront-1", ...options.body } });
      }
      return Promise.resolve({});
    });
  });

  it("separates brand identity from account controls", async () => {
    const screen = render(<CommercialProfileRoute />);

    expect(screen.getByText("Brand Profile & Billing")).toBeTruthy();
    expect(screen.getByText("Brand identity checklist")).toBeTruthy();
    expect(screen.getByText("Public storefront discovery")).toBeTruthy();
    expect(screen.getByText("Brand support and education")).toBeTruthy();
    expect(screen.getByText("Billing and account controls")).toBeTruthy();
    expect(screen.getByText("Public storefront: /store/:slug")).toBeTruthy();
    expect(screen.getByText("Legacy brand profile: /brands/:slug")).toBeTruthy();
    expect(
      screen.getByText("Public product detail: /store/:slug/products/:productId")
    ).toBeTruthy();
    expect(screen.getByText("Public storefront alias: /storefront/:slug")).toBeTruthy();
    expect(
      screen.getByText("Public product alias: /storefront/:slug/products/:productId")
    ).toBeTruthy();
    expect(screen.getByText("Switch Workspace")).toBeTruthy();
    expect(screen.getByText("Open Account Profile")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("Living Soil Labs")).toBeTruthy());
    expect(screen.getByDisplayValue("support@growpathai.com")).toBeTruthy();
    expect(screen.getByText("Public storefront: /store/living-soil-labs")).toBeTruthy();
    expect(
      screen.getByText("Legacy brand profile: /brands/living-soil-labs")
    ).toBeTruthy();

    fireEvent.changeText(
      screen.getByLabelText("Commercial brand name"),
      "Triple Bag Genetics"
    );
    fireEvent.changeText(screen.getByLabelText("Commercial public slug"), "triple-bag");
    fireEvent.changeText(screen.getByLabelText("Commercial brand type"), "breeder");
    fireEvent.changeText(
      screen.getByLabelText("Commercial storefront visibility"),
      "published"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial website URL"),
      "https://triple.example"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial support email"),
      "help@triple.example"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial forum display name"),
      "Triple Bag Support"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial external links"),
      "https://instagram.com/triple, https://youtube.com/triple"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial public bio"),
      "Seed line and evidence run support"
    );
    fireEvent.press(screen.getByLabelText("Save commercial brand profile"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/commercial/storefront",
        expect.objectContaining({
          method: "PATCH",
          body: expect.objectContaining({
            name: "Triple Bag Genetics",
            businessName: "Triple Bag Genetics",
            slug: "triple-bag",
            accountType: "breeder",
            bio: "Seed line and evidence run support",
            websiteUrl: "https://triple.example",
            supportEmail: "help@triple.example",
            forumDisplayName: "Triple Bag Support",
            storefrontStatus: "published",
            status: "published",
            socialLinks: ["https://instagram.com/triple", "https://youtube.com/triple"]
          })
        })
      )
    );
  });
});
