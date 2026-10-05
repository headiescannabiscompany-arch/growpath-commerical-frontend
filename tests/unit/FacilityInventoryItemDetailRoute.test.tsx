import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import InventoryItemDetailScreen from "@/app/home/facility/inventory/[id]";
import { createFacilityInventoryDetailStyles } from "@/screens/facility/FacilityInventoryItemDetailScreen";
import type { ThemePalette } from "@/theme/appTheme";

const mockApiRequest = jest.fn();
const mockReplace = jest.fn();
const mockHandleApiError = jest.fn();
const mockRouter = { replace: mockReplace };
let mockInventoryItemId = "input-1";
let mockFacilityId = "facility-1";
let mockUserId = "qa";
let mockToken = "session";
let mockRole = "OWNER";
let mockCanWrite = true;
const mockMovement = jest.fn();
const mockCreateLot = jest.fn();
jest.mock("@/api/businessInventory", () => ({
  ...jest.requireActual("@/api/businessInventory"),
  applyBusinessInventoryMovement: (...args: any[]) => mockMovement(...args),
  createBusinessInventoryLot: (...args: any[]) => mockCreateLot(...args)
}));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: mockUserId }, token: mockToken })
}));

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
  useFacility: () => ({ selectedId: mockFacilityId })
}));

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { INVENTORY_WRITE: "inventory_write" },
  useEntitlements: () => ({ can: () => mockCanWrite, facilityRole: mockRole })
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
  const record = (extra: any = {}) => ({
    item: {
      id: mockInventoryItemId,
      name: "Saved stock",
      quantity: 8,
      unit: "lb",
      ...extra
    },
    lots: [],
    movements: [],
    movementPage: { hasMore: true, nextCursor: "older/1", limit: 50 }
  });
  const deferred = () => {
    let resolve!: (value: any) => void;
    let reject!: (error: any) => void;
    const promise = new Promise((yes, no) => {
      resolve = yes;
      reject = no;
    });
    return { promise, resolve, reject };
  };
  const blocked = (screen: any, label: string) =>
    expect(screen.getByLabelText(label).props.accessibilityState.disabled).toBe(true);
  const fillMovement = (screen: any) => {
    fireEvent.changeText(screen.getByLabelText("Inventory movement quantity"), "2");
    fireEvent.changeText(
      screen.getByLabelText("Inventory movement reason"),
      "Synthetic delivery"
    );
  };
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockReplace.mockReset();
    mockHandleApiError.mockReset();
    mockHandleApiError.mockImplementation((error: any) => ({
      message: error?.message || String(error)
    }));
    mockInventoryItemId = "input-1";
    mockFacilityId = "facility-1";
    mockUserId = "qa";
    mockToken = "session";
    mockRole = "OWNER";
    mockCanWrite = true;
    mockMovement.mockReset().mockResolvedValue({});
    mockCreateLot.mockReset().mockResolvedValue({});
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
      expect(
        screen.getByText("This inventory link is missing its record ID.")
      ).toBeTruthy()
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
      expect(screen.getByText("Inventory item unavailable")).toBeTruthy()
    );

    expect(screen.queryByLabelText("Inventory detail item name")).toBeNull();
    expect(screen.queryByLabelText("Inventory movement quantity")).toBeNull();
    expect(screen.queryByLabelText("Save inventory details")).toBeNull();
    expect(screen.queryByText("Record information")).toBeNull();
  });

  it("confirms and removes an inventory item through the canonical endpoint", async () => {
    const screen = render(<InventoryItemDetailScreen />);

    await waitFor(() => expect(screen.getByText("Kelp Meal")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Remove inventory item"));

    expect(screen.getByText("Remove Kelp Meal?")).toBeTruthy();
    expect(screen.getByText(/retains its ledger history/)).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Confirm remove inventory item"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/facilities/facility-1/inventory/input-1",
        { method: "DELETE" }
      )
    );
    expect(mockReplace).toHaveBeenCalledWith("/home/facility/inventory");
  });

  it.each([
    null,
    {},
    { item: null },
    { item: [] },
    { item: { id: "wrong", quantity: 8 } },
    { item: { id: "input-1" } },
    { item: { id: "input-1", quantity: "" } },
    { item: { id: "input-1", quantity: "bad" } }
  ])(
    "rejects unavailable or malformed stock without inventing a zero balance: %j",
    async (response) => {
      mockApiRequest.mockResolvedValueOnce(response);
      const screen = render(<InventoryItemDetailScreen />);
      await screen.findByText("Inventory item unavailable");
      expect(screen.queryByText("out of stock")).toBeNull();
      expect(screen.queryByLabelText("Save inventory details")).toBeNull();
      fireEvent.press(screen.getByLabelText("Refresh inventory item"));
      await screen.findByText("Kelp Meal");
      expect(mockApiRequest).toHaveBeenCalledTimes(2);
    }
  );

  it("retains all drafts through failed refresh and serializes Retry before re-enabling changes", async () => {
    const screen = render(<InventoryItemDetailScreen />);
    await screen.findByText("Kelp Meal");
    fireEvent.changeText(
      screen.getByLabelText("Inventory detail item name"),
      "Unsaved name"
    );
    fillMovement(screen);
    fireEvent.changeText(screen.getByLabelText("New inventory lot code"), "Unsaved lot");
    const read = deferred();
    mockApiRequest.mockReturnValueOnce(read.promise);
    fireEvent.press(screen.getByLabelText("Refresh inventory item"));
    fireEvent.press(screen.getByLabelText("Refresh inventory item"));
    [
      "Save inventory details",
      "Record inventory receive",
      "Create inventory lot",
      "Remove inventory item"
    ].forEach((label) => blocked(screen, label));
    await act(async () => read.reject(new Error("Read offline")));
    await screen.findByText("Read offline");
    expect(screen.getByText(/Previously loaded inventory/)).toBeTruthy();
    expect(screen.queryByText("Inventory item unavailable")).toBeNull();
    blocked(screen, "Save inventory details");
    mockApiRequest.mockResolvedValueOnce(record());
    fireEvent.press(screen.getByLabelText("Refresh inventory item"));
    await screen.findByText("Saved stock");
    expect(screen.getByLabelText("Inventory detail item name").props.value).toBe(
      "Unsaved name"
    );
    expect(screen.getByLabelText("Inventory movement quantity").props.value).toBe("2");
    expect(screen.getByLabelText("New inventory lot code").props.value).toBe(
      "Unsaved lot"
    );
    expect(mockApiRequest).toHaveBeenCalledTimes(3);
    expect(
      screen.getByLabelText("Save inventory details").props.accessibilityState.disabled
    ).toBe(false);
    expect(mockMovement).not.toHaveBeenCalled();
  });

  it("serializes a detail save with child actions, removal, refresh and history", async () => {
    mockApiRequest.mockResolvedValue(record());
    const screen = render(<InventoryItemDetailScreen />);
    await screen.findByText("Saved stock");
    fillMovement(screen);
    fireEvent.changeText(screen.getByLabelText("New inventory lot code"), "Lot draft");
    const write = deferred();
    mockApiRequest.mockReturnValueOnce(write.promise);
    fireEvent.press(screen.getByLabelText("Save inventory details"));
    fireEvent.press(screen.getByLabelText("Save inventory details"));
    [
      "Record inventory receive",
      "Create inventory lot",
      "Remove inventory item",
      "Refresh inventory item",
      "Load older inventory movements"
    ].forEach((label) => blocked(screen, label));
    fireEvent.press(screen.getByLabelText("Record inventory receive"));
    expect(mockMovement).not.toHaveBeenCalled();
    await act(async () => write.resolve({ success: true }));
    await screen.findByText("Item details saved.");
    expect(
      mockApiRequest.mock.calls.filter((call) => call[1]?.method === "PATCH")
    ).toHaveLength(1);
    expect(screen.getByLabelText("New inventory lot code").props.value).toBe("Lot draft");
  });

  it("preserves failed saves and distinguishes a successful write from a failed follow-up read", async () => {
    const screen = render(<InventoryItemDetailScreen />);
    await screen.findByText("Kelp Meal");
    fireEvent.changeText(screen.getByLabelText("Inventory detail item name"), "My draft");
    mockApiRequest.mockRejectedValueOnce(new Error("Write rejected"));
    fireEvent.press(screen.getByLabelText("Save inventory details"));
    await screen.findByText("Write rejected");
    expect(screen.getByLabelText("Inventory detail item name").props.value).toBe(
      "My draft"
    );
    mockApiRequest
      .mockResolvedValueOnce({ success: true })
      .mockRejectedValueOnce(new Error("Read offline"));
    fireEvent.press(screen.getByLabelText("Save inventory details"));
    await screen.findByText(
      /Item details saved, but current inventory could not be refreshed/
    );
    blocked(screen, "Save inventory details");
    blocked(screen, "Record inventory receive");
  });

  it.each(["movement", "lot"])(
    "coordinates %s writes with parent operations and retains parent drafts",
    async (kind) => {
      mockApiRequest.mockResolvedValue(record());
      const screen = render(<InventoryItemDetailScreen />);
      await screen.findByText("Saved stock");
      fireEvent.changeText(
        screen.getByLabelText("Inventory detail item name"),
        "Parent draft"
      );
      fillMovement(screen);
      fireEvent.changeText(screen.getByLabelText("New inventory lot code"), "Lot draft");
      const write = deferred();
      const operation = kind === "movement" ? mockMovement : mockCreateLot;
      operation.mockReturnValueOnce(write.promise);
      const label =
        kind === "movement" ? "Record inventory receive" : "Create inventory lot";
      fireEvent.press(screen.getByLabelText(label));
      fireEvent.press(screen.getByLabelText(label));
      [
        "Save inventory details",
        "Remove inventory item",
        "Refresh inventory item",
        "Load older inventory movements"
      ].forEach((name) => blocked(screen, name));
      mockApiRequest.mockRejectedValueOnce(new Error("Read after write failed"));
      await act(async () => write.resolve({ success: true }));
      await screen.findByText("Read after write failed");
      expect(operation).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText("Inventory detail item name").props.value).toBe(
        "Parent draft"
      );
      blocked(screen, label);
      blocked(screen, "Save inventory details");
    }
  );

  it("names the saved item, preserves edits on Cancel and invalidates removal confirmation on Refresh", async () => {
    const screen = render(<InventoryItemDetailScreen />);
    await screen.findByText("Kelp Meal");
    fireEvent.changeText(
      screen.getByLabelText("Inventory detail item name"),
      "Not yet saved"
    );
    fireEvent.press(screen.getByLabelText("Remove inventory item"));
    expect(screen.getByText("Remove Kelp Meal?")).toBeTruthy();
    blocked(screen, "Save inventory details");
    blocked(screen, "Record inventory receive");
    fireEvent.press(screen.getByLabelText("Cancel inventory removal"));
    expect(screen.getByLabelText("Inventory detail item name").props.value).toBe(
      "Not yet saved"
    );
    fireEvent.press(screen.getByLabelText("Remove inventory item"));
    fireEvent.press(screen.getByLabelText("Refresh inventory item"));
    await waitFor(() =>
      expect(screen.queryByLabelText("Confirm remove inventory item")).toBeNull()
    );
    expect(mockApiRequest.mock.calls.some((call) => call[1]?.method === "DELETE")).toBe(
      false
    );
  });

  it("retains a blocked removal error without navigating or claiming archival", async () => {
    const screen = render(<InventoryItemDetailScreen />);
    await screen.findByText("Kelp Meal");
    mockApiRequest.mockRejectedValueOnce(new Error("Inventory balance remains"));
    fireEvent.press(screen.getByLabelText("Remove inventory item"));
    fireEvent.press(screen.getByLabelText("Confirm remove inventory item"));
    await screen.findByText("Inventory balance remains");
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Confirm remove inventory item")).toBeTruthy();
  });

  it("keeps archived history readable and retries the same history cursor after failure", async () => {
    mockApiRequest.mockResolvedValue(record({ itemStatus: "archived" }));
    const screen = render(<InventoryItemDetailScreen />);
    await screen.findByText("Saved stock");
    blocked(screen, "Save inventory details");
    blocked(screen, "Record inventory receive");
    blocked(screen, "Remove inventory item");
    mockApiRequest.mockResolvedValueOnce({ movements: null });
    fireEvent.press(screen.getByLabelText("Load older inventory movements"));
    await screen.findByText("Movement history is unavailable. Retry the same page.");
    mockApiRequest.mockResolvedValueOnce({
      movements: [],
      movementPage: { hasMore: false }
    });
    await waitFor(() =>
      expect(
        screen.getByLabelText("Load older inventory movements").props.accessibilityState
      ).toEqual({ busy: false, disabled: false })
    );
    fireEvent.press(screen.getByLabelText("Load older inventory movements"));
    await waitFor(() => expect(mockApiRequest).toHaveBeenCalledTimes(3));
    await waitFor(() =>
      expect(screen.queryByLabelText("Load older inventory movements")).toBeNull()
    );
    expect(mockApiRequest.mock.calls[1][0]).toBe(mockApiRequest.mock.calls[2][0]);
  });

  it.each(["account", "token", "facility", "role", "route"])(
    "clears drafts and ignores late reads on %s context changes",
    async (kind) => {
      const screen = render(<InventoryItemDetailScreen />);
      await screen.findByText("Kelp Meal");
      fireEvent.changeText(
        screen.getByLabelText("Inventory detail item name"),
        "Private old draft"
      );
      const oldRead = deferred();
      mockApiRequest.mockReturnValueOnce(oldRead.promise);
      fireEvent.press(screen.getByLabelText("Refresh inventory item"));
      if (kind === "account") mockUserId = "other";
      if (kind === "token") mockToken = "other-session";
      if (kind === "facility") mockFacilityId = "other-facility";
      if (kind === "role") mockRole = "VIEWER";
      if (kind === "route") mockInventoryItemId = "other-item";
      mockApiRequest.mockResolvedValueOnce(record({ name: "New context" }));
      screen.rerender(<InventoryItemDetailScreen />);
      await screen.findByText("New context");
      await act(async () => oldRead.resolve(record({ name: "Late old record" })));
      expect(screen.queryByText("Late old record")).toBeNull();
      expect(screen.getByLabelText("Inventory detail item name").props.value).toBe(
        "New context"
      );
    }
  );

  it.each(["PATCH", "DELETE", "movement", "lot"])(
    "ignores late %s completion after context change, without old refresh/navigation",
    async (kind) => {
      const screen = render(<InventoryItemDetailScreen />);
      await screen.findByText("Kelp Meal");
      const write = deferred();
      if (kind === "PATCH") {
        mockApiRequest.mockReturnValueOnce(write.promise);
        fireEvent.press(screen.getByLabelText("Save inventory details"));
      } else if (kind === "DELETE") {
        mockApiRequest.mockReturnValueOnce(write.promise);
        fireEvent.press(screen.getByLabelText("Remove inventory item"));
        fireEvent.press(screen.getByLabelText("Confirm remove inventory item"));
      } else if (kind === "movement") {
        mockMovement.mockReturnValueOnce(write.promise);
        fillMovement(screen);
        fireEvent.press(screen.getByLabelText("Record inventory receive"));
      } else {
        mockCreateLot.mockReturnValueOnce(write.promise);
        fireEvent.changeText(
          screen.getByLabelText("New inventory lot code"),
          "Private lot"
        );
        fireEvent.press(screen.getByLabelText("Create inventory lot"));
      }
      mockFacilityId = "other-facility";
      mockApiRequest.mockResolvedValueOnce(record({ name: "New context" }));
      screen.rerender(<InventoryItemDetailScreen />);
      await screen.findByText("New context");
      const calls = mockApiRequest.mock.calls.length;
      await act(async () => write.resolve({ success: true }));
      expect(mockApiRequest).toHaveBeenCalledTimes(calls);
      expect(mockReplace).not.toHaveBeenCalled();
      expect(screen.queryByText("Item details saved.")).toBeNull();
    }
  );
});
