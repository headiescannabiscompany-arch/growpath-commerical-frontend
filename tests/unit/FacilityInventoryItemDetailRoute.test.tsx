import React from "react";
import { Alert } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import InventoryItemDetailScreen from "@/app/home/facility/inventory/[id]";
import { createFacilityInventoryDetailStyles } from "@/screens/facility/FacilityInventoryItemDetailScreen";
import type { ThemePalette } from "@/theme/appTheme";

const mockApiRequest = jest.fn();
const mockReplace = jest.fn();
const mockHandleApiError = jest.fn();
const mockClearError = jest.fn();
const mockRouter = { replace: mockReplace };

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "input-1" }),
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
  InlineError: () => null
}));

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
  useApiErrorHandler: () => ({
    error: null,
    handleApiError: mockHandleApiError,
    clearError: mockClearError
  })
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
    mockClearError.mockReset();
    mockApiRequest.mockResolvedValue({
      item: {
        id: "input-1",
        facilityId: "facility-1",
        sku: "KELP-001",
        name: "Kelp Meal",
        quantity: 8,
        unit: "lb",
        reorderPoint: 2,
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
    expect(
      screen.getByRole("header", { name: "Adjust quantity" }).props["aria-level"]
    ).toBe(2);
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
      screen.getByLabelText("Save inventory adjustment").props.accessibilityState
    ).toEqual({ disabled: false });
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
    expect(screen.queryByLabelText("Inventory adjustment quantity")).toBeNull();
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
