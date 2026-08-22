import React from "react";
import { Alert } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import InventoryItemDetailScreen from "@/app/home/facility/inventory/[id]";
import { createFacilityInventoryDetailStyles } from "@/screens/facility/FacilityInventoryItemDetailScreen";
import type { ThemePalette } from "@/theme/appTheme";

const mockApiRequest = jest.fn();
const mockReplace = jest.fn();
const mockHandleApiError = jest.fn();
const mockRouter = { replace: mockReplace };
let mockInventoryItemId = "input-1";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: mockInventoryItemId }),
  useRouter: () => mockRouter
}));

jest.mock("@/components/ScreenBoundary", () => ({
  ScreenBoundary: ({ children, showBack, backFallbackHref, title }: any) => {
    const React = require("react");
    const { Text, View } = require("react-native");
    return (
      <View>
        <Text>{title}</Text>
        {showBack ? <Text>Shared Back {backFallbackHref}</Text> : null}
        {children}
      </View>
    );
  }
}));

jest.mock("@/components/InlineError", () => ({
  InlineError: ({ error }: any) => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(Text, null, error?.message || String(error || ""));
  }
}));

jest.mock("@/components/forms/CalendarDateField", () => {
  const React = require("react");
  const { TextInput } = require("react-native");
  return ({ accessibilityLabel, disabled, onChange, value }: any) =>
    React.createElement(TextInput, {
      accessibilityLabel,
      editable: !disabled,
      onChangeText: onChange,
      value
    });
});

jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: "facility-1" })
}));

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { INVENTORY_WRITE: "inventory_write" },
  useEntitlements: () => ({ can: () => true })
}));

const mockNightPalette = {
  card: "#151D27",
  surface: "#151D27",
  surfaceMuted: "#1B2532",
  surfaceStrong: "#223044",
  border: "#283545",
  text: "#F4F7FB",
  textMuted: "#AAB6C5",
  textSoft: "#CDD6E1",
  accent: "#78AAFF",
  accentSoft: "#163D2A",
  success: "#4ADE80",
  warning: "#FBBF24",
  danger: "#E29B9B",
  dangerText: "#0E141B"
} as ThemePalette;

jest.mock("@/theme/appTheme", () => ({
  useAppTheme: () => ({ palette: mockNightPalette })
}));

jest.mock("@/hooks/useApiErrorHandler", () => ({
  useApiErrorHandler: () => mockHandleApiError
}));

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/api/endpoints", () => ({
  endpoints: {
    inventoryItem: (facilityId: string, itemId: string) =>
      `/api/facilities/${facilityId}/inventory/${itemId}`
  }
}));

describe("InventoryItemDetailScreen", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockReplace.mockReset();
    mockHandleApiError.mockReset();
    mockHandleApiError.mockImplementation((error: any) => ({
      message: error?.message || String(error)
    }));
    mockInventoryItemId = "input-1";
    mockApiRequest.mockResolvedValue({
      item: {
        id: "input-1",
        facilityId: "facility-1",
        sku: "KELP-001",
        name: "Kelp Meal",
        quantity: 8,
        unit: "lb",
        reorderPoint: 2,
        category: "amendment",
        vendor: "Coastal Inputs",
        authorizedUnitCost: 12.5,
        currency: "USD",
        sourceFreshnessAt: "2026-07-20T12:00:00.000Z",
        alerts: {
          lowStock: false,
          outOfStock: false,
          held: true,
          expiredLots: 1,
          expiringSoonLots: 2,
          lotQuantityExceedsItem: true,
          unallocatedQuantity: 3,
          sourceAgeDays: 21
        },
        createdAt: "2026-07-22T12:00:00.000Z",
        updatedAt: "2026-07-22T13:00:00.000Z"
      }
    });
  });

  it("uses the shared back control for the nested facility inventory detail page", async () => {
    const screen = render(<InventoryItemDetailScreen />);

    expect(
      screen.getByLabelText("Loading facility inventory item").props.accessibilityRole
    ).toBe("progressbar");

    await waitFor(() => expect(screen.getByText("Kelp Meal")).toBeTruthy());

    expect(screen.getByText("Shared Back /home/facility/inventory")).toBeTruthy();
    expect(screen.getByRole("header", { name: "Kelp Meal" }).props["aria-level"]).toBe(1);
    expect(screen.getByRole("header", { name: "Item details" }).props["aria-level"]).toBe(
      2
    );
    [
      "Evidence-linked inventory alerts",
      "Lots and batches",
      "Inventory movement",
      "Movement history"
    ].forEach((heading) => {
      expect(screen.getByRole("header", { name: heading }).props["aria-level"]).toBe(2);
    });
    expect(
      screen.getByRole("header", { name: "Record information" }).props["aria-level"]
    ).toBe(2);
    expect(
      screen.getByRole("header", { name: "Remove inventory item" }).props["aria-level"]
    ).toBe(2);
    expect(
      screen.getByLabelText("Save inventory details").props.accessibilityState
    ).toEqual({ disabled: false });
    expect(
      screen.getByLabelText("Record inventory receive").props.accessibilityState
    ).toEqual({ disabled: false, busy: false });
    expect(
      screen.getByLabelText("Remove inventory item").props.accessibilityState
    ).toEqual({ disabled: false });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/facilities/facility-1/inventory/input-1"
    );
    expect(screen.queryByText("facilityId")).toBeNull();
    expect(screen.queryByText("facility-1")).toBeNull();
    expect(screen.queryByText("id: input-1")).toBeNull();
    expect(screen.getByText("Record information")).toBeTruthy();
    expect(screen.getByText("KELP-001")).toBeTruthy();
    expect(screen.getByText("amendment")).toBeTruthy();
    expect(screen.getByText("Coastal Inputs")).toBeTruthy();
    expect(screen.getByText("USD 12.5")).toBeTruthy();
    expect(screen.getByText("Inventory held")).toBeTruthy();
    expect(screen.getByText("1 expired lot")).toBeTruthy();
    expect(screen.getByText("2 lots expire within 30 days")).toBeTruthy();
    expect(screen.getByText("Lot balance discrepancy")).toBeTruthy();
    expect(screen.getByText("3 on-hand units are not allocated to a lot")).toBeTruthy();
    expect(screen.getByText("Source evidence age: 21 days")).toBeTruthy();
    expect(
      screen.getByText(/Quantity changes belong in Inventory movement above\./)
    ).toBeTruthy();
    expect(
      screen.queryByText(/Quantity changes belong in Adjust quantity above\./)
    ).toBeNull();
  });

  it("saves canonical private source fields through the facility item contract", async () => {
    mockApiRequest.mockImplementation((_path: string, options?: any) => {
      if (options?.method === "PATCH") {
        return Promise.resolve({ item: { name: "Kelp Meal", unit: "kg" } });
      }
      return Promise.resolve({
        item: {
          id: "input-1",
          sku: "KELP-001",
          name: "Kelp Meal",
          quantity: 8,
          unit: "lb",
          reorderPoint: 2,
          category: "amendment",
          vendor: "Coastal Inputs",
          authorizedUnitCost: 12.5,
          currency: "USD",
          sourceFreshnessAt: "2026-07-20T12:00:00.000Z"
        }
      });
    });
    const screen = render(<InventoryItemDetailScreen />);
    await screen.findByLabelText("Inventory detail item name");

    fireEvent.changeText(screen.getByLabelText("Inventory detail item unit"), "kg");
    fireEvent.changeText(screen.getByLabelText("Inventory detail category"), "input");
    fireEvent.changeText(screen.getByLabelText("Inventory detail vendor"), "Vendor B");
    fireEvent.changeText(
      screen.getByLabelText("Inventory detail authorized unit cost"),
      "14.25"
    );
    fireEvent.changeText(screen.getByLabelText("Inventory detail currency"), "CAD");
    fireEvent.changeText(
      screen.getByLabelText("Inventory detail source freshness date"),
      "2026-08-01"
    );
    fireEvent.press(screen.getByLabelText("Save inventory details"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/facilities/facility-1/inventory/input-1",
        {
          method: "PATCH",
          body: {
            name: "Kelp Meal",
            unit: "kg",
            reorderPoint: 2,
            category: "input",
            vendor: "Vendor B",
            authorizedUnitCost: 14.25,
            currency: "cad",
            sourceFreshnessAt: "2026-08-01"
          }
        }
      )
    );
    await screen.findByText("Item details saved.");
  });

  it("shows a useful error and stops loading when the detail URL has no item ID", async () => {
    mockInventoryItemId = "";
    const screen = render(<InventoryItemDetailScreen />);

    await waitFor(() =>
      expect(screen.getByText("This inventory link is missing its record ID.")).toBeTruthy()
    );
    expect(screen.queryByLabelText("Loading facility inventory item")).toBeNull();
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("maps load failures into the visible inline error", async () => {
    mockApiRequest.mockRejectedValueOnce(new Error("Facility inventory unavailable"));
    const screen = render(<InventoryItemDetailScreen />);

    await waitFor(() =>
      expect(screen.getByText("Facility inventory unavailable")).toBeTruthy()
    );
    expect(mockHandleApiError).toHaveBeenCalled();
  });

  it("loads and deduplicates older Facility movement-history pages", async () => {
    mockApiRequest.mockImplementation((path: string) => {
      if (path.includes("movementCursor=cursor%2F1")) {
        return Promise.resolve({
          movements: [
            {
              id: "movement-1",
              movementType: "receive",
              quantityDelta: 2,
              reason: "Newest delivery"
            },
            {
              id: "movement-2",
              movementType: "consume",
              quantityDelta: -1,
              reason: "Older use"
            }
          ],
          movementPage: { limit: 50, hasMore: false, nextCursor: null }
        });
      }
      return Promise.resolve({
        item: {
          id: "input-1",
          sku: "KELP-001",
          name: "Kelp Meal",
          quantity: 8,
          unit: "lb",
          reorderPoint: 2
        },
        lots: [],
        movements: [
          {
            id: "movement-1",
            movementType: "receive",
            quantityDelta: 2,
            reason: "Newest delivery"
          }
        ],
        movementPage: { limit: 50, hasMore: true, nextCursor: "cursor/1" }
      });
    });
    const screen = render(<InventoryItemDetailScreen />);
    await screen.findByText("Newest delivery");

    fireEvent.press(screen.getByLabelText("Load older inventory movements"));

    await screen.findByText("Older use");
    expect(screen.getAllByText("Newest delivery")).toHaveLength(1);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/facilities/facility-1/inventory/input-1?movementLimit=50&movementCursor=cursor%2F1"
    );
    expect(screen.queryByLabelText("Load older inventory movements")).toBeNull();
  });

  it("uses the active palette for cards, fields, copy, and destructive states", () => {
    const styles = createFacilityInventoryDetailStyles(mockNightPalette);

    expect(styles.card.backgroundColor).toBe(mockNightPalette.card);
    expect(styles.input.backgroundColor).toBe(mockNightPalette.surface);
    expect(styles.input.color).toBe(mockNightPalette.text);
    expect(styles.cardTitle.color).toBe(mockNightPalette.text);
    expect(styles.recordLabel.color).toBe(mockNightPalette.textMuted);
    expect(styles.dangerButton.backgroundColor).toBe(mockNightPalette.danger);
    expect(styles.dangerButtonText.color).toBe(mockNightPalette.dangerText);
  });

  it("shows one clear read-only state when the inventory record is unavailable", async () => {
    mockApiRequest.mockResolvedValueOnce(null);
    const screen = render(<InventoryItemDetailScreen />);

    await waitFor(() =>
      expect(screen.getByText("Inventory item not found")).toBeTruthy()
    );

    expect(screen.queryByLabelText("Inventory detail item name")).toBeNull();
    expect(screen.queryByLabelText("Inventory movement quantity")).toBeNull();
    expect(screen.queryByLabelText("Save inventory details")).toBeNull();
    expect(screen.queryByText("Record information")).toBeNull();
  });

  it("confirms and removes an inventory item through the canonical endpoint", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const screen = render(<InventoryItemDetailScreen />);

    await waitFor(() => expect(screen.getByText("Kelp Meal")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Remove inventory item"));

    expect(alertSpy).toHaveBeenCalledWith(
      "Remove inventory item?",
      expect.stringContaining("active facility inventory"),
      expect.any(Array)
    );

    const actions = alertSpy.mock.calls[0][2] as any[];
    await act(async () => {
      await actions.find((action) => action.text === "Remove item").onPress();
    });

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/facilities/facility-1/inventory/input-1",
        { method: "DELETE" }
      )
    );
    expect(mockReplace).toHaveBeenCalledWith("/home/facility/inventory");
    alertSpy.mockRestore();
  });
});
