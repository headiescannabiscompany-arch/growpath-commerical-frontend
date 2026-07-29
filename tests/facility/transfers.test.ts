import {
  canManageFacilityTransfers,
  canShipFacilityTransfers,
  normalizeFacilityTransfers,
  transferTotal,
  validateFacilityTransfer
} from "../../src/features/facility/transfers";

describe("facility licensed transfers", () => {
  test("keeps facility cannabis transfers isolated", () => {
    expect(
      normalizeFacilityTransfers(
        {
          orders: [
            { id: "a", facilityId: "f1", orderType: "licensed_cannabis_transfer" },
            { id: "b", facilityId: "f2", orderType: "licensed_cannabis_transfer" },
            { id: "c", facilityId: "f1", orderType: "storefront_order" }
          ]
        },
        "f1"
      ).map((row) => row.id)
    ).toEqual(["a"]);
  });

  test("requires inventory and licensed recipient identity", () => {
    expect(validateFacilityTransfer({ quantity: 0, unitPrice: 2 })).toEqual([
      "Select an inventory lot.",
      "Quantity must be greater than zero.",
      "Recipient business is required.",
      "Recipient license is required.",
      "Recipient jurisdiction is required."
    ]);
  });

  test("calculates money and applies role boundaries", () => {
    expect(transferTotal(2.5, 18.4)).toBe(46);
    expect(canManageFacilityTransfers("OWNER")).toBe(true);
    expect(canManageFacilityTransfers("STAFF")).toBe(false);
    expect(canShipFacilityTransfers("STAFF")).toBe(true);
    expect(canShipFacilityTransfers("VIEWER")).toBe(false);
  });
});
