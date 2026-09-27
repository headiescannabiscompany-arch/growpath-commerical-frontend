import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import StoreIndex, { createStyles } from "@/app/store";

const mockPush = jest.fn();
const mockSetParams = jest.fn();
const mockSearchPublicStorefronts = jest.fn();
const mockRequestCurrentCoordinates = jest.fn();
const mockLinkHrefs: string[] = [];
let mockParams: Record<string, string> = {};
let mockMode = "personal";

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children, href }: any) => {
      mockLinkHrefs.push(String(href));
      return React.createElement(React.Fragment, null, children);
    },
    useLocalSearchParams: () => mockParams,
    useRouter: () => ({ push: mockPush, setParams: mockSetParams })
  };
});

jest.mock("@/api/storefront", () => ({
  searchPublicStorefronts: (...args: any[]) => mockSearchPublicStorefronts(...args)
}));

jest.mock("@/utils/locationSearch", () => ({
  requestCurrentCoordinates: (...args: any[]) => mockRequestCurrentCoordinates(...args)
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ mode: mockMode })
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
    mockSetParams.mockReset();
    mockSearchPublicStorefronts.mockReset();
    mockRequestCurrentCoordinates.mockReset();
    mockLinkHrefs.length = 0;
    mockSearchPublicStorefronts.mockResolvedValue({
      storefronts: [
        {
          name: "Living Soil Labs",
          linkedStorefrontSlug: "living-soil-labs",
          description: "Soil and nutrient products."
        }
      ]
    });
    mockParams = {};
    mockMode = "personal";
    mockRequestCurrentCoordinates.mockResolvedValue({
      latitude: 42.3601,
      longitude: -71.0589
    });
  });

  it("uses the active palette for the public directory and search controls", () => {
    const palette = {
      heroText: "#F4F7FB",
      text: "#F4F7FB",
      textMuted: "#C9D4DF",
      surface: "#151D27",
      surfaceMuted: "#1A2330",
      border: "#283545",
      accent: "#78AAFF",
      accentSoft: "#16263A",
      accentText: "#FFFFFF",
      link: "#78AAFF",
      warning: "#E3BE63"
    } as any;

    const styles = createStyles(palette);

    expect(styles.title.color).toBe(palette.heroText);
    expect(styles.cardTitle.color).toBe(palette.text);
    expect(styles.input).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border,
        color: palette.text
      })
    );
    expect(styles.secondaryButton.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.radiusButtonSelected.backgroundColor).toBe(palette.accentSoft);
  });

  it("opens public storefront first and keeps profile secondary from a slug", async () => {
    const screen = render(<StoreIndex />);
    await screen.findByText("Living Soil Labs");

    fireEvent.changeText(screen.getByLabelText("Public brand slug"), "living-soil-labs");
    fireEvent.press(screen.getByText("Open Storefront"));
    fireEvent.press(screen.getByText("Open Profile"));

    expect(mockPush).toHaveBeenNthCalledWith(1, "/store/living-soil-labs");
    expect(mockPush).toHaveBeenNthCalledWith(2, "/brands/living-soil-labs");
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
    expect(screen.getByText("Similar Storefronts")).toBeTruthy();
    expect(screen.getByText("Living Soil Labs")).toBeTruthy();
    expect(screen.getByText("Profile")).toBeTruthy();
    expect(screen.getAllByText("Storefront").length).toBeGreaterThan(0);
    expect(mockLinkHrefs).toContain("/store/living-soil-labs");
    expect(mockLinkHrefs).toContain("/brands/living-soil-labs");
  });

  it("searches public brands by query", async () => {
    const screen = render(<StoreIndex />);
    await screen.findByText("Living Soil Labs");

    fireEvent.changeText(screen.getByLabelText("Search public brands"), "soil");
    fireEvent.press(screen.getByText("Search Storefronts"));

    await waitFor(() =>
      expect(mockSearchPublicStorefronts).toHaveBeenCalledWith({
        q: "soil",
        limit: 12
      })
    );
    expect(screen.getByText("Living Soil Labs")).toBeTruthy();
    expect(mockSetParams).toHaveBeenCalledWith({ q: "soil", similarTo: "" });
  });

  it("searches dispensaries by state without offering GrowPath checkout", async () => {
    mockSearchPublicStorefronts.mockResolvedValueOnce({ storefronts: [] });
    mockSearchPublicStorefronts.mockResolvedValueOnce({
      storefronts: [
        {
          name: "Example Dispensary",
          slug: "example-dispensary",
          storefrontType: "dispensary",
          city: "Boston",
          stateCode: "MA"
        }
      ]
    });
    const screen = render(<StoreIndex />);

    fireEvent.changeText(screen.getByLabelText("Dispensary state"), "ma");
    fireEvent.press(screen.getByText("Search by State"));

    await waitFor(() =>
      expect(mockSearchPublicStorefronts).toHaveBeenCalledWith({
        storefrontType: "dispensary",
        stateCode: "MA",
        latitude: undefined,
        longitude: undefined,
        radiusMiles: undefined,
        limit: 25
      })
    );
    expect(screen.getByText("Example Dispensary")).toBeTruthy();
    expect(screen.getByText("Boston, MA")).toBeTruthy();
    expect(
      screen.getByText("Inventory only · dispensary website or in-store pickup")
    ).toBeTruthy();
    expect(screen.queryByText("Buy")).toBeNull();
    expect(mockLinkHrefs).toContain("/store/example-dispensary");
  });

  it("uses current location for distance-ranked dispensary discovery", async () => {
    mockSearchPublicStorefronts.mockResolvedValueOnce({ storefronts: [] });
    mockSearchPublicStorefronts.mockResolvedValueOnce({
      storefronts: [
        {
          name: "Nearby Dispensary",
          slug: "nearby-dispensary",
          storefrontType: "dispensary",
          distanceMiles: 4.25
        }
      ]
    });
    const screen = render(<StoreIndex />);

    fireEvent.press(screen.getByLabelText("Use my location to find dispensaries"));

    await waitFor(() =>
      expect(mockSearchPublicStorefronts).toHaveBeenCalledWith({
        storefrontType: "dispensary",
        stateCode: undefined,
        latitude: 42.3601,
        longitude: -71.0589,
        radiusMiles: 25,
        limit: 25
      })
    );
    expect(screen.getByText("4.3 miles away")).toBeTruthy();
  });

  it("links commercial storefront management to the canonical commercial workspace", async () => {
    mockMode = "commercial";
    const screen = render(<StoreIndex />);
    await screen.findByText("Living Soil Labs");

    expect(mockLinkHrefs).toContain("/home/commercial/storefront");
    expect(mockLinkHrefs).not.toContain("/storefront");
  });

  it("does not expose owner controls or GrowPath plan offers to personal users", async () => {
    const screen = render(<StoreIndex />);
    await screen.findByText("Living Soil Labs");

    expect(screen.queryByText("Storefront offers")).toBeNull();
    expect(screen.queryByText("View Offers")).toBeNull();
    expect(screen.queryByText("Manage Storefront")).toBeNull();
    expect(mockLinkHrefs).not.toContain("/offers");
    expect(mockLinkHrefs).not.toContain("/home/commercial/storefront");
  });

  it("loads public stores on entry without a query or requesting location", async () => {
    const screen = render(<StoreIndex />);
    await screen.findByText("Living Soil Labs");
    expect(mockSearchPublicStorefronts).toHaveBeenCalledTimes(1);
    expect(mockSearchPublicStorefronts).toHaveBeenCalledWith({
      q: undefined,
      similarTo: undefined,
      limit: 12
    });
    expect(mockRequestCurrentCoordinates).not.toHaveBeenCalled();
    expect(
      screen.getByText("Showing up to 12 public stores. Search to narrow the results.")
    ).toBeTruthy();
  });

  it("restores a URL search and clears it back to public browsing", async () => {
    mockParams = { q: "soil" };
    const screen = render(<StoreIndex />);
    await screen.findByText("Living Soil Labs");
    expect(screen.getByLabelText("Search public brands").props.value).toBe("soil");
    fireEvent.press(screen.getByText("Clear store search"));
    await waitFor(() =>
      expect(mockSearchPublicStorefronts).toHaveBeenLastCalledWith({
        q: undefined,
        similarTo: undefined,
        limit: 12
      })
    );
    expect(mockSetParams).toHaveBeenCalledWith({ q: "", similarTo: "" });
    expect(screen.getByLabelText("Search public brands").props.value).toBe("");
    expect(screen.queryByText("Clear store search")).toBeNull();
  });

  it("supports keyboard search and distinguishes empty results from a failed request", async () => {
    const screen = render(<StoreIndex />);
    await screen.findByText("Living Soil Labs");
    mockSearchPublicStorefronts.mockResolvedValueOnce({ storefronts: [] });
    fireEvent.changeText(screen.getByLabelText("Search public brands"), "missing");
    fireEvent(screen.getByLabelText("Search public brands"), "submitEditing");
    await screen.findByText("No matching public stores found yet.");
    expect(screen.queryByText("Living Soil Labs")).toBeNull();
    mockSearchPublicStorefronts.mockRejectedValueOnce(
      new Error("PRIVATE_TRANSPORT_DETAILS")
    );
    fireEvent.press(screen.getByText("Search Storefronts"));
    await screen.findByText("Stores could not load. Please try again.");
    expect(screen.queryByText("No matching public stores found yet.")).toBeNull();
    expect(screen.queryByText("PRIVATE_TRANSPORT_DETAILS")).toBeNull();
    fireEvent.press(screen.getByText("Retry stores"));
    await screen.findByText("Living Soil Labs");
    expect(screen.queryByText("Retry stores")).toBeNull();
  });

  it("ignores a late response when the route search changes", async () => {
    let resolveOld: (value: any) => void = () => {};
    mockSearchPublicStorefronts.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOld = resolve;
      })
    );
    const screen = render(<StoreIndex />);
    mockParams = { q: "soil" };
    screen.rerender(<StoreIndex />);
    await screen.findByText("Living Soil Labs");
    await act(async () =>
      resolveOld({ storefronts: [{ name: "Stale store", slug: "stale" }] })
    );
    expect(screen.queryByText("Stale store")).toBeNull();
    expect(screen.getByLabelText("Search public brands").props.value).toBe("soil");
  });
});
