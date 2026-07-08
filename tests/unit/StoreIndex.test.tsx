import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import StoreIndex from "@/app/store";

const mockPush = jest.fn();
const mockSearchPublicStorefronts = jest.fn();
const mockLinkHrefs: string[] = [];
let mockParams: Record<string, string> = {};

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children, href }: any) => {
      mockLinkHrefs.push(String(href));
      return React.createElement(React.Fragment, null, children);
    },
    useLocalSearchParams: () => mockParams,
    useRouter: () => ({ push: mockPush })
  };
});

jest.mock("@/api/storefront", () => ({
  searchPublicStorefronts: (...args: any[]) => mockSearchPublicStorefronts(...args)
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

describe("StoreIndex", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockSearchPublicStorefronts.mockReset();
    mockLinkHrefs.length = 0;
    mockSearchPublicStorefronts.mockResolvedValue({
      storefronts: [
        {
          name: "Living Soil Labs",
          slug: "living-soil-labs",
          description: "Soil and nutrient products."
        }
      ]
    });
    mockParams = {};
  });

  it("opens public brand profile and storefront from a slug", () => {
    const screen = render(<StoreIndex />);

    fireEvent.changeText(screen.getByLabelText("Public brand slug"), "living-soil-labs");
    fireEvent.press(screen.getByText("Open Profile"));
    fireEvent.press(screen.getByText("Open Store"));

    expect(mockPush).toHaveBeenNthCalledWith(1, "/brands/living-soil-labs");
    expect(mockPush).toHaveBeenNthCalledWith(2, "/store/living-soil-labs");
  });

  it("loads similar public brands from a storefront context", async () => {
    mockParams = { similarTo: "triple-bag-genetics" };
    const screen = render(<StoreIndex />);

    await waitFor(() =>
      expect(mockSearchPublicStorefronts).toHaveBeenCalledWith({
        similarTo: "triple-bag-genetics",
        limit: 12
      })
    );
    expect(screen.getByText("Similar Brands")).toBeTruthy();
    expect(screen.getByText("Living Soil Labs")).toBeTruthy();
    expect(screen.getByText("Profile")).toBeTruthy();
    expect(screen.getAllByText("Store").length).toBeGreaterThan(0);
  });

  it("searches public brands by query", async () => {
    const screen = render(<StoreIndex />);

    fireEvent.changeText(screen.getByLabelText("Search public brands"), "soil");
    fireEvent.press(screen.getByText("Search Brands"));

    await waitFor(() =>
      expect(mockSearchPublicStorefronts).toHaveBeenCalledWith({
        q: "soil",
        limit: 12
      })
    );
    expect(screen.getByText("Living Soil Labs")).toBeTruthy();
  });

  it("links commercial storefront management to the canonical commercial workspace", () => {
    render(<StoreIndex />);

    expect(mockLinkHrefs).toContain("/home/commercial/storefront");
    expect(mockLinkHrefs).not.toContain("/storefront");
  });
});
