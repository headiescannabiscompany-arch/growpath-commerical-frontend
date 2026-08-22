import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import VendorCompareTool from "@/features/businessDesk/VendorCompareTool";

const mockArchive = jest.fn();
const mockCalculate = jest.fn();
const mockCreate = jest.fn();
const mockInventoryDetail = jest.fn();
const mockInventory = jest.fn();
const mockList = jest.fn();
const mockUpdate = jest.fn();

jest.mock("@/api/businessDesk", () => ({
  archiveBusinessDeskRecord: (...args: any[]) => mockArchive(...args),
  businessDeskWorkspaceKey: (workspace: any) =>
    workspace.workspaceType === "facility"
      ? `facility:${workspace.facilityId}`
      : "commercial",
  calculateBusinessDesk: (...args: any[]) => mockCalculate(...args),
  createBusinessDeskRecord: (...args: any[]) => mockCreate(...args),
  listBusinessDeskRecords: (...args: any[]) => mockList(...args),
  requireBusinessDeskWorkspace: (workspace: any) => workspace,
  updateBusinessDeskRecord: (...args: any[]) => mockUpdate(...args)
}));

jest.mock("@/api/businessInventory", () => ({
  getBusinessInventoryItem: (...args: any[]) => mockInventoryDetail(...args),
  mergeBusinessInventoryMovements: (current: any[], older: any[]) => {
    const merged = new Map<string, any>();
    [...current, ...older].forEach((movement) =>
      merged.set(String(movement.id || movement._id), movement)
    );
    return [...merged.values()];
  },
  listBusinessInventory: (...args: any[]) => mockInventory(...args)
}));

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockAppPage({ header, children }: any) {
    return React.createElement(View, null, header, children);
  };
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return function MockAppCard({ title, subtitle, children }: any) {
    return React.createElement(
      View,
      null,
      title ? React.createElement(Text, null, title) : null,
      subtitle ? React.createElement(Text, null, subtitle) : null,
      children
    );
  };
});

jest.mock("@/components/forms/CalendarDateField", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return function MockCalendarDateField({ accessibilityLabel, label, onChange }: any) {
    return React.createElement(
      Pressable,
      {
        accessibilityLabel: accessibilityLabel || label,
        onPress: () =>
          onChange(
            String(accessibilityLabel).includes("expiry")
              ? "2026-09-30T12:00"
              : "2026-08-22T12:00"
          )
      },
      React.createElement(Text, null, label)
    );
  };
});

function calculatedVendor(input: any) {
  return {
    calculator: "vendor",
    currency: input.currency,
    minorUnitDigits: input.minorUnitDigits,
    asOf: input.asOf,
    requestedQuantityMicros: input.requestedQuantityMicros,
    offers: [
      {
        index: 0,
        orderedQuantityMicros: 2_000_000,
        productCostMinor: 2000,
        proposedDiscountMinor: 0,
        discountMinor: 0,
        discountReviewed: true,
        knownSubtotalMinor: 2050,
        taxMinor: null,
        dutyMinor: null,
        landedCostMinor: null,
        effectiveUnitCostMinor: null,
        availability: "in_stock",
        expiresAt: null,
        expired: false,
        eligibleForRecommendation: false,
        complete: false,
        incompleteReasons: ["TAX_UNKNOWN", "DUTY_UNKNOWN"]
      },
      {
        index: 1,
        orderedQuantityMicros: 2_000_000,
        productCostMinor: 1800,
        proposedDiscountMinor: 0,
        discountMinor: 0,
        discountReviewed: true,
        knownSubtotalMinor: 1850,
        taxMinor: 0,
        dutyMinor: 0,
        landedCostMinor: 1850,
        effectiveUnitCostMinor: 925,
        availability: "in_stock",
        expiresAt: null,
        expired: false,
        eligibleForRecommendation: true,
        complete: true,
        incompleteReasons: []
      }
    ],
    recommendedOfferIndex: 1,
    complete: false
  };
}

describe("VendorCompareTool", () => {
  beforeEach(() => {
    mockArchive.mockReset();
    mockCalculate
      .mockReset()
      .mockImplementation(async (_workspace, input) => calculatedVendor(input));
    mockCreate.mockReset();
    mockInventoryDetail.mockReset().mockResolvedValue({
      item: null,
      lots: [],
      movements: [],
      movementPage: null
    });
    mockInventory.mockReset().mockResolvedValue([
      {
        id: "64b000000000000000000001",
        name: "Living soil",
        sku: "SOIL-1",
        quantity: 8,
        unit: "bag"
      }
    ]);
    mockList.mockReset().mockResolvedValue([]);
    mockUpdate.mockReset();
  });

  it("distinguishes known subtotal from complete landed cost and links B-02 read-only", async () => {
    mockCreate.mockImplementation(async (_workspace, input) => ({
      _id: "64b000000000000000000101",
      kind: "vendor_comparison",
      title: input.title,
      status: input.status,
      version: 1,
      payload: input.payload,
      sourceLinks: input.sourceLinks
    }));
    const screen = render(
      <VendorCompareTool
        workspace={{ workspaceType: "facility", facilityId: "facility-1" }}
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );
    await waitFor(() =>
      expect(mockInventory).toHaveBeenCalledWith({ facilityId: "facility-1" })
    );

    fireEvent.changeText(
      screen.getByLabelText("Vendor comparison record title"),
      "Soil comparison"
    );
    fireEvent.changeText(screen.getByLabelText("Vendor comparison item"), "Living soil");
    fireEvent.changeText(screen.getByLabelText("Vendor requested quantity"), "2");
    fireEvent.press(screen.getByLabelText("Link inventory item Living soil"));
    fireEvent.changeText(screen.getByLabelText("Vendor offer 1 name"), "Vendor A");
    fireEvent.changeText(screen.getByLabelText("Vendor offer 1 unit price"), "10");
    fireEvent.changeText(screen.getByLabelText("Vendor offer 1 shipping"), "0.50");
    fireEvent.press(screen.getByLabelText("Offer 1 availability In stock"));
    fireEvent.press(screen.getByLabelText("Add vendor offer"));
    fireEvent.changeText(screen.getByLabelText("Vendor offer 2 name"), "Vendor B");
    fireEvent.changeText(screen.getByLabelText("Vendor offer 2 unit price"), "9");
    fireEvent.changeText(screen.getByLabelText("Vendor offer 2 shipping"), "0.50");
    fireEvent.changeText(screen.getByLabelText("Vendor offer 2 tax"), "0");
    fireEvent.changeText(screen.getByLabelText("Vendor offer 2 duty"), "0");
    fireEvent.press(screen.getByLabelText("Offer 2 availability In stock"));
    fireEvent.press(screen.getByLabelText("Calculate vendor comparison"));

    await waitFor(() => expect(mockCalculate).toHaveBeenCalledTimes(1));
    const calculation = mockCalculate.mock.calls[0][1];
    expect(calculation).toEqual(
      expect.objectContaining({
        calculator: "vendor",
        currency: "USD",
        minorUnitDigits: 2,
        requestedQuantityMicros: 2_000_000,
        offers: [
          expect.objectContaining({
            vendorName: "Vendor A",
            unitPriceMinor: 1000,
            taxMinor: null,
            dutyMinor: null
          }),
          expect.objectContaining({
            vendorName: "Vendor B",
            unitPriceMinor: 900,
            taxMinor: 0,
            dutyMinor: 0
          })
        ]
      })
    );
    expect(screen.getByText(/Known-cost subtotal:.*20\.50/i)).toBeTruthy();
    expect(screen.getByText(/Complete landed cost:.*18\.50/i)).toBeTruthy();
    expect(screen.getByText(/Recommended eligible cost/i)).toBeTruthy();
    expect(screen.getByText(/tax is unknown, duty is unknown/i)).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Select purchase offer 2"));
    fireEvent.changeText(
      screen.getByLabelText("Purchase request review reason"),
      "Lowest complete available offer"
    );
    fireEvent.press(screen.getByLabelText("Save vendor comparison"));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith(
      { workspaceType: "facility", facilityId: "facility-1" },
      expect.objectContaining({
        kind: "vendor_comparison",
        status: "needed",
        idempotencyKey: expect.stringMatching(/^vendor_comparison-create-/),
        sourceLinks: [
          {
            entityType: "inventory_item",
            entityId: "64b000000000000000000001",
            label: "Living soil"
          }
        ],
        payload: {
          vendorComparison: expect.objectContaining({
            itemName: "Living soil",
            inventoryItemId: "64b000000000000000000001",
            requestedQuantityMicros: 2_000_000,
            purchaseRequest: expect.objectContaining({
              status: "needed",
              selectedOfferIndex: 1,
              inventoryReceiptMovementId: "",
              inventoryReceiptRecordedAt: null
            })
          })
        }
      })
    );
    expect(screen.getByLabelText("Purchase request current state").props.children).toBe(
      "Needed"
    );
    expect(
      screen.getByText(/never changes stock, cost, location, lot, or receiving/i)
    ).toBeTruthy();
  });

  it("uses exact transition-only revisions through verified B-02 receipt", async () => {
    let currentRecord: any = null;
    mockCreate.mockImplementation(async (_workspace, input) => {
      currentRecord = {
        _id: "64b000000000000000000102",
        kind: "vendor_comparison",
        title: input.title,
        status: input.status,
        version: 1,
        payload: input.payload,
        sourceLinks: input.sourceLinks
      };
      return currentRecord;
    });
    mockUpdate.mockImplementation(async (_workspace, _id, input) => {
      const request = {
        ...currentRecord.payload.vendorComparison.purchaseRequest,
        status: input.status
      };
      if (input.transitionEvidence?.orderOrigin) {
        request.orderOrigin = input.transitionEvidence.orderOrigin;
        request.externalOrderReference =
          input.transitionEvidence.externalOrderReference || "";
        request.orderVerificationStatus = "unverified_manual";
        request.orderRecordedAt = "2026-08-22T17:00:00.000Z";
      }
      if (input.transitionEvidence?.inventoryReceiptMovementId) {
        request.inventoryReceiptMovementId =
          input.transitionEvidence.inventoryReceiptMovementId;
        request.inventoryReceiptRecordedAt = "2026-08-22T18:00:00.000Z";
        request.orderVerificationStatus = "verified_b02_receipt";
      }
      currentRecord = {
        ...currentRecord,
        status: input.status,
        version: currentRecord.version + 1,
        payload: {
          vendorComparison: {
            ...currentRecord.payload.vendorComparison,
            purchaseRequest: request
          }
        }
      };
      return currentRecord;
    });
    mockInventoryDetail.mockResolvedValue({
      item: null,
      lots: [],
      movements: [
        {
          id: "movement-receive-1",
          movementType: "receive",
          quantityDelta: 5,
          reason: "Supplier delivery",
          occurredAt: "2026-08-22T18:00:00.000Z"
        },
        {
          id: "movement-consume-1",
          movementType: "consume",
          quantityDelta: -1,
          reason: "Used"
        }
      ],
      movementPage: null
    });
    const screen = render(
      <VendorCompareTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    fireEvent.changeText(screen.getByLabelText("Vendor comparison record title"), "Pots");
    fireEvent.changeText(screen.getByLabelText("Vendor comparison item"), "Pots");
    fireEvent.changeText(screen.getByLabelText("Vendor offer 1 name"), "Vendor");
    fireEvent.changeText(screen.getByLabelText("Vendor offer 1 unit price"), "1");
    fireEvent.changeText(screen.getByLabelText("Vendor offer 1 tax"), "0");
    fireEvent.changeText(screen.getByLabelText("Vendor offer 1 duty"), "0");
    fireEvent.press(screen.getByLabelText("Link inventory item Living soil"));
    fireEvent.press(screen.getByLabelText("Select purchase offer 1"));
    fireEvent.changeText(
      screen.getByLabelText("Purchase request review reason"),
      "Complete quote"
    );
    fireEvent.press(screen.getByLabelText("Move purchase request to reviewing"));
    expect(await screen.findByText(/Save the comparison as Needed first/i)).toBeTruthy();
    expect(mockUpdate).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText("Save vendor comparison"));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    await screen.findByText(/Vendor comparison Needed revision 1 saved/i);
    fireEvent.press(screen.getByLabelText("Move purchase request to reviewing"));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    await screen.findByText(/exact saved revision is now under review/i);
    expect(mockUpdate.mock.calls[0][2]).toEqual({
      expectedVersion: 1,
      status: "reviewing",
      idempotencyKey: expect.stringMatching(/^vendor_comparison-transition-/)
    });
    expect(mockUpdate.mock.calls[0][2]).not.toEqual(
      expect.objectContaining({ title: expect.anything() })
    );
    expect(mockUpdate.mock.calls[0][2]).not.toEqual(
      expect.objectContaining({ payload: expect.anything() })
    );
    expect(mockUpdate.mock.calls[0][2]).not.toEqual(
      expect.objectContaining({ sourceLinks: expect.anything() })
    );

    fireEvent.press(screen.getByLabelText("Approve purchase request"));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(2));
    await screen.findByText(/exact reviewed revision is approved/i);
    expect(mockUpdate.mock.calls[1][2]).toEqual(
      expect.objectContaining({ expectedVersion: 2, status: "approved" })
    );

    fireEvent.changeText(
      screen.getByLabelText("Outside order reference"),
      "PO-EXTERNAL-42"
    );
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Record off-platform order"));
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(3));
    await screen.findByText(/Outside order recorded as unverified/i);
    expect(mockUpdate.mock.calls[2][2]).toEqual(
      expect.objectContaining({
        expectedVersion: 3,
        status: "ordered",
        transitionEvidence: {
          orderOrigin: "manual_off_platform",
          externalOrderReference: "PO-EXTERNAL-42"
        }
      })
    );
    await waitFor(() =>
      expect(mockInventoryDetail).toHaveBeenCalledWith({}, "64b000000000000000000001", {
        movementLimit: 100
      })
    );
    fireEvent.press(screen.getByLabelText("Use B-02 receipt movement-receive-1"));
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Verify received from B-02 receipt"));
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(4));
    expect(mockUpdate.mock.calls[3][2]).toEqual(
      expect.objectContaining({
        expectedVersion: 4,
        status: "received",
        transitionEvidence: { inventoryReceiptMovementId: "movement-receive-1" }
      })
    );
    expect(screen.getByText(/B-03 did not change inventory/i)).toBeTruthy();
  });

  it("reloads and archives a saved comparison without inventory mutation", async () => {
    const record = {
      _id: "64b000000000000000000103",
      kind: "vendor_comparison",
      title: "Saved supplier review",
      status: "needed",
      version: 4,
      payload: {
        vendorComparison: {
          itemName: "Living soil",
          inventoryItemId: "64b000000000000000000001",
          requestedQuantityMicros: 3_000_000,
          asOf: "2026-08-22T16:00:00.000Z",
          currency: "USD",
          minorUnitDigits: 2,
          offers: [
            {
              vendorName: "Vendor A",
              unitPriceMinor: 1200,
              currency: "USD",
              minimumQuantityMicros: 0,
              shippingCostMinor: 0,
              feesMinor: 0,
              discount: {
                order: "percent_then_fixed",
                percentBasisPoints: 0,
                fixedMinor: 0,
                currency: "USD"
              },
              discountReviewed: false,
              taxMinor: null,
              dutyMinor: null,
              availability: "unknown",
              expiresAt: null,
              leadTimeDays: null,
              terms: "",
              notes: ""
            }
          ],
          purchaseRequest: {
            status: "needed",
            selectedOfferIndex: null,
            reviewReason: "",
            orderOrigin: "none"
          },
          notes: ""
        }
      },
      sourceLinks: [
        {
          entityType: "inventory_item",
          entityId: "64b000000000000000000001",
          label: "Living soil"
        }
      ]
    };
    mockList.mockResolvedValue([record]);
    mockArchive.mockResolvedValue({ ...record, archivedAt: "2026-08-22T17:00:00.000Z" });
    const screen = render(
      <VendorCompareTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );
    await screen.findByText("Saved supplier review");
    fireEvent.press(screen.getByLabelText("Open vendor compare Saved supplier review"));
    expect(screen.getByLabelText("Vendor requested quantity").props.value).toBe("3");
    expect(screen.getByLabelText("Vendor offer 1 unit price").props.value).toBe("12.00");
    fireEvent.changeText(
      screen.getByLabelText("Business Desk archive reason"),
      "Supplier review complete"
    );
    fireEvent.press(screen.getByLabelText("Archive Business Desk record"));
    await waitFor(() =>
      expect(mockArchive).toHaveBeenCalledWith(
        { workspaceType: "commercial" },
        "64b000000000000000000103",
        expect.objectContaining({
          expectedVersion: 4,
          reason: "Supplier review complete",
          idempotencyKey: expect.stringMatching(/^vendor_comparison-archive-/)
        })
      )
    );
  });
});
