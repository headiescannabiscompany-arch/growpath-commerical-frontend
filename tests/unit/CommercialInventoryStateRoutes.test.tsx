import React from "react";
import { FlatList, RefreshControl } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import CommercialInventoryItemDetailRoute from "@/app/home/commercial/inventory/[id]";
import CommercialInventoryRoute from "@/app/home/commercial/inventory";

const mockApiRequest = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockMapApiError = jest.fn();
const mockRouter = { push: mockPush, replace: mockReplace };
let mockParams = { id: "inventory-1" };
let mockCanWrite = true;
let mockAuth = {
  user: { id: "owner-1" },
  token: "session-1",
  isAuthed: true,
  isHydrating: false
};

jest.mock("@/auth/AuthContext", () => ({ useAuth: () => mockAuth }));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
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
    can: () => mockCanWrite
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
    jest.useFakeTimers();
    jest.resetAllMocks();
    mockParams = { id: "inventory-1" };
    mockCanWrite = true;
    mockAuth = {
      user: { id: "owner-1" },
      token: "session-1",
      isAuthed: true,
      isHydrating: false
    };
    mockMapApiError.mockImplementation((error: any) => ({
      message: error?.message || String(error)
    }));
  });

  afterEach(() => {
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
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
    expect(screen.queryByText("0 items")).toBeNull();
    expect(screen.queryAllByText("0")).toHaveLength(0);

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
    expect(screen.queryByText("0 items")).toBeNull();
    expect(screen.queryAllByText("0")).toHaveLength(0);
    expect(
      screen.getByText("Inventory totals are unavailable. Retry to load current stock.")
    ).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Retry commercial inventory support"));

    await waitFor(() => expect(mockApiRequest).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText("Kelp Meal")).toBeTruthy());
  });

  it("labels retained inventory after a failed refresh without erasing search or records", async () => {
    mockApiRequest
      .mockResolvedValueOnce({ items: [inventoryItem] })
      .mockRejectedValueOnce(new Error("Refresh unavailable"));
    const screen = render(<CommercialInventoryRoute />);
    await screen.findByText("Kelp Meal");
    fireEvent.changeText(screen.getByLabelText("Search commercial inventory"), "kelp");
    await act(async () =>
      screen.UNSAFE_getByType(FlatList).props.refreshControl.props.onRefresh()
    );
    await screen.findByText("Refresh unavailable");
    expect(
      screen.getByText(
        "Showing previously loaded inventory; current stock could not be refreshed."
      )
    ).toBeTruthy();
    expect(screen.getByText("Kelp Meal")).toBeTruthy();
    expect(screen.getByLabelText("Search commercial inventory").props.value).toBe("kelp");
    expect(screen.queryByText("No inventory support records yet")).toBeNull();
  });

  it("keeps a truthful empty state even when an empty ledger has search text", async () => {
    mockApiRequest.mockResolvedValue({ items: [] });
    const screen = render(<CommercialInventoryRoute />);

    await screen.findByText("No inventory support records yet");
    const search = screen.getByLabelText("Search commercial inventory");
    expect(search.props.placeholder).toBe(
      "Search SKU, name, category, vendor, or location"
    );
    fireEvent.changeText(search, "kelp");

    expect(screen.getByText("No inventory support records yet")).toBeTruthy();
    expect(screen.queryByText(/No inventory records match/)).toBeNull();
  });

  it("searches SKU, name, category, vendor, and location case-insensitively", async () => {
    const otherItem = {
      ...inventoryItem,
      id: "inventory-2",
      name: "Coir Brick",
      sku: "COIR-9",
      category: "substrate",
      vendor: "Tropic Supply",
      location: "Bay 7"
    };
    mockApiRequest.mockResolvedValue({ items: [inventoryItem, otherItem] });
    const screen = render(<CommercialInventoryRoute />);

    await screen.findByText("Kelp Meal");
    expect(screen.getByText("Coir Brick")).toBeTruthy();

    for (const query of [
      "kElP-1",
      "KeLp MeAl",
      "AMENDMENT",
      "cOaStAl InPuTs",
      "sHeLf A"
    ]) {
      fireEvent.changeText(screen.getByLabelText("Search commercial inventory"), query);
      await waitFor(() => {
        expect(screen.getByText("Kelp Meal")).toBeTruthy();
        expect(screen.queryByText("Coir Brick")).toBeNull();
      });
    }

    fireEvent.changeText(
      screen.getByLabelText("Search commercial inventory"),
      "not stocked"
    );
    await waitFor(() =>
      expect(screen.getByText("No inventory records match “not stocked”")).toBeTruthy()
    );
    expect(
      screen.getByText("Try another SKU, name, category, vendor, or location.")
    ).toBeTruthy();
    expect(screen.queryByText("No inventory support records yet")).toBeNull();
  });

  it("shows private cost, vendor, and canonical evidence alerts in the Commercial list", async () => {
    mockApiRequest.mockResolvedValue({
      items: [
        {
          ...inventoryItem,
          authorizedUnitCost: 10.25,
          currency: "USD",
          alerts: {
            lowStock: false,
            outOfStock: false,
            held: true,
            expiredLots: 1,
            expiringSoonLots: 2,
            lotQuantityExceedsItem: true,
            unallocatedQuantity: 3,
            sourceAgeDays: 21
          }
        }
      ]
    });
    const screen = render(<CommercialInventoryRoute />);

    await screen.findByText("Kelp Meal");
    expect(screen.getByText(/Vendor: Coastal Inputs/)).toBeTruthy();
    expect(screen.getByText("Authorized unit cost: USD 10.25")).toBeTruthy();
    expect(screen.getByText("Inventory held")).toBeTruthy();
    expect(screen.getByText("1 expired lot")).toBeTruthy();
    expect(screen.getByText("2 lots expire within 30 days")).toBeTruthy();
    expect(screen.getByText("Lot balance discrepancy")).toBeTruthy();
    expect(screen.getByText("3 on-hand units are not allocated to a lot")).toBeTruthy();
    expect(screen.getByText("Source evidence age: 21 days")).toBeTruthy();
  });

  it("keeps quantity audited and patches only supported canonical item fields", async () => {
    mockApiRequest.mockImplementation((_path: string, options?: any) => {
      if (options?.method === "PATCH") {
        return Promise.resolve({
          item: {
            ...inventoryItem,
            ...options.data,
            authorizedUnitCost: 12.5,
            currency: "USD"
          }
        });
      }
      return Promise.resolve({
        item: {
          ...inventoryItem,
          authorizedUnitCost: 10,
          currency: "USD"
        }
      });
    });
    const screen = render(<CommercialInventoryItemDetailRoute />);
    await screen.findByLabelText("Commercial detail item name");

    expect(screen.queryByLabelText("Commercial detail item quantity")).toBeNull();
    expect(
      screen.getByText(
        "Quantity changes use Inventory movement above so each stock change keeps its reason and audit history."
      )
    ).toBeTruthy();
    [
      "Commercial detail item type",
      "Commercial detail location",
      "Commercial detail linked product",
      "Commercial detail linked ingredient",
      "Commercial detail linked genetics",
      "Commercial detail linked product trial evidence run",
      "Commercial detail status"
    ].forEach((label) => expect(screen.queryByLabelText(label)).toBeNull());
    expect(screen.getByText("Authorized unit cost: USD 10")).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText("Commercial detail item name"), "Kelp");
    fireEvent.changeText(screen.getByLabelText("Commercial detail item SKU"), "K-1");
    fireEvent.changeText(screen.getByLabelText("Commercial detail item unit"), "kg");
    fireEvent.changeText(screen.getByLabelText("Commercial detail reorder point"), "3");
    fireEvent.changeText(screen.getByLabelText("Commercial detail vendor"), "Vendor B");
    fireEvent.changeText(screen.getByLabelText("Commercial detail category"), "input");
    fireEvent.changeText(
      screen.getByLabelText("Commercial detail authorized unit cost"),
      "12.5"
    );
    fireEvent.changeText(screen.getByLabelText("Commercial detail currency"), "USD");
    fireEvent.changeText(screen.getByLabelText("Commercial detail notes"), "Reviewed");
    fireEvent.press(screen.getByLabelText("Save commercial inventory changes"));

    await waitFor(() =>
      expect(
        mockApiRequest.mock.calls.filter(([, options]) => options?.method === "PATCH")
      ).toHaveLength(1)
    );
    expect(
      mockApiRequest.mock.calls.find(([, options]) => options?.method === "PATCH")?.[1]
        ?.data
    ).toEqual({
      name: "Kelp",
      sku: "K-1",
      unit: "kg",
      reorderPoint: 3,
      vendor: "Vendor B",
      category: "input",
      authorizedUnitCost: 12.5,
      currency: "usd",
      sourceFreshnessAt: null,
      notes: "Reviewed"
    });
  });

  it("clears optional commercial fields explicitly", async () => {
    mockApiRequest.mockImplementation((_path: string, options?: any) => {
      if (options?.method === "PATCH") {
        return Promise.resolve({ item: { ...inventoryItem, ...options.data } });
      }
      return Promise.resolve({
        item: {
          ...inventoryItem,
          authorizedUnitCost: 10,
          currency: "USD"
        }
      });
    });
    const screen = render(<CommercialInventoryItemDetailRoute />);
    await screen.findByLabelText("Commercial detail item name");

    fireEvent.changeText(screen.getByLabelText("Commercial detail reorder point"), "");
    fireEvent.changeText(screen.getByLabelText("Commercial detail vendor"), "");
    fireEvent.changeText(screen.getByLabelText("Commercial detail category"), "");
    fireEvent.changeText(
      screen.getByLabelText("Commercial detail authorized unit cost"),
      ""
    );
    fireEvent.changeText(screen.getByLabelText("Commercial detail currency"), "");
    fireEvent.changeText(screen.getByLabelText("Commercial detail notes"), "");
    fireEvent.press(screen.getByLabelText("Save commercial inventory changes"));

    await waitFor(() =>
      expect(
        mockApiRequest.mock.calls.find(([, options]) => options?.method === "PATCH")?.[1]
          ?.data
      ).toEqual({
        name: "Kelp Meal",
        sku: "KELP-1",
        unit: "lb",
        reorderPoint: null,
        vendor: "",
        category: "",
        authorizedUnitCost: null,
        currency: "",
        sourceFreshnessAt: null,
        notes: ""
      })
    );
  });

  it("does not allow a required SKU or unit to be erased", async () => {
    mockApiRequest.mockResolvedValue({ item: inventoryItem });
    const screen = render(<CommercialInventoryItemDetailRoute />);
    await screen.findByLabelText("Commercial detail item SKU");

    fireEvent.changeText(screen.getByLabelText("Commercial detail item SKU"), "  ");
    fireEvent.changeText(screen.getByLabelText("Commercial detail item unit"), "");
    fireEvent.press(screen.getByLabelText("Save commercial inventory changes"));

    expect(
      screen.getByText("Name, SKU, and stock-counting unit are required.")
    ).toBeTruthy();
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

  it("loads and deduplicates older Commercial movement-history pages", async () => {
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
        item: inventoryItem,
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
    const screen = render(<CommercialInventoryItemDetailRoute />);
    await screen.findByText("Newest delivery");

    fireEvent.press(screen.getByLabelText("Load older inventory movements"));

    await screen.findByText("Older use");
    expect(screen.getAllByText("Newest delivery")).toHaveLength(1);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/business-inventory/inventory-1?movementLimit=50&movementCursor=cursor%2F1",
      { method: "GET" }
    );
    expect(screen.queryByLabelText("Load older inventory movements")).toBeNull();
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

  it("confirms archiving the saved zero-stock item and cancels without losing edits", async () => {
    mockApiRequest.mockResolvedValue({ item: { ...inventoryItem, quantity: 0 } });
    const screen = render(<CommercialInventoryItemDetailRoute />);
    await screen.findByLabelText("Commercial detail notes");
    fireEvent.changeText(
      screen.getByLabelText("Commercial detail item name"),
      "Unsaved name"
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial detail notes"),
      "Keep my draft"
    );
    fireEvent.press(screen.getByLabelText("Archive commercial inventory item"));
    expect(screen.getByText('Archive "Kelp Meal"?')).toBeTruthy();
    expect(screen.getByText(/retains its record and audit history/)).toBeTruthy();
    expect(mockApiRequest).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByLabelText("Cancel commercial inventory archive"));
    expect(screen.queryByText('Archive "Kelp Meal"?')).toBeNull();
    expect(screen.getByLabelText("Commercial detail notes").props.value).toBe(
      "Keep my draft"
    );
    expect(screen.getByLabelText("Commercial detail item name").props.value).toBe(
      "Unsaved name"
    );
    expect(mockApiRequest).toHaveBeenCalledTimes(1);
  });

  it("archives once and locks save, refresh, lots and movements until canonical list return", async () => {
    let resolveArchive: (value: any) => void = () => {};
    mockApiRequest.mockImplementation((_path: string, options?: any) =>
      options?.method === "DELETE"
        ? new Promise((resolve) => {
            resolveArchive = resolve;
          })
        : Promise.resolve({ item: { ...inventoryItem, quantity: 0 } })
    );
    const screen = render(<CommercialInventoryItemDetailRoute />);
    await screen.findByLabelText("Archive commercial inventory item");
    fireEvent.press(screen.getByLabelText("Archive commercial inventory item"));
    const confirm = screen.getByLabelText("Confirm archive commercial inventory item");
    fireEvent.press(confirm);
    fireEvent.press(confirm);
    fireEvent.press(screen.getByLabelText("Save commercial inventory changes"));
    fireEvent(screen.UNSAFE_getByType(RefreshControl), "refresh");
    expect(screen.getByLabelText("Commercial detail notes").props.editable).toBe(false);
    expect(screen.getByLabelText("New inventory lot code").props.editable).toBe(false);
    expect(mockApiRequest).toHaveBeenCalledTimes(2);
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "/api/business-inventory/inventory-1",
      { method: "DELETE" }
    );
    expect(mockReplace).not.toHaveBeenCalled();
    await act(async () => resolveArchive({ success: true }));
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/home/commercial/inventory");
    expect(screen.queryByLabelText("Archive commercial inventory item")).toBeNull();
  });

  it("retains the record and draft after backend archive refusal and allows a deliberate retry", async () => {
    let deletes = 0;
    mockApiRequest.mockImplementation((_path: string, options?: any) => {
      if (options?.method === "DELETE")
        return ++deletes === 1
          ? Promise.reject(
              new Error("Inventory with an on-hand balance cannot be removed")
            )
          : Promise.resolve({ success: true });
      return Promise.resolve({ item: inventoryItem });
    });
    const screen = render(<CommercialInventoryItemDetailRoute />);
    await screen.findByLabelText("Commercial detail notes");
    fireEvent.changeText(
      screen.getByLabelText("Commercial detail notes"),
      "Retain after refusal"
    );
    fireEvent.press(screen.getByLabelText("Archive commercial inventory item"));
    fireEvent.press(screen.getByLabelText("Confirm archive commercial inventory item"));
    await screen.findByText("Inventory with an on-hand balance cannot be removed");
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Commercial detail notes").props.value).toBe(
      "Retain after refusal"
    );
    fireEvent.press(screen.getByLabelText("Confirm archive commercial inventory item"));
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/home/commercial/inventory")
    );
    expect(deletes).toBe(2);
  });

  it.each([
    null,
    {},
    { ...inventoryItem, id: "other-item" },
    { ...inventoryItem, _id: "conflicting-item" },
    { ...inventoryItem, quantity: undefined },
    { ...inventoryItem, quantity: "" },
    { ...inventoryItem, quantity: "not a balance" },
    { ...inventoryItem, quantity: true }
  ])(
    "does not expose archive or writes for an unavailable/mismatched record (%j)",
    async (item) => {
      mockApiRequest.mockResolvedValue({ item });
      const screen = render(<CommercialInventoryItemDetailRoute />);
      await screen.findByLabelText("Retry commercial inventory record");
      expect(screen.queryByLabelText("Archive commercial inventory item")).toBeNull();
      expect(screen.queryByLabelText("Save commercial inventory changes")).toBeNull();
      expect(mockApiRequest).toHaveBeenCalledTimes(1);
    }
  );

  it("does not offer archive to a read-only account or for an archived record", async () => {
    mockCanWrite = false;
    mockApiRequest.mockResolvedValue({ item: inventoryItem });
    const screen = render(<CommercialInventoryItemDetailRoute />);
    await screen.findByText("You do not have permission to update inventory items.");
    expect(screen.queryByLabelText("Archive commercial inventory item")).toBeNull();
    mockCanWrite = true;
    mockApiRequest.mockResolvedValue({
      item: { ...inventoryItem, itemStatus: "archived" }
    });
    screen.rerender(<CommercialInventoryItemDetailRoute />);
    await screen.findByText(
      "This archived item is read-only. Its record and audit history are retained."
    );
    expect(screen.queryByLabelText("Archive commercial inventory item")).toBeNull();
    expect(
      screen.getByLabelText("Save commercial inventory changes").props.accessibilityState
        .disabled
    ).toBe(true);
  });

  it("invalidates confirmation on refresh while preserving unsaved edits", async () => {
    mockApiRequest.mockResolvedValue({ item: { ...inventoryItem, quantity: 0 } });
    const screen = render(<CommercialInventoryItemDetailRoute />);
    await screen.findByLabelText("Commercial detail notes");
    fireEvent.changeText(
      screen.getByLabelText("Commercial detail notes"),
      "Preserve while reloading"
    );
    fireEvent.press(screen.getByLabelText("Archive commercial inventory item"));
    fireEvent(screen.UNSAFE_getByType(RefreshControl), "refresh");
    await waitFor(() => expect(mockApiRequest).toHaveBeenCalledTimes(2));
    expect(
      screen.queryByLabelText("Confirm archive commercial inventory item")
    ).toBeNull();
    expect(screen.getByLabelText("Commercial detail notes").props.value).toBe(
      "Preserve while reloading"
    );
  });

  it("blocks archive while a refresh or save is pending", async () => {
    let resolveRead: (value: any) => void = () => {};
    mockApiRequest.mockResolvedValueOnce({ item: inventoryItem }).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRead = resolve;
        })
    );
    const screen = render(<CommercialInventoryItemDetailRoute />);
    await screen.findByLabelText("Archive commercial inventory item");
    fireEvent(screen.UNSAFE_getByType(RefreshControl), "refresh");
    fireEvent.press(screen.getByLabelText("Archive commercial inventory item"));
    expect(
      screen.queryByLabelText("Confirm archive commercial inventory item")
    ).toBeNull();
    await act(async () => resolveRead({ item: inventoryItem }));
    mockApiRequest.mockImplementation(() => new Promise(() => {}));
    fireEvent.press(screen.getByLabelText("Save commercial inventory changes"));
    fireEvent.press(screen.getByLabelText("Archive commercial inventory item"));
    expect(
      screen.queryByLabelText("Confirm archive commercial inventory item")
    ).toBeNull();
    expect(mockApiRequest).toHaveBeenCalledTimes(3);
  });

  it("blocks archive during an existing lot operation and preserves edits through its reload", async () => {
    let resolveLot: (value: any) => void = () => {};
    mockApiRequest.mockImplementation((_path: string, options?: any) =>
      options?.method === "POST"
        ? new Promise((resolve) => {
            resolveLot = resolve;
          })
        : Promise.resolve({ item: inventoryItem })
    );
    const screen = render(<CommercialInventoryItemDetailRoute />);
    await screen.findByLabelText("Commercial detail notes");
    fireEvent.changeText(
      screen.getByLabelText("Commercial detail notes"),
      "Still unsaved"
    );
    fireEvent.changeText(screen.getByLabelText("New inventory lot code"), "LOT-1");
    fireEvent.press(screen.getByLabelText("Create inventory lot"));
    fireEvent.press(screen.getByLabelText("Archive commercial inventory item"));
    expect(
      screen.queryByLabelText("Confirm archive commercial inventory item")
    ).toBeNull();
    expect(screen.getByLabelText("Commercial detail notes").props.editable).toBe(false);
    await act(async () => resolveLot({ lot: { id: "lot-1" } }));
    await waitFor(() => expect(mockApiRequest).toHaveBeenCalledTimes(3));
    expect(screen.getByLabelText("Commercial detail notes").props.value).toBe(
      "Still unsaved"
    );
  });

  it.each(["account", "session", "route", "capability", "unmount"])(
    "ignores late archive completion after %s changes",
    async (context) => {
      let resolveArchive: (value: any) => void = () => {};
      mockApiRequest.mockImplementation((_path: string, options?: any) =>
        options?.method === "DELETE"
          ? new Promise((resolve) => {
              resolveArchive = resolve;
            })
          : Promise.resolve({ item: { ...inventoryItem, id: mockParams.id } })
      );
      const screen = render(<CommercialInventoryItemDetailRoute />);
      await screen.findByLabelText("Archive commercial inventory item");
      fireEvent.press(screen.getByLabelText("Archive commercial inventory item"));
      fireEvent.press(screen.getByLabelText("Confirm archive commercial inventory item"));
      if (context === "account") mockAuth = { ...mockAuth, user: { id: "owner-2" } };
      if (context === "session") mockAuth = { ...mockAuth, token: "session-2" };
      if (context === "route") mockParams = { id: "inventory-2" };
      if (context === "capability") mockCanWrite = false;
      if (context === "unmount") screen.unmount();
      else screen.rerender(<CommercialInventoryItemDetailRoute />);
      await act(async () => resolveArchive({ success: true }));
      expect(mockReplace).not.toHaveBeenCalled();
    }
  );

  it("does not replay old confirmation or restore drafts after an account A/B/A transition", async () => {
    mockApiRequest.mockImplementation(() =>
      Promise.resolve({ item: { ...inventoryItem, notes: `Saved ${mockAuth.user.id}` } })
    );
    const screen = render(<CommercialInventoryItemDetailRoute />);
    await screen.findByLabelText("Commercial detail notes");
    fireEvent.changeText(
      screen.getByLabelText("Commercial detail notes"),
      "Private A draft"
    );
    fireEvent.press(screen.getByLabelText("Archive commercial inventory item"));
    mockAuth = { ...mockAuth, user: { id: "owner-2" } };
    screen.rerender(<CommercialInventoryItemDetailRoute />);
    await waitFor(() =>
      expect(screen.getByLabelText("Commercial detail notes").props.value).toBe(
        "Saved owner-2"
      )
    );
    mockAuth = { ...mockAuth, user: { id: "owner-1" } };
    screen.rerender(<CommercialInventoryItemDetailRoute />);
    await waitFor(() =>
      expect(screen.getByLabelText("Commercial detail notes").props.value).toBe(
        "Saved owner-1"
      )
    );
    expect(
      screen.queryByLabelText("Confirm archive commercial inventory item")
    ).toBeNull();
    expect(
      mockApiRequest.mock.calls.filter(([, options]) => options.method === "DELETE")
    ).toHaveLength(0);
  });

  it("returns after archive to the actual inventory list and reads its now-empty collection", async () => {
    let archived = false;
    mockApiRequest.mockImplementation((path: string, options?: any) => {
      if (options?.method === "DELETE") {
        archived = true;
        return Promise.resolve({ success: true });
      }
      if (path === "/api/business-inventory")
        return Promise.resolve({ items: archived ? [] : [inventoryItem] });
      return Promise.resolve({ item: inventoryItem });
    });
    function RouteHarness() {
      const [atList, setAtList] = React.useState(false);
      mockReplace.mockImplementation((path) => {
        if (path === "/home/commercial/inventory") setAtList(true);
      });
      return atList ? (
        <CommercialInventoryRoute />
      ) : (
        <CommercialInventoryItemDetailRoute />
      );
    }
    const screen = render(<RouteHarness />);
    await screen.findByLabelText("Archive commercial inventory item");
    fireEvent.press(screen.getByLabelText("Archive commercial inventory item"));
    fireEvent.press(screen.getByLabelText("Confirm archive commercial inventory item"));
    await screen.findByText("No inventory support records yet");
    expect(screen.queryByText("Kelp Meal")).toBeNull();
    expect(mockApiRequest).toHaveBeenLastCalledWith("/api/business-inventory", {
      method: "GET"
    });
  });

  it("withholds archive after failed refresh until successful retry without clearing the draft", async () => {
    mockApiRequest
      .mockResolvedValueOnce({ item: inventoryItem })
      .mockRejectedValueOnce(new Error("Inventory temporarily unavailable"))
      .mockResolvedValueOnce({ item: inventoryItem });
    const screen = render(<CommercialInventoryItemDetailRoute />);
    await screen.findByLabelText("Commercial detail notes");
    fireEvent.changeText(
      screen.getByLabelText("Commercial detail notes"),
      "Keep through recovery"
    );
    fireEvent(screen.UNSAFE_getByType(RefreshControl), "refresh");
    await screen.findByLabelText("Retry commercial inventory record");
    expect(
      screen.getByLabelText("Archive commercial inventory item").props.accessibilityState
        .disabled
    ).toBe(true);
    fireEvent.press(screen.getByLabelText("Archive commercial inventory item"));
    expect(
      screen.queryByLabelText("Confirm archive commercial inventory item")
    ).toBeNull();
    fireEvent.press(screen.getByLabelText("Retry commercial inventory record"));
    await waitFor(() =>
      expect(
        screen.getByLabelText("Archive commercial inventory item").props
          .accessibilityState.disabled
      ).toBe(false)
    );
    expect(screen.getByLabelText("Commercial detail notes").props.value).toBe(
      "Keep through recovery"
    );
  });

  it("serializes archive and older movement-history reads", async () => {
    let resolveHistory: (value: any) => void = () => {};
    mockApiRequest
      .mockResolvedValueOnce({
        item: inventoryItem,
        movementPage: { hasMore: true, nextCursor: "older" }
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveHistory = resolve;
          })
      );
    const screen = render(<CommercialInventoryItemDetailRoute />);
    await screen.findByLabelText("Load older inventory movements");
    fireEvent.press(screen.getByLabelText("Load older inventory movements"));
    fireEvent.press(screen.getByLabelText("Archive commercial inventory item"));
    expect(
      screen.queryByLabelText("Confirm archive commercial inventory item")
    ).toBeNull();
    await act(async () =>
      resolveHistory({
        movements: [],
        movementPage: { hasMore: true, nextCursor: "older-still" }
      })
    );
    fireEvent.press(screen.getByLabelText("Archive commercial inventory item"));
    fireEvent.press(screen.getByLabelText("Load older inventory movements"));
    expect(mockApiRequest).toHaveBeenCalledTimes(2);
  });
});
