import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import ExpenseReceiptTool from "@/features/businessDesk/ExpenseReceiptTool";

const mockArchive = jest.fn();
const mockCreate = jest.fn();
const mockExport = jest.fn();
const mockList = jest.fn();
const mockUpdate = jest.fn();

jest.mock("@/api/businessDesk", () => ({
  archiveBusinessDeskRecord: (...args: any[]) => mockArchive(...args),
  businessDeskWorkspaceKey: (workspace: any) =>
    workspace.workspaceType === "facility"
      ? `facility:${workspace.facilityId}`
      : "commercial",
  createBusinessDeskRecord: (...args: any[]) => mockCreate(...args),
  listBusinessDeskRecords: (...args: any[]) => mockList(...args),
  requireBusinessDeskWorkspace: (workspace: any) => workspace,
  updateBusinessDeskRecord: (...args: any[]) => mockUpdate(...args)
}));

jest.mock("@/utils/exportToCsv", () => ({
  exportToCsv: (...args: any[]) => mockExport(...args)
}));

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ header, children }: any) => React.createElement(View, null, header, children);
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return ({ title, subtitle, children }: any) =>
    React.createElement(
      View,
      null,
      title ? React.createElement(Text, null, title) : null,
      subtitle ? React.createElement(Text, null, subtitle) : null,
      children
    );
});

jest.mock("@/components/forms/CalendarDateField", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return ({ accessibilityLabel, label, onChange }: any) =>
    React.createElement(
      Pressable,
      {
        accessibilityLabel: accessibilityLabel || label,
        onPress: () => onChange("2026-08-22")
      },
      React.createElement(Text, null, label)
    );
});

describe("ExpenseReceiptTool", () => {
  beforeEach(() => {
    mockArchive.mockReset();
    mockCreate.mockReset();
    mockExport.mockReset().mockResolvedValue({
      ok: true,
      filename: "growpath-business-expenses",
      rowCount: 1,
      method: "web-download"
    });
    mockList.mockReset().mockResolvedValue([]);
    mockUpdate.mockReset();
  });

  it("creates only a draft with exact manual minor units and no extraction claim", async () => {
    mockCreate.mockImplementation(async (_workspace, input) => ({
      _id: "expense-1",
      kind: "expense",
      title: input.title,
      status: input.status,
      version: 1,
      payload: input.payload
    }));
    const screen = render(
      <ExpenseReceiptTool
        workspace={{ workspaceType: "facility", facilityId: "facility-1" }}
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );
    await waitFor(() => expect(mockList).toHaveBeenCalled());

    fireEvent.changeText(screen.getByLabelText("Record title"), "Supply receipt");
    fireEvent.changeText(screen.getByLabelText("Merchant or vendor"), "Garden Supply");
    fireEvent.press(screen.getByLabelText("Expense date"));
    fireEvent.changeText(screen.getByLabelText("Full amount"), "15.25");
    fireEvent.changeText(screen.getByLabelText("Tax shown on source"), "1.25");
    fireEvent.changeText(screen.getByLabelText("Category"), "supplies");
    fireEvent.press(screen.getByLabelText("Add expense item line"));
    fireEvent.changeText(screen.getByLabelText("Expense item 1 description"), "Soil bag");
    fireEvent.changeText(screen.getByLabelText("Expense item 1 quantity"), "1.5");
    fireEvent.changeText(screen.getByLabelText("Expense item 1 unit amount"), "9.00");
    fireEvent.press(screen.getByLabelText("Save expense draft"));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith(
      { workspaceType: "facility", facilityId: "facility-1" },
      expect.objectContaining({
        kind: "expense",
        title: "Supply receipt",
        status: "draft",
        idempotencyKey: expect.stringMatching(/^expense-create-/),
        payload: {
          expense: expect.objectContaining({
            merchant: "Garden Supply",
            amountMinor: 1525,
            taxMinor: 125,
            currency: "USD",
            minorUnitDigits: 2,
            category: "supplies",
            receiptAssetId: "",
            extractionProvenance: expect.objectContaining({ origin: "manual" }),
            review: expect.objectContaining({ status: "draft" }),
            itemLines: [
              expect.objectContaining({
                description: "Soil bag",
                quantityMicros: 1_500_000,
                unitAmountMinor: 900,
                lineTotalMinor: 1350
              })
            ]
          })
        }
      })
    );
  });

  it.each([
    ["Review saved expense draft", "reviewed"],
    ["Mark saved expense needs correction", "correction_required"],
    ["Reject saved expense draft", "rejected"]
  ])("uses a transition-only request for %s", async (actionLabel, expectedStatus) => {
    const draftRecord = {
      _id: "expense-1",
      kind: "expense",
      title: "Receipt",
      status: "draft",
      version: 3,
      payload: {
        expense: {
          merchant: "Garden Supply",
          occurredAt: "2026-08-22T16:00:00.000Z",
          amountMinor: 1000,
          taxMinor: 0,
          currency: "USD",
          minorUnitDigits: 2,
          category: "supplies",
          paymentMethod: "",
          itemLines: [],
          notes: ""
        }
      }
    };
    mockList.mockResolvedValue([draftRecord]);
    mockUpdate.mockImplementation(async (_workspace, _id, input) => ({
      ...draftRecord,
      status: input.status,
      version: 4
    }));

    const screen = render(
      <ExpenseReceiptTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );
      fireEvent.press(
        await screen.findByLabelText("Open expense / receipt helper Receipt")
      );
    fireEvent.press(screen.getByLabelText(actionLabel));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate).toHaveBeenCalledWith(
      { workspaceType: "commercial" },
      "expense-1",
      {
        expectedVersion: 3,
        status: expectedStatus,
        idempotencyKey: expect.stringMatching(/^expense-transition-/)
      }
    );
    const transitionInput = mockUpdate.mock.calls[0][2];
    expect(transitionInput).not.toHaveProperty("title");
    expect(transitionInput).not.toHaveProperty("payload");
    expect(transitionInput).not.toHaveProperty("sourceLinks");
  });

  it("keeps review disabled until an exact draft has been saved", async () => {
    const screen = render(
      <ExpenseReceiptTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    fireEvent.changeText(screen.getByLabelText("Record title"), "Receipt");
    fireEvent.press(screen.getByLabelText("Expense date"));
    fireEvent.changeText(screen.getByLabelText("Full amount"), "10");
    expect(
      screen.getByLabelText("Review saved expense draft").props.accessibilityState
        .disabled
    ).toBe(true);
    expect(mockCreate).not.toHaveBeenCalled();
    expect(screen.getByText(/No file is uploaded or sent to AI/i)).toBeTruthy();
  });

  it("labels client-only share preparation without claiming an audited export", async () => {
    mockList.mockResolvedValue([
      {
        _id: "expense-1",
        kind: "expense",
        title: "Receipt",
        status: "reviewed",
        version: 4,
        payload: {
          expense: {
            merchant: "Garden Supply",
            occurredAt: "2026-08-22T16:00:00.000Z",
            amountMinor: 1000,
            taxMinor: 0,
            currency: "USD",
            minorUnitDigits: 2,
            category: "supplies",
            paymentMethod: "",
            itemLines: [],
            notes: ""
          }
        }
      }
    ]);
    mockExport.mockResolvedValue({
      ok: true,
      filename: "growpath-business-expenses",
      rowCount: 1,
      method: "native-share-text"
    });
    const screen = render(
      <ExpenseReceiptTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );
    await screen.findByText("Receipt");
    fireEvent.press(screen.getByLabelText("Export filtered saved expenses"));

    expect(
      await screen.findByText(/opened the system share flow.*no backend export audit/i)
    ).toBeTruthy();
    expect(screen.queryByText(/^Exported /i)).toBeNull();
  });
});
