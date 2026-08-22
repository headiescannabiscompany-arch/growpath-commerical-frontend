import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { BusinessInventoryOperations } from "@/components/inventory/BusinessInventoryOperations";

const mockApplyMovement = jest.fn();
const mockCreateLot = jest.fn();

jest.mock("@/api/businessInventory", () => ({
  applyBusinessInventoryMovement: (...args: any[]) => mockApplyMovement(...args),
  createBusinessInventoryLot: (...args: any[]) => mockCreateLot(...args)
}));

const palette = {
  accent: "#198754",
  accentSoft: "#dff5e8",
  accentText: "#ffffff",
  border: "#cad5cf",
  danger: "#b42318",
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

const lots = [
  {
    id: "lot-1",
    itemId: "item-1",
    lotCode: "LOT-1",
    quantityOnHand: 2,
    unit: "lb"
  }
];

const movements = [
  {
    id: "movement-1",
    movementType: "receive" as const,
    quantityDelta: 2,
    reason: "Reviewed delivery",
    occurredAt: "2026-08-22T12:00:00.000Z"
  }
];

function renderOperations(overrides: Record<string, unknown> = {}) {
  const onReload = jest.fn().mockResolvedValue(undefined);
  const screen = render(
    <BusinessInventoryOperations
      canWrite
      itemId="item-1"
      itemQuantity={6}
      lots={lots}
      movements={movements}
      onReload={onReload}
      workspace={{ facilityId: "facility-1" }}
      {...overrides}
    />
  );
  return { onReload, screen };
}

describe("BusinessInventoryOperations", () => {
  beforeEach(() => {
    mockApplyMovement.mockReset();
    mockCreateLot.mockReset();
  });

  it("keeps lot and movement history visible for a read-only role", () => {
    const { screen } = renderOperations({ canWrite: false });

    expect(screen.getByText("LOT-1 · 2 lb")).toBeTruthy();
    expect(screen.getByText("receive · +2")).toBeTruthy();
    expect(screen.getByText("Reviewed delivery")).toBeTruthy();
    expect(
      screen.getByText("Your role can review this history but cannot change inventory.")
    ).toBeTruthy();
    expect(screen.queryByLabelText("New inventory lot code")).toBeNull();
    expect(screen.queryByLabelText("Record inventory receive")).toBeNull();
    expect(
      screen.getByRole("radio", { name: "Receive" }).props.accessibilityState
    ).toEqual({ checked: true, disabled: true });
  });

  it("shows every loaded movement and provides an explicit older-history action", () => {
    const onLoadOlderMovements = jest.fn();
    const manyMovements = Array.from({ length: 51 }, (_, index) => ({
      id: `movement-${index + 1}`,
      movementType: "receive" as const,
      quantityDelta: 1,
      reason: `History ${index + 1}`
    }));
    const { screen } = renderOperations({
      canWrite: false,
      hasMoreMovements: true,
      movements: manyMovements,
      onLoadOlderMovements
    });

    expect(screen.getByText("History 51")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Load older inventory movements"));
    expect(onLoadOlderMovements).toHaveBeenCalledTimes(1);
  });

  it("describes relocations and status actions without misleading zero deltas", () => {
    const { screen } = renderOperations({
      canWrite: false,
      movements: [
        {
          id: "move-1",
          movementType: "move",
          quantity: 6,
          quantityDelta: 0,
          fromLocationId: "Shelf A",
          toLocationId: "Shelf B",
          reason: "Relocate full item"
        },
        {
          id: "transfer-1",
          movementType: "transfer",
          quantity: 2,
          quantityDelta: 0,
          fromLocationId: "Shelf B",
          toLocationId: "Room 2",
          reason: "Transfer selected lot"
        },
        {
          id: "hold-1",
          movementType: "hold",
          quantityDelta: 0,
          reason: "Quality review"
        },
        {
          id: "release-1",
          movementType: "release",
          quantityDelta: 0,
          reason: "Quality cleared"
        }
      ]
    });

    expect(screen.getByText("move · 6 relocated · Shelf A → Shelf B")).toBeTruthy();
    expect(screen.getByText("transfer · 2 relocated · Shelf B → Room 2")).toBeTruthy();
    expect(screen.getByText("hold · status action")).toBeTruthy();
    expect(screen.getByText("release · status action")).toBeTruthy();
    expect(screen.queryByText("move · +0")).toBeNull();
  });

  it("creates a zero-quantity lot without inventing a receipt timestamp", async () => {
    mockCreateLot.mockResolvedValue({ lot: { id: "lot-2" } });
    const { onReload, screen } = renderOperations();

    fireEvent.changeText(screen.getByLabelText("New inventory lot code"), " LOT-2 ");
    fireEvent.changeText(screen.getByLabelText("New inventory batch code"), " BATCH-8 ");
    fireEvent.changeText(
      screen.getByLabelText("New inventory lot location"),
      " Shelf B "
    );
    expect(
      screen.getByLabelText("New inventory lot expiration").props.accessibilityRole
    ).toBe("button");
    expect(screen.queryByPlaceholderText("Expiration YYYY-MM-DD (optional)")).toBeNull();
    fireEvent.press(screen.getByLabelText("New inventory lot expiration"));
    fireEvent(
      screen.getByLabelText("New inventory lot expiration year"),
      "valueChange",
      2027,
      1
    );
    fireEvent(
      screen.getByLabelText("New inventory lot expiration month"),
      "valueChange",
      6,
      5
    );
    fireEvent.press(screen.getByLabelText("New inventory lot expiration day 2027-06-30"));
    fireEvent.press(
      screen.getByLabelText("New inventory lot expiration use selected date")
    );
    fireEvent.press(screen.getByLabelText("Create inventory lot"));

    await waitFor(() => expect(mockCreateLot).toHaveBeenCalledTimes(1));
    expect(mockCreateLot).toHaveBeenCalledWith({ facilityId: "facility-1" }, "item-1", {
      lotCode: "LOT-2",
      batchCode: "BATCH-8",
      locationId: "Shelf B",
      expiresAt: "2027-06-30"
    });
    await waitFor(() => expect(onReload).toHaveBeenCalledTimes(1));
    expect(
      screen.getByText("Lot created. Use Receive to add its verified quantity.")
    ).toBeTruthy();
  });

  it("records one selected-lot receipt while the request is in flight", async () => {
    let resolveMovement: ((value: unknown) => void) | undefined;
    mockApplyMovement.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveMovement = resolve;
        })
    );
    const { onReload, screen } = renderOperations();

    fireEvent.press(screen.getByRole("radio", { name: "LOT-1 · 2 lb" }));
    fireEvent.changeText(screen.getByLabelText("Inventory movement quantity"), "3");
    fireEvent.changeText(
      screen.getByLabelText("Inventory movement reason"),
      " Reviewed receipt "
    );
    const submit = screen.getByLabelText("Record inventory receive");
    fireEvent.press(submit);
    fireEvent.press(submit);

    expect(mockApplyMovement).toHaveBeenCalledTimes(1);
    expect(mockApplyMovement).toHaveBeenCalledWith(
      { facilityId: "facility-1" },
      "item-1",
      expect.objectContaining({
        movementType: "receive",
        quantity: 3,
        reason: "Reviewed receipt",
        lotId: "lot-1",
        toLocationId: null,
        idempotencyKey: expect.stringMatching(/^inventory-ui:item-1:receive:/)
      })
    );
    expect(
      screen.getByLabelText("Record inventory receive").props.accessibilityState
    ).toEqual({ disabled: true, busy: true });

    await act(async () => {
      resolveMovement?.({ movement: { id: "movement-2" } });
    });
    await waitFor(() => expect(onReload).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Receive recorded.")).toBeTruthy();
  });

  it("locks move and transfer to the selected scope's full quantity", async () => {
    mockApplyMovement.mockResolvedValue({ movement: { id: "movement-2" } });
    const { screen } = renderOperations();

    fireEvent.press(screen.getByRole("radio", { name: "Move" }));
    expect(
      screen.getByText(
        "Select a stocked lot above. Whole-item relocation is unavailable while active lot balances exist, so each lot location stays auditable."
      )
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Record inventory move").props.accessibilityState.disabled
    ).toBe(true);
    expect(mockApplyMovement).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole("radio", { name: "LOT-1 · 2 lb" }));
    expect(screen.getByLabelText("Inventory movement quantity").props).toEqual(
      expect.objectContaining({
        accessibilityState: { disabled: true },
        editable: false,
        value: "2"
      })
    );
    expect(
      screen.getByText(
        "Move and transfer relocate the full on-hand quantity for the selected item or lot. Partial location moves are not supported yet."
      )
    ).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("Inventory movement reason"), "Relocate");
    fireEvent.press(screen.getByLabelText("Record inventory move"));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose or enter the destination location."
    );
    expect(mockApplyMovement).not.toHaveBeenCalled();

    fireEvent.changeText(
      screen.getByLabelText("Inventory movement destination"),
      "Room 2"
    );
    fireEvent.press(screen.getByLabelText("Record inventory move"));

    await waitFor(() => expect(mockApplyMovement).toHaveBeenCalledTimes(1));
    expect(mockApplyMovement).toHaveBeenCalledWith(
      { facilityId: "facility-1" },
      "item-1",
      expect.objectContaining({
        movementType: "move",
        quantity: 2,
        reason: "Relocate",
        lotId: "lot-1",
        toLocationId: "Room 2"
      })
    );
  });

  it("allows whole-item relocation when no stocked lots exist", () => {
    const { screen } = renderOperations({ lots: [] });

    fireEvent.press(screen.getByRole("radio", { name: "Transfer" }));

    expect(screen.getByLabelText("Inventory movement quantity").props.value).toBe("6");
    expect(
      screen.getByLabelText("Record inventory transfer").props.accessibilityState.disabled
    ).toBe(false);
    expect(screen.queryByText(/Whole-item relocation is unavailable/)).toBeNull();
  });

  it("surfaces a relocation conflict returned by the canonical ledger", async () => {
    mockApplyMovement.mockRejectedValue(
      new Error("Move quantity must equal the selected lot's full on-hand quantity.")
    );
    const { screen } = renderOperations();

    fireEvent.press(screen.getByRole("radio", { name: "Move" }));
    fireEvent.press(screen.getByRole("radio", { name: "LOT-1 · 2 lb" }));
    fireEvent.changeText(
      screen.getByLabelText("Inventory movement destination"),
      "Room 2"
    );
    fireEvent.changeText(screen.getByLabelText("Inventory movement reason"), "Relocate");
    fireEvent.press(screen.getByLabelText("Record inventory move"));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Move quantity must equal the selected lot's full on-hand quantity."
      )
    );
  });

  it("sends signed adjustment evidence separately from its absolute quantity", async () => {
    mockApplyMovement.mockResolvedValue({ movement: { id: "movement-2" } });
    const { screen } = renderOperations();

    fireEvent.press(screen.getByRole("radio", { name: "Adjust" }));
    fireEvent.changeText(screen.getByLabelText("Inventory movement quantity"), "-2");
    fireEvent.changeText(
      screen.getByLabelText("Inventory movement reason"),
      "Cycle count"
    );
    fireEvent.press(screen.getByLabelText("Record inventory adjust"));

    await waitFor(() => expect(mockApplyMovement).toHaveBeenCalledTimes(1));
    expect(mockApplyMovement).toHaveBeenCalledWith(
      { facilityId: "facility-1" },
      "item-1",
      expect.objectContaining({
        movementType: "adjust",
        quantity: 2,
        adjustment: -2,
        reason: "Cycle count"
      })
    );
  });

  it("records hold against the selected scope's full audited balance", async () => {
    mockApplyMovement.mockResolvedValue({ movement: { id: "movement-hold" } });
    const { screen } = renderOperations();

    fireEvent.press(screen.getByRole("radio", { name: "Hold" }));
    fireEvent.press(screen.getByRole("radio", { name: "LOT-1 · 2 lb" }));
    expect(screen.getByLabelText("Inventory movement quantity").props).toEqual(
      expect.objectContaining({
        accessibilityState: { disabled: true },
        editable: false,
        value: "2"
      })
    );
    fireEvent.changeText(
      screen.getByLabelText("Inventory movement reason"),
      "Quality review"
    );
    fireEvent.press(screen.getByLabelText("Record inventory hold"));

    await waitFor(() => expect(mockApplyMovement).toHaveBeenCalledTimes(1));
    expect(mockApplyMovement).toHaveBeenCalledWith(
      { facilityId: "facility-1" },
      "item-1",
      expect.objectContaining({
        movementType: "hold",
        quantity: 2,
        reason: "Quality review",
        lotId: "lot-1"
      })
    );
  });

  it("reuses the same idempotency key after an ambiguous movement failure", async () => {
    mockApplyMovement
      .mockRejectedValueOnce(new Error("Response lost after submit"))
      .mockResolvedValueOnce({ movement: { id: "movement-2" } });
    const { screen } = renderOperations();

    fireEvent.changeText(screen.getByLabelText("Inventory movement quantity"), "5");
    fireEvent.changeText(screen.getByLabelText("Inventory movement reason"), "Delivery");
    fireEvent.press(screen.getByLabelText("Record inventory receive"));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Response lost after submit")
    );
    const firstKey = mockApplyMovement.mock.calls[0][2].idempotencyKey;

    fireEvent.press(screen.getByLabelText("Record inventory receive"));
    await waitFor(() => expect(mockApplyMovement).toHaveBeenCalledTimes(2));

    expect(mockApplyMovement.mock.calls[1][2].idempotencyKey).toBe(firstKey);
  });
});
