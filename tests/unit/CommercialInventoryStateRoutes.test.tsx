import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import CommercialInventoryItemDetailRoute from "@/app/home/commercial/inventory/[id]";
import CommercialInventoryRoute from "@/app/home/commercial/inventory";

const mockApiRequest = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockMapApiError = jest.fn();
const mockRouter = { push: mockPush, replace: mockReplace };

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "inventory-1" }),
  useRouter: () => mockRouter
}));

jest.mock("@react-navigation/native", () => {
  const React = require("react");
  return {
    useFocusEffect: (callback: () => void) => {
      React.useEffect(() => callback(), [callback]);
    }
  };
});

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/hooks/useApiErrorHandler", () => ({
  useApiErrorHandler: () => mockMapApiError
}));

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: {
    COMMERCIAL_INVENTORY_WRITE: "commercial.inventory.write"
  },
  useEntitlements: () => ({
    ready: true,
    mode: "commercial",
    can: () => true
  })
}));

jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    ScreenBoundary: ({ children }: any) => React.createElement(View, null, children)
  };
});

jest.mock("@/components/InlineError", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    InlineError: ({ error }: any) =>
      React.createElement(Text, null, error?.message || String(error || ""))
  };
});

const palette = {
  accent: "#198754",
  accentSoft: "#dff5e8",
  border: "#cad5cf",
  danger: "#b42318",
  link: "#146c43",
  page: "#f7faf8",
  surface: "#ffffff",
  surfaceMuted: "#f0f4f1",
  surfaceStrong: "#e8efea",
  success: "#15803d",
  text: "#17231c",
  textMuted: "#5f6f65",
  textSoft: "#3d4d43",
  warning: "#9a6700"
};

jest.mock("@/theme/appTheme", () => ({
  useAppTheme: () => ({ palette })
}));

const inventoryItem = {
  id: "inventory-1",
  name: "Kelp Meal",
  sku: "KELP-1",
  quantity: 12,
  unit: "lb",
  reorderPoint: 4,
  vendor: "Coastal Inputs",
  category: "amendment",
  itemType: "ingredient",
  location: "Shelf A",
  notes: "Original notes",
  status: "active"
};

describe("Commercial Inventory workflow state", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockMapApiError.mockImplementation((error: any) => ({
      message: error?.message || String(error)
    }));
  });

  it("keeps overlapping mount and focus inventory loads single-flight", async () => {
    let resolveLoad: ((value: any) => void) | undefined;
    mockApiRequest.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLoad = resolve;
        })
    );

    const screen = render(<CommercialInventoryRoute />);

    await waitFor(() => expect(mockApiRequest).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText("Loading commercial inventory support")).toBeTruthy();

    act(() => resolveLoad?.({ items: [inventoryItem] }));
    await waitFor(() => expect(screen.getByText("Kelp Meal")).toBeTruthy());
  });

  it("offers an in-page retry after inventory support fails to load", async () => {
    mockApiRequest
      .mockRejectedValueOnce(new Error("Inventory service unavailable"))
      .mockResolvedValueOnce({ items: [inventoryItem] });

    const screen = render(<CommercialInventoryRoute />);

    await waitFor(() =>
      expect(screen.getByText("Inventory service unavailable")).toBeTruthy()
    );
    expect(screen.queryByText("No inventory support records yet")).toBeNull();
    fireEvent.press(screen.getByLabelText("Retry commercial inventory support"));

    await waitFor(() => expect(mockApiRequest).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText("Kelp Meal")).toBeTruthy());
  });

  it("rejects negative stock values without discarding the detail draft", async () => {
    mockApiRequest.mockResolvedValue({ item: inventoryItem });
    const screen = render(<CommercialInventoryItemDetailRoute />);
    const quantity = await screen.findByLabelText("Commercial detail item quantity");

    fireEvent.changeText(quantity, "-1");
    fireEvent.press(screen.getByLabelText("Save commercial inventory changes"));

    expect(
      screen.getByText("Quantity must be a number that is zero or greater.")
    ).toBeTruthy();
    expect(screen.getByLabelText("Commercial detail item quantity").props.value).toBe(
      "-1"
    );
    expect(
      mockApiRequest.mock.calls.filter(([, options]) => options?.method === "PATCH")
    ).toHaveLength(0);

    fireEvent.changeText(screen.getByLabelText("Commercial detail item quantity"), "1");
    fireEvent.changeText(screen.getByLabelText("Commercial detail reorder point"), "-2");
    fireEvent.press(screen.getByLabelText("Save commercial inventory changes"));

    expect(
      screen.getByText("Reorder point must be a number that is zero or greater.")
    ).toBeTruthy();
    expect(screen.getByLabelText("Commercial detail reorder point").props.value).toBe(
      "-2"
    );
    expect(
      mockApiRequest.mock.calls.filter(([, options]) => options?.method === "PATCH")
    ).toHaveLength(0);
  });

  it("saves inventory detail once and locks conflicting controls", async () => {
    let resolveSave: ((value: any) => void) | undefined;
    mockApiRequest.mockImplementation((path: string, options?: any) => {
      if (options?.method === "GET") return Promise.resolve({ item: inventoryItem });
      if (options?.method === "PATCH") {
        return new Promise((resolve) => {
          resolveSave = resolve;
        });
      }
      return Promise.resolve(null);
    });
    const screen = render(<CommercialInventoryItemDetailRoute />);
    const notes = await screen.findByLabelText("Commercial detail notes");
    fireEvent.changeText(notes, "Retained reviewed notes");
    const save = screen.getByLabelText("Save commercial inventory changes");

    fireEvent.press(save);
    fireEvent.press(save);

    expect(
      mockApiRequest.mock.calls.filter(([, options]) => options?.method === "PATCH")
    ).toHaveLength(1);
    expect(
      screen.getByLabelText("Saving commercial inventory record in progress")
    ).toBeTruthy();
    expect(screen.getByLabelText("Commercial detail notes").props.editable).toBe(false);

    act(() =>
      resolveSave?.({
        item: { ...inventoryItem, notes: "Retained reviewed notes" }
      })
    );
    await waitFor(() =>
      expect(screen.getByText("Inventory support record updated.")).toBeTruthy()
    );
  });

  it("retains failed inventory detail edits and reports the failure in page", async () => {
    mockApiRequest.mockImplementation((_path: string, options?: any) => {
      if (options?.method === "GET") return Promise.resolve({ item: inventoryItem });
      if (options?.method === "PATCH") {
        return Promise.reject(new Error("Inventory update unavailable"));
      }
      return Promise.resolve(null);
    });
    const screen = render(<CommercialInventoryItemDetailRoute />);
    const notes = await screen.findByLabelText("Commercial detail notes");
    fireEvent.changeText(notes, "Keep this failed inventory note");
    fireEvent.press(screen.getByLabelText("Save commercial inventory changes"));

    await waitFor(() =>
      expect(screen.getByText("Inventory update unavailable")).toBeTruthy()
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByLabelText("Commercial detail notes").props.value).toBe(
      "Keep this failed inventory note"
    );
  });

  it("uses one H1 and explicit H2 sections on inventory detail", async () => {
    mockApiRequest.mockResolvedValue({ item: inventoryItem });
    const screen = render(<CommercialInventoryItemDetailRoute />);

    await screen.findByLabelText("Commercial detail item name");
    expect(
      screen.getByRole("header", { name: "Inventory Support Record" }).props["aria-level"]
    ).toBe(1);
    ["Connected Workflows", "Update Item", "Details"].forEach((heading) => {
      expect(screen.getByRole("header", { name: heading }).props["aria-level"]).toBe(2);
    });
  });
});
