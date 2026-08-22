import React from "react";
import { render } from "@testing-library/react-native";

import {
  BusinessInventoryAlerts,
  businessInventoryAlertEntries
} from "@/components/inventory/BusinessInventoryAlerts";

const palette = {
  accent: "#198754",
  border: "#cad5cf",
  danger: "#b42318",
  surface: "#ffffff",
  text: "#17231c",
  textMuted: "#5f6f65",
  warning: "#9a6700"
};

jest.mock("@/theme/appTheme", () => ({
  useAppTheme: () => ({ palette })
}));

const alerts = {
  lowStock: true,
  outOfStock: false,
  held: true,
  expiredLots: 1,
  expiringSoonLots: 2,
  lotQuantityExceedsItem: true,
  unallocatedQuantity: 3,
  sourceAgeDays: 8
};

describe("BusinessInventoryAlerts", () => {
  it("renders only canonical server flags with their record evidence", () => {
    const entries = businessInventoryAlertEntries(alerts);

    expect(entries.map((entry) => entry.key)).toEqual([
      "low-stock",
      "held",
      "expired",
      "expiring-soon",
      "lot-balance-discrepancy",
      "unallocated-quantity",
      "source-freshness"
    ]);
    expect(entries.find((entry) => entry.key === "expiring-soon")?.title).toBe(
      "2 lots expire within 30 days"
    );

    const screen = render(<BusinessInventoryAlerts item={{ alerts }} />);
    expect(
      screen.getByRole("header", { name: "Evidence-linked inventory alerts" }).props[
        "aria-level"
      ]
    ).toBe(2);
    expect(screen.getByText("Lot balance discrepancy")).toBeTruthy();
    expect(screen.getByText("Source evidence age: 8 days")).toBeTruthy();
    expect(
      screen.getByText(
        "Evidence: attached lot balances exceed the canonical item on-hand balance."
      )
    ).toBeTruthy();
  });

  it("keeps missing freshness missing and omits unflagged client guesses", () => {
    const entries = businessInventoryAlertEntries({
      lowStock: false,
      outOfStock: false,
      held: false,
      expiredLots: 0,
      expiringSoonLots: 0,
      lotQuantityExceedsItem: false,
      unallocatedQuantity: 0,
      sourceAgeDays: null
    });

    expect(entries).toEqual([
      expect.objectContaining({
        key: "source-freshness",
        title: "Source freshness not recorded"
      })
    ]);
  });
});
