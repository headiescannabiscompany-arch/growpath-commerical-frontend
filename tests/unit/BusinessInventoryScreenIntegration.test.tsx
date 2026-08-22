import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CommercialInventoryItemDetailRoute from "@/app/home/commercial/inventory/[id]";
import CommercialInventoryRoute from "@/app/home/commercial/inventory";
import FacilityInventoryTab from "@/app/home/facility/(tabs)/inventory";
import FacilityInventoryItemDetailRoute from "@/app/home/facility/inventory/[id]";

const mockApiRequest = jest.fn();
const mockClearError = jest.fn();
const mockExportCsvContent = jest.fn();
const mockExportToCsv = jest.fn();
const mockHandleApiError = jest.fn((error: unknown) => error);
const mockImportProps = jest.fn();
const mockMapApiError = jest.fn((error: unknown) => error);
const mockOperationsProps = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRouter = { push: mockPush, replace: mockReplace };
const mockApiErrorHook: any = (error: unknown) => mockMapApiError(error);
mockApiErrorHook.clearError = mockClearError;
mockApiErrorHook.error = null;
mockApiErrorHook.handleApiError = mockHandleApiError;

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "item-1" }),
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

jest.mock("@/components/inventory/BusinessInventoryImportPanel", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return {
    BusinessInventoryImportPanel: (props: any) => {
      mockImportProps(props);
      return React.createElement(
        Pressable,
        {
          accessibilityLabel: "Trigger inventory import refresh",
          accessibilityRole: "button",
          onPress: () => props.onApplied()
        },
        React.createElement(Text, null, "Inventory import panel")
      );
    }
  };
});

jest.mock("@/components/inventory/BusinessInventoryOperations", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return {
    BusinessInventoryOperations: (props: any) => {
      mockOperationsProps(props);
      return React.createElement(
        Pressable,
        {
          accessibilityLabel: "Trigger inventory operations refresh",
          accessibilityRole: "button",
          onPress: () => props.onReload()
        },
        React.createElement(Text, null, "Inventory operations")
      );
    }
  };
});

jest.mock("@/components/InlineError", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    InlineError: ({ error }: any) =>
      error ? React.createElement(Text, null, error?.message || String(error)) : null
  };
});

jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    ScreenBoundary: ({ children }: any) => React.createElement(View, null, children)
  };
});

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: {
    COMMERCIAL_INVENTORY_WRITE: "commercial.inventory.write",
    INVENTORY_WRITE: "inventory.write"
  },
  useEntitlements: () => ({ ready: true, mode: "commercial", can: () => true })
}));

jest.mock("@/hooks/useApiErrorHandler", () => ({
  useApiErrorHandler: () => mockApiErrorHook
}));

jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: "facility-1" })
}));

jest.mock("@/utils/exportToCsv", () => ({
  exportCsvContent: (...args: any[]) => mockExportCsvContent(...args),
  exportToCsv: (...args: any[]) => mockExportToCsv(...args)
}));

const palette = {
  accent: "#198754",
  accentSoft: "#dff5e8",
  accentText: "#ffffff",
  border: "#cad5cf",
  card: "#ffffff",
  danger: "#b42318",
  dangerText: "#ffffff",
  link: "#146c43",
  page: "#f7faf8",
  success: "#15803d",
  surface: "#ffffff",
  surfaceMuted: "#f0f4f1",
  surfaceStrong: "#e8efea",
  text: "#17231c",
  textMuted: "#5f6f65",
  textSoft: "#3d4d43",
  warning: "#9a6700"
};

jest.mock("@/theme/appTheme", () => ({
  useAppTheme: () => ({ palette })
}));

const item = {
  id: "item-1",
  name: "Kelp Meal",
  sku: "KELP-1",
  quantity: 4,
  reorderPoint: 2,
  unit: "lb"
};

const lot = {
  id: "lot-1",
  itemId: "item-1",
  lotCode: "LOT-1",
  quantityOnHand: 4,
  unit: "lb"
};

const movement = {
  id: "movement-1",
  movementType: "receive",
  quantityDelta: 4,
  reason: "Reviewed delivery"
};

function latestProps(mock: jest.Mock) {
  return mock.mock.calls[mock.mock.calls.length - 1][0];
}

describe("B-02 inventory screen integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExportCsvContent.mockResolvedValue(undefined);
    mockExportToCsv.mockResolvedValue(undefined);
    mockHandleApiError.mockImplementation((error: unknown) => error);
    mockMapApiError.mockImplementation((error: unknown) => error);
  });

  it("downloads the authenticated canonical audit export for both workspace scopes", async () => {
    const csv = "recordType,sku,movementType\nmovement,KELP-1,receive";
    mockApiRequest.mockImplementation((path: string) =>
      path.endsWith("/exports/audit.csv")
        ? Promise.resolve(csv)
        : Promise.resolve({ items: [item] })
    );
    const commercial = render(<CommercialInventoryRoute />);

    await commercial.findByText("Kelp Meal");
    fireEvent.press(
      commercial.getByLabelText("Export commercial inventory full audit CSV")
    );
    await waitFor(() => expect(mockExportCsvContent).toHaveBeenCalledTimes(1));
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/business-inventory/exports/audit.csv",
      { method: "GET", responseType: "text" }
    );
    expect(mockExportCsvContent).toHaveBeenLastCalledWith(
      "growpath-inventory-audit",
      csv
    );
    expect(commercial.getByText("Full inventory audit CSV is ready.")).toBeTruthy();
    commercial.unmount();

    const facility = render(<FacilityInventoryTab />);
    await facility.findByText("Kelp Meal");
    fireEvent.press(facility.getByLabelText("Export facility inventory full audit CSV"));
    await waitFor(() => expect(mockExportCsvContent).toHaveBeenCalledTimes(2));
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/facility/facility-1/business-inventory/exports/audit.csv",
      { method: "GET", responseType: "text" }
    );
    expect(mockExportCsvContent).toHaveBeenLastCalledWith(
      "growpath-inventory-audit",
      csv
    );
    expect(facility.getByText("Full inventory audit CSV is ready.")).toBeTruthy();
  });

  it("wires Commercial list import refresh and item export to the canonical ledger", async () => {
    mockApiRequest.mockResolvedValue({ items: [item] });
    const screen = render(<CommercialInventoryRoute />);

    await screen.findByText("Kelp Meal");
    expect(mockApiRequest).toHaveBeenCalledWith("/api/business-inventory", {
      method: "GET"
    });
    expect(latestProps(mockImportProps)).toEqual(
      expect.objectContaining({ canWrite: true, workspace: {} })
    );

    fireEvent.press(screen.getByLabelText("Export commercial inventory CSV"));
    await waitFor(() => expect(mockExportToCsv).toHaveBeenCalledTimes(1));
    expect(mockExportToCsv).toHaveBeenCalledWith(
      "growpath-commercial-inventory",
      [item],
      expect.arrayContaining([
        { key: "sku", label: "SKU" },
        { key: "quantity", label: "Quantity" },
        { key: "updatedAt", label: "Updated at" }
      ])
    );

    const callsBeforeRefresh = mockApiRequest.mock.calls.length;
    fireEvent.press(screen.getByLabelText("Trigger inventory import refresh"));
    await waitFor(() =>
      expect(mockApiRequest.mock.calls.length).toBe(callsBeforeRefresh + 1)
    );
    expect(mockApiRequest).toHaveBeenLastCalledWith("/api/business-inventory", {
      method: "GET"
    });
  });

  it("keeps Facility list import, export, and refresh scoped to the selected Facility", async () => {
    mockApiRequest.mockResolvedValue({ items: [item] });
    const screen = render(<FacilityInventoryTab />);

    await screen.findByText("Kelp Meal");
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/facility/facility-1/business-inventory"
    );
    expect(latestProps(mockImportProps)).toEqual(
      expect.objectContaining({
        canWrite: true,
        workspace: { facilityId: "facility-1" }
      })
    );

    fireEvent.press(screen.getByLabelText("Export facility inventory CSV"));
    await waitFor(() => expect(mockExportToCsv).toHaveBeenCalledTimes(1));
    expect(mockExportToCsv).toHaveBeenCalledWith(
      "growpath-facility-inventory",
      [item],
      expect.arrayContaining([
        { key: "sku", label: "SKU" },
        { key: "quantity", label: "Quantity" },
        { key: "updatedAt", label: "Updated at" }
      ])
    );

    const callsBeforeRefresh = mockApiRequest.mock.calls.length;
    fireEvent.press(screen.getByLabelText("Trigger inventory import refresh"));
    await waitFor(() =>
      expect(mockApiRequest.mock.calls.length).toBe(callsBeforeRefresh + 1)
    );
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "/api/facility/facility-1/business-inventory"
    );
  });

  it("hydrates Commercial lot and movement operations and reloads the same record", async () => {
    const itemWithCanonicalOnHand = {
      ...item,
      quantity: undefined,
      quantityOnHand: 7
    };
    mockApiRequest.mockResolvedValue({
      item: itemWithCanonicalOnHand,
      lots: [lot],
      movements: [movement]
    });
    const screen = render(<CommercialInventoryItemDetailRoute />);

    await screen.findByLabelText("Commercial detail item name");
    expect(mockApiRequest).toHaveBeenCalledWith("/api/business-inventory/item-1", {
      method: "GET"
    });
    expect(latestProps(mockOperationsProps)).toEqual(
      expect.objectContaining({
        canWrite: true,
        itemId: "item-1",
        itemQuantity: 7,
        lots: [lot],
        movements: [movement],
        workspace: {}
      })
    );

    const callsBeforeRefresh = mockApiRequest.mock.calls.length;
    fireEvent.press(screen.getByLabelText("Trigger inventory operations refresh"));
    await waitFor(() =>
      expect(mockApiRequest.mock.calls.length).toBe(callsBeforeRefresh + 1)
    );
    expect(mockApiRequest).toHaveBeenLastCalledWith("/api/business-inventory/item-1", {
      method: "GET"
    });
  });

  it("hydrates Facility lot and movement operations inside the selected Facility", async () => {
    mockApiRequest.mockResolvedValue({ item, lots: [lot], movements: [movement] });
    const screen = render(<FacilityInventoryItemDetailRoute />);

    await screen.findByLabelText("Inventory detail item name");
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/facility/facility-1/business-inventory/item-1"
    );
    expect(latestProps(mockOperationsProps)).toEqual(
      expect.objectContaining({
        canWrite: true,
        itemId: "item-1",
        itemQuantity: 4,
        lots: [lot],
        movements: [movement],
        workspace: { facilityId: "facility-1" }
      })
    );

    const callsBeforeRefresh = mockApiRequest.mock.calls.length;
    fireEvent.press(screen.getByLabelText("Trigger inventory operations refresh"));
    await waitFor(() =>
      expect(mockApiRequest.mock.calls.length).toBe(callsBeforeRefresh + 1)
    );
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "/api/facility/facility-1/business-inventory/item-1"
    );
  });
});
