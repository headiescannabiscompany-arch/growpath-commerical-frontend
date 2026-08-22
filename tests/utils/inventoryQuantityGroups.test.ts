import {
  groupInventoryQuantities,
  inventoryQuantitySummary
} from "../../src/utils/inventoryQuantityGroups";

describe("inventory quantity groups", () => {
  it("keeps unlike counting units separate and combines case-equivalent units", () => {
    const items = [
      { quantity: 2, unit: "bags" },
      { quantityOnHand: 3, unit: "BAGS" },
      { qty: 8, unit: "lb" },
      { quantity: 1, unit: "" }
    ];

    expect(groupInventoryQuantities(items)).toEqual([
      { unit: "bags", quantity: 5 },
      { unit: "lb", quantity: 8 },
      { unit: "unit not set", quantity: 1 }
    ]);
    expect(inventoryQuantitySummary(items)).toBe("5 bags · 8 lb · 1 unit not set");
  });
});
