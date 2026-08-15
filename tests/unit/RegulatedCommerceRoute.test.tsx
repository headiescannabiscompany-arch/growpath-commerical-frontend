import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import RegulatedCommerceRoute from "@/app/home/commercial/regulated-commerce";

const mockFetch = jest.fn();
const mockSubmit = jest.fn();

jest.mock("@/api/regulatedCommerce", () => ({
  fetchRegulatedCommerce: (...args: any[]) => mockFetch(...args),
  submitRegulatedAuthorization: (...args: any[]) => mockSubmit(...args)
}));

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return function MockAppPage({ children, header, showBack, backFallbackHref }: any) {
    return React.createElement(
      View,
      null,
      header,
      showBack ? React.createElement(Text, null, `Back ${backFallbackHref}`) : null,
      children
    );
  };
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return function MockAppCard({ children, title, subtitle }: any) {
    return React.createElement(
      View,
      null,
      React.createElement(Text, null, title),
      React.createElement(Text, null, subtitle),
      children
    );
  };
});

describe("Regulated commerce route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      storefront: { id: "store-1", name: "Living Soil Labs", slug: "living-soil-labs" },
      businessRoles: ["nursery", "cultivator", "retailer"],
      productClasses: ["hemp_seed", "cannabis_seed"],
      authorizations: [],
      decisions: [],
      policy: "regulated-commerce-v1"
    });
    mockSubmit.mockResolvedValue({
      message: "Authorization submitted for review. No sales capability was enabled."
    });
  });

  it("keeps informational presence separate from transaction permission", async () => {
    const screen = render(<RegulatedCommerceRoute />);

    expect(await screen.findByText("Regulated commerce")).toBeTruthy();
    expect(screen.getByText(/paid plan or business label never proves/i)).toBeTruthy();
    expect(screen.getByText(/does not enable checkout/i)).toBeTruthy();
    expect(screen.getByText("Back /home/commercial/storefront")).toBeTruthy();
  });

  it("submits a multi-role, product-specific authorization for review", async () => {
    const screen = render(<RegulatedCommerceRoute />);

    await screen.findByText("Business authorization evidence");
    fireEvent.press(screen.getByLabelText("Nursery"));
    fireEvent.press(screen.getByLabelText("Cultivator / grower"));
    fireEvent.press(screen.getByLabelText("Cannabis seed"));
    fireEvent.changeText(screen.getByLabelText("Country code"), "US");
    fireEvent.changeText(screen.getByLabelText("State / province code"), "MA");
    fireEvent.changeText(
      screen.getByLabelText("Authorization type"),
      "Cannabis establishment license"
    );
    fireEvent.changeText(screen.getByLabelText("Authorization identifier"), "LIC-123");
    fireEvent.changeText(screen.getByLabelText("Issuing authority"), "Massachusetts CCC");
    fireEvent.press(screen.getByLabelText("Submit business authorization for review"));

    await waitFor(() =>
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          businessRoles: ["nursery", "cultivator"],
          productClasses: ["cannabis_seed"],
          jurisdiction: expect.objectContaining({
            countryCode: "US",
            subdivisionCode: "MA"
          }),
          authorizationIdentifier: "LIC-123"
        })
      )
    );
    expect(
      screen.getByText(
        "Authorization submitted for review. No sales capability was enabled."
      )
    ).toBeTruthy();
  });
});
