import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import HorticultureOperationsScreen from "@/features/horticulture/HorticultureOperationsScreen";

const mockListRecords = jest.fn();
const mockCreateRecord = jest.fn();
const mockUpdateRecord = jest.fn();
const mockAddCare = jest.fn();
const mockEvaluate = jest.fn();
const mockArchive = jest.fn();
const mockListInventory = jest.fn();
const mockGetInventoryItem = jest.fn();
const mockListEvidence = jest.fn();

jest.mock("@/api/horticulture", () => ({
  listHorticultureRecords: (...args: any[]) => mockListRecords(...args),
  createHorticultureRecord: (...args: any[]) => mockCreateRecord(...args),
  updateHorticultureRecord: (...args: any[]) => mockUpdateRecord(...args),
  addHorticultureCareEvent: (...args: any[]) => mockAddCare(...args),
  evaluateHorticultureFulfillment: (...args: any[]) => mockEvaluate(...args),
  archiveHorticultureRecord: (...args: any[]) => mockArchive(...args)
}));

jest.mock("@/api/businessInventory", () => ({
  listBusinessInventory: (...args: any[]) => mockListInventory(...args),
  getBusinessInventoryItem: (...args: any[]) => mockGetInventoryItem(...args)
}));

jest.mock("@/api/evidence", () => ({
  listEvidenceAssets: (...args: any[]) => mockListEvidence(...args)
}));

jest.mock("@/theme/appTheme", () => ({
  useAppTheme: () => ({
    palette: {
      accent: "#2455ff",
      accentText: "#ffffff",
      border: "#cccccc",
      danger: "#b42318",
      page: "#ffffff",
      surface: "#ffffff",
      success: "#087f23",
      text: "#111111",
      textMuted: "#555555",
      warning: "#9a4f00"
    }
  })
}));

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockAppPage({ children, header }: any) {
    return React.createElement(View, null, header, children);
  };
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return function MockAppCard({ children, title, subtitle }: any) {
    return React.createElement(
      View,
      null,
      React.createElement(Text, null, title),
      React.createElement(Text, null, subtitle),
      children
    );
  };
});

const baseRecord: any = {
  _id: "record-1",
  __v: 2,
  title: "Tomato starts",
  recordType: "nursery_batch",
  lifecycleStatus: "active",
  crop: { commonName: "Tomato", scientificName: "Solanum lycopersicum" },
  nursery: { quarantineStatus: "held" },
  productLabel: { present: true, reviewed: false },
  fulfillment: {
    mediaComplete: false,
    careCardComplete: false,
    packingReviewComplete: false,
    readiness: "blocked",
    reasons: ["Quarantine or hold review is not clear."]
  },
  careHistory: [],
  evidenceLinks: []
};

beforeEach(() => {
  jest.clearAllMocks();
  mockListRecords.mockResolvedValue([baseRecord]);
  mockCreateRecord.mockResolvedValue({
    ...baseRecord,
    _id: "record-2",
    title: "Pepper starts"
  });
  mockUpdateRecord.mockImplementation(async (_workspace, _record, patch) => ({
    ...baseRecord,
    ...patch,
    __v: 3
  }));
  mockAddCare.mockResolvedValue({
    ...baseRecord,
    __v: 3,
    careHistory: [{ notes: "Clear" }]
  });
  mockEvaluate.mockResolvedValue({
    ...baseRecord,
    __v: 3,
    fulfillment: { ...baseRecord.fulfillment, readiness: "blocked" }
  });
  mockArchive.mockResolvedValue({
    ...baseRecord,
    __v: 3,
    lifecycleStatus: "archived"
  });
  mockListInventory.mockResolvedValue([
    { id: "item-1", name: "Tomato starts", quantity: 8, unit: "plant" }
  ]);
  mockGetInventoryItem.mockResolvedValue({
    item: { id: "item-1" },
    lots: [
      {
        id: "lot-1",
        itemId: "item-1",
        lotCode: "TOM-A",
        quantityOnHand: 4,
        unit: "plant"
      }
    ],
    movements: []
  });
  mockListEvidence.mockResolvedValue([
    {
      id: "asset-1",
      assetType: "photo",
      purpose: "product",
      fileName: "tomato-label.jpg",
      source: "upload",
      uploadStatus: "uploaded",
      originalUri: "private://asset-1",
      qualityWarnings: []
    }
  ]);
});

test("shows truthful readiness and never presents it as an order or reservation", async () => {
  const screen = render(
    <HorticultureOperationsScreen
      workspace={{ workspaceType: "commercial" }}
      workspaceLabel="Commercial"
    />
  );
  await waitFor(() => expect(screen.getByText("Tomato starts")).toBeTruthy());
  expect(screen.getByText("Readiness blocked")).toBeTruthy();
  expect(screen.getByText(/does not reserve inventory/)).toBeTruthy();
  expect(screen.queryByText(/Order complete/i)).toBeNull();
});

test("creates a reviewed record and appends care history through separate actions", async () => {
  const screen = render(
    <HorticultureOperationsScreen
      workspace={{ workspaceType: "commercial" }}
      workspaceLabel="Commercial"
    />
  );
  await waitFor(() => expect(screen.getByText("Tomato starts")).toBeTruthy());
  fireEvent.changeText(screen.getByLabelText("Record title"), "Pepper starts");
  fireEvent.changeText(screen.getByLabelText("Common name"), "Pepper");
  fireEvent.press(screen.getByText("Create reviewed workspace record"));
  await waitFor(() => expect(mockCreateRecord).toHaveBeenCalled());
  expect(mockCreateRecord.mock.calls[0][1]).toEqual(
    expect.objectContaining({
      title: "Pepper starts",
      crop: expect.objectContaining({ commonName: "Pepper" }),
      inventoryItemId: null,
      inventoryLotId: null
    })
  );

  fireEvent.changeText(
    screen.getByLabelText("Care notes for Tomato starts"),
    "Inspected leaves and media."
  );
  fireEvent.press(screen.getAllByText("Add inspection")[1]);
  await waitFor(() =>
    expect(mockAddCare).toHaveBeenCalledWith(
      { workspaceType: "commercial" },
      expect.objectContaining({ _id: "record-1" }),
      expect.objectContaining({ notes: "Inspected leaves and media." })
    )
  );
});

test("links same-workspace B-02 inventory and retained evidence without copying stock", async () => {
  const screen = render(
    <HorticultureOperationsScreen
      workspace={{ workspaceType: "commercial" }}
      workspaceLabel="Commercial"
    />
  );
  await waitFor(() => expect(screen.getByText(/Link Tomato starts/)).toBeTruthy());
  fireEvent.press(screen.getByText(/Link Tomato starts/));
  await waitFor(() =>
    expect(mockUpdateRecord).toHaveBeenCalledWith(
      { workspaceType: "commercial" },
      expect.objectContaining({ _id: "record-1" }),
      { inventoryItemId: "item-1", inventoryLotId: null }
    )
  );
  fireEvent.press(screen.getByText("Link tomato-label.jpg"));
  await waitFor(() =>
    expect(mockUpdateRecord).toHaveBeenCalledWith(
      { workspaceType: "commercial" },
      expect.objectContaining({ _id: "record-1" }),
      expect.objectContaining({
        evidenceLinks: [expect.objectContaining({ type: "photo", id: "asset-1" })]
      })
    )
  );
});

test("requires explicit confirmation before archiving and removes only the confirmed record", async () => {
  const screen = render(
    <HorticultureOperationsScreen
      workspace={{ workspaceType: "commercial" }}
      workspaceLabel="Commercial"
    />
  );
  await waitFor(() => expect(screen.getByText("Tomato starts")).toBeTruthy());

  fireEvent.press(screen.getByRole("button", { name: "Archive Tomato starts" }));
  expect(mockArchive).not.toHaveBeenCalled();
  expect(screen.getByText("Archive Tomato starts?")).toBeTruthy();

  fireEvent.press(screen.getByRole("button", { name: "Confirm archive Tomato starts" }));
  await waitFor(() =>
    expect(mockArchive).toHaveBeenCalledWith(
      { workspaceType: "commercial" },
      expect.objectContaining({ _id: "record-1", __v: 2 })
    )
  );
  await waitFor(() => expect(screen.queryByText("Tomato starts")).toBeNull());
  expect(screen.getByText(/care history and audit evidence were retained/)).toBeTruthy();
});
