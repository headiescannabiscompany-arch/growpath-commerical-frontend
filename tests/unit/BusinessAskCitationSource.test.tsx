import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import { getBusinessDeskProviderOperation } from "@/api/businessDeskProvider";
import { getBusinessDeskRecord, getBusinessDeskRevision } from "@/api/businessDesk";
import { getBusinessInventoryItem } from "@/api/businessInventory";
import BusinessAskCitationSource from "@/features/businessDesk/BusinessAskCitationSource";

const mockParams = {
  operationId: "operation-1",
  citationId: "citation-1"
};

jest.mock("expo-router", () => ({
  Link: ({ children }: any) => children,
  useLocalSearchParams: () => mockParams
}));

jest.mock("@/api/businessDeskProvider", () => ({
  getBusinessDeskProviderOperation: jest.fn()
}));

jest.mock("@/api/businessDesk", () => ({
  businessDeskWorkspaceKey: (workspace: any) =>
    workspace.workspaceType === "facility"
      ? `facility:${workspace.facilityId}`
      : "commercial",
  getBusinessDeskRecord: jest.fn(),
  getBusinessDeskRevision: jest.fn()
}));

jest.mock("@/api/businessInventory", () => ({
  getBusinessInventoryItem: jest.fn()
}));

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ header, children }: any) => React.createElement(View, null, header, children);
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return ({ title, children }: any) =>
    React.createElement(View, null, React.createElement(Text, null, title), children);
});

const mockGetOperation = getBusinessDeskProviderOperation as jest.MockedFunction<
  typeof getBusinessDeskProviderOperation
>;
const mockGetRecord = getBusinessDeskRecord as jest.MockedFunction<
  typeof getBusinessDeskRecord
>;
const mockGetRevision = getBusinessDeskRevision as jest.MockedFunction<
  typeof getBusinessDeskRevision
>;
const mockGetInventoryItem = getBusinessInventoryItem as jest.MockedFunction<
  typeof getBusinessInventoryItem
>;

function operationPacket(citationOverrides: Record<string, unknown> = {}) {
  return {
    operation: {
      state: "succeeded",
      result: {
        type: "business_ask",
        citations: [
          {
            id: "citation-1",
            sourceType: "business_desk_record",
            recordId: "507f191e810c19729de86010",
            parentRecordId: null,
            recordKind: "quote",
            title: "Spring quote",
            version: 3,
            sourceDate: "2026-08-21T12:00:00.000Z",
            dateRange: { from: "2026-07-01", to: "2026-08-22" },
            ...citationOverrides
          }
        ]
      }
    }
  } as any;
}

describe("Business Ask citation source inspector", () => {
  beforeEach(() => {
    mockGetOperation.mockReset();
    mockGetRecord.mockReset();
    mockGetRevision.mockReset();
    mockGetInventoryItem.mockReset();
  });

  it("never fetches an arbitrary source until the authorized operation verifies it", async () => {
    mockGetOperation.mockRejectedValue(new Error("Not authorized"));
    const screen = render(
      <BusinessAskCitationSource
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );
    expect(await screen.findByText("Not authorized")).toBeTruthy();
    expect(mockGetRecord).not.toHaveBeenCalled();
    expect(mockGetInventoryItem).not.toHaveBeenCalled();
  });

  it("loads the exact cited revision only after citation membership is verified", async () => {
    mockGetOperation.mockResolvedValue(operationPacket());
    mockGetRevision.mockResolvedValue({
      recordId: "507f191e810c19729de86010",
      revisionNumber: 3,
      snapshot: { customer: "Authorized customer" }
    });
    const screen = render(
      <BusinessAskCitationSource
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );

    expect(
      await screen.findByText(/immutable snapshot for cited revision 3/i)
    ).toBeTruthy();
    expect(screen.getByText(/Authorized customer/i)).toBeTruthy();
    expect(mockGetRevision).toHaveBeenCalledWith(
      { workspaceType: "commercial" },
      "507f191e810c19729de86010",
      3,
      expect.objectContaining({ signal: expect.any(Object) })
    );
    expect(mockGetRecord).not.toHaveBeenCalled();
  });

  it("does not substitute the current record when the exact revision is unavailable", async () => {
    mockGetOperation.mockResolvedValue(operationPacket());
    mockGetRevision.mockRejectedValue(new Error("Exact cited revision is unavailable."));
    const screen = render(
      <BusinessAskCitationSource
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );

    expect(await screen.findByText(/Exact cited revision is unavailable/i)).toBeTruthy();
    await waitFor(() => expect(mockGetRevision).toHaveBeenCalledTimes(1));
    expect(mockGetRecord).not.toHaveBeenCalled();
  });

  it("opens the exact cited lot identity through its server-attested parent item", async () => {
    mockGetOperation.mockResolvedValue(
      operationPacket({
        sourceType: "business_inventory_lot",
        recordId: "507f191e810c19729de86021",
        parentRecordId: "507f191e810c19729de86020",
        recordKind: "business_inventory_lot",
        title: "Lot SOIL-22",
        version: null
      })
    );
    mockGetInventoryItem.mockResolvedValue({
      item: {
        id: "507f191e810c19729de86020",
        name: "Living soil",
        sku: "SOIL",
        quantity: 12,
        unit: "bag"
      },
      lots: [
        {
          id: "507f191e810c19729de86021",
          itemId: "507f191e810c19729de86020",
          lotCode: "SOIL-22",
          quantityOnHand: 4
        }
      ],
      movements: [],
      movementPage: null
    });

    const screen = render(
      <BusinessAskCitationSource
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );

    expect(
      await screen.findByText(/current authorized projection for the exact cited lot/i)
    ).toBeTruthy();
    expect(screen.getAllByText(/SOIL-22/i).length).toBeGreaterThan(0);
    expect(mockGetInventoryItem).toHaveBeenCalledWith({}, "507f191e810c19729de86020");
  });

  it("refuses to substitute a different or missing lot from the cited parent item", async () => {
    mockGetOperation.mockResolvedValue(
      operationPacket({
        sourceType: "business_inventory_lot",
        recordId: "507f191e810c19729de86021",
        parentRecordId: "507f191e810c19729de86020",
        recordKind: "business_inventory_lot",
        title: "Missing lot",
        version: null
      })
    );
    mockGetInventoryItem.mockResolvedValue({
      item: {
        id: "507f191e810c19729de86020",
        name: "Living soil",
        sku: "SOIL",
        quantity: 12,
        unit: "bag"
      },
      lots: [],
      movements: [],
      movementPage: null
    });

    const screen = render(
      <BusinessAskCitationSource
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );

    expect(
      await screen.findByText(/exact cited inventory lot identity is unavailable/i)
    ).toBeTruthy();
    expect(screen.queryByText(/Living soil/i)).toBeNull();
  });
});
