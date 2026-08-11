import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CommercialInventoryCreateRoute from "@/app/home/commercial/inventory/new";

const mockApiRequest = jest.fn();
const mockReplace = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/api/endpoints", () => ({
  endpoints: {
    commercial: {
      inventory: "/api/commercial/inventory",
      products: "/api/commercial/products"
    }
  }
}));

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children, href }: any) =>
      React.cloneElement(React.Children.only(children), { href }),
    useRouter: () => ({
      replace: mockReplace
    })
  };
});

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return ({ children, header, backFallbackHref, routeKey }: any) =>
    React.createElement(
      View,
      { accessibilityLabel: `app-page-${routeKey}` },
      React.createElement(Text, null, `Shared Back ${backFallbackHref}`),
      header,
      children
    );
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children }: any) => React.createElement(View, null, children);
});

describe("CommercialInventoryCreateRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockApiRequest.mockImplementation((path: string, options?: any) => {
      if (path === "/api/commercial/products" && !options) {
        return Promise.resolve({
          products: [{ id: "product-1", name: "Living Soil Base" }]
        });
      }
      if (path === "/api/commercial/grows" && !options) {
        return Promise.resolve({
          grows: [{ id: "grow-1", name: "Bloom Formula Trial" }]
        });
      }
      if (path === "/api/commercial/inventory" && options?.method === "POST") {
        return Promise.resolve({ id: "inventory-1" });
      }
      return Promise.resolve({});
    });
  });

  it("creates commercial inventory with item type, location, and linked records", async () => {
    const screen = render(<CommercialInventoryCreateRoute />);

    expect(screen.getByText("Shared Back /home/commercial/inventory")).toBeTruthy();
    expect(screen.getByText("Create Inventory Support Record")).toBeTruthy();
    expect(screen.getByText("Create Inventory Record")).toBeTruthy();
    expect(screen.getByText(/Commercial inventory support tracks stock/)).toBeTruthy();
    expect(screen.queryByText("Create Support Item")).toBeNull();

    fireEvent.changeText(
      screen.getByLabelText("Commercial inventory item name"),
      "Veg Mix Bag"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial inventory item SKU"),
      "VEG-001"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial inventory item quantity"),
      "12"
    );
    fireEvent.changeText(screen.getByLabelText("Commercial inventory item unit"), "bags");
    fireEvent.changeText(
      screen.getByLabelText("Commercial inventory item reorder point"),
      "4"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial inventory item vendor"),
      "Living Soil Labs"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial inventory item category"),
      "soil"
    );
    fireEvent.press(screen.getByLabelText("Commercial inventory item type: Product"));
    fireEvent.changeText(
      screen.getByLabelText("Commercial inventory item location"),
      "Rack A"
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Linked product: Living Soil Base")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Linked product: Living Soil Base"));
    fireEvent.press(
      screen.getByLabelText("Linked product trial evidence run: Bloom Formula Trial")
    );
    expect(screen.queryByLabelText("Commercial inventory linked product")).toBeNull();
    fireEvent.press(screen.getByLabelText("Show advanced inventory record fields"));
    fireEvent.changeText(
      screen.getByLabelText("Commercial inventory linked ingredient"),
      "ingredient-1"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial inventory linked genetics"),
      "genetics-1"
    );

    fireEvent.press(screen.getByLabelText("Create commercial inventory item"));

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith("/api/commercial/inventory", {
        method: "POST",
        body: expect.objectContaining({
          name: "Veg Mix Bag",
          sku: "VEG-001",
          quantity: 12,
          unit: "bags",
          reorderPoint: 4,
          vendor: "Living Soil Labs",
          category: "soil",
          itemType: "product",
          location: "Rack A",
          linkedProductId: "product-1",
          linkedIngredientId: "ingredient-1",
          linkedGeneticsId: "genetics-1",
          linkedTrialId: "grow-1",
          linkedGrowId: "grow-1"
        })
      });
      expect(mockReplace).toHaveBeenCalledWith("/home/commercial/inventory");
    });
  });

  it("rejects invalid negative stock values without silently changing them to zero", async () => {
    const screen = render(<CommercialInventoryCreateRoute />);
    await waitFor(() =>
      expect(screen.queryByText("Loading saved record choices...")).toBeNull()
    );

    fireEvent.changeText(
      screen.getByLabelText("Commercial inventory item name"),
      "Invalid Stock"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial inventory item quantity"),
      "-2"
    );
    fireEvent.press(screen.getByLabelText("Create commercial inventory item"));

    expect(
      screen.getByText("Quantity must be a number that is zero or greater.")
    ).toBeTruthy();
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(mockApiRequest).not.toHaveBeenCalledWith(
      "/api/commercial/inventory",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("shows create failures in page and preserves the owner's draft", async () => {
    mockApiRequest.mockImplementation((path: string, options?: any) => {
      if (path === "/api/commercial/inventory" && options?.method === "POST") {
        return Promise.reject(new Error("Inventory service unavailable"));
      }
      return Promise.resolve({});
    });
    const screen = render(<CommercialInventoryCreateRoute />);
    await waitFor(() =>
      expect(screen.queryByText("Loading saved record choices...")).toBeNull()
    );

    fireEvent.changeText(
      screen.getByLabelText("Commercial inventory item name"),
      "Retained Draft"
    );
    fireEvent.press(screen.getByLabelText("Create commercial inventory item"));

    await waitFor(() =>
      expect(screen.getByText("Inventory service unavailable")).toBeTruthy()
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByLabelText("Commercial inventory item name").props.value).toBe(
      "Retained Draft"
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("submits once, locks fields, and announces progress while creating", async () => {
    let resolveCreate: ((value: { id: string }) => void) | undefined;
    mockApiRequest.mockImplementation((path: string, options?: any) => {
      if (path === "/api/commercial/inventory" && options?.method === "POST") {
        return new Promise((resolve) => {
          resolveCreate = resolve;
        });
      }
      return Promise.resolve({});
    });
    const screen = render(<CommercialInventoryCreateRoute />);
    await waitFor(() =>
      expect(screen.queryByText("Loading saved record choices...")).toBeNull()
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial inventory item name"),
      "Single Flight"
    );
    const createAction = screen.getByLabelText("Create commercial inventory item");

    fireEvent.press(createAction);
    fireEvent.press(createAction);

    expect(
      mockApiRequest.mock.calls.filter(
        ([path, options]) =>
          path === "/api/commercial/inventory" && options?.method === "POST"
      )
    ).toHaveLength(1);
    expect(
      screen.getByLabelText("Creating Commercial inventory record in progress")
    ).toBeTruthy();
    expect(screen.getByLabelText("Commercial inventory item name").props.editable).toBe(
      false
    );

    resolveCreate?.({ id: "inventory-2" });

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/home/commercial/inventory")
    );
  });
});
