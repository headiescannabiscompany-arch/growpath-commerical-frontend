import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CashFlowSnapshotTool from "@/features/businessDesk/CashFlowSnapshotTool";

const mockArchive = jest.fn();
const mockCalculate = jest.fn();
const mockCreate = jest.fn();
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
  return ({ accessibilityLabel, label, onChange }: any) => {
    const name = String(accessibilityLabel || label);
    let value = "2026-08-01T09:00";
    if (name.includes("snapshot as of")) value = "2026-08-22T12:00";
    if (name.includes("due date")) value = "2026-09-01T12:00";
    return React.createElement(
      Pressable,
      { accessibilityLabel: name, onPress: () => onChange(value) },
      React.createElement(Text, null, label)
    );
  };
});

function cashResult(input: any) {
  return {
    calculator: "cash_flow",
    currency: input.currency,
    minorUnitDigits: input.minorUnitDigits,
    asOf: input.asOf,
    staleAfterDays: input.staleAfterDays,
    currentCashMinor: input.currentCashMinor,
    evidenceSummary: {
      freshCount: 0,
      staleCount: 1,
      recordedCount: 0,
      expectedCount: 1
    },
    horizons: [30, 60, 90].map((days) => ({
      days,
      through: "2026-09-21T16:00:00.000Z",
      recordedInflowMinor: 0,
      recordedOutflowMinor: 0,
      expectedInflowMinor: 12500,
      expectedOutflowMinor: 0,
      netMovementMinor: 12500,
      staleEntryCount: 1,
      projectedCashMinor:
        input.currentCashMinor === null ? null : input.currentCashMinor + 12500
    })),
    complete: input.currentCashMinor !== null,
    incompleteReasons: input.currentCashMinor === null ? ["CURRENT_CASH_UNKNOWN"] : []
  };
}

describe("CashFlowSnapshotTool", () => {
  beforeEach(() => {
    mockArchive.mockReset();
    mockCalculate
      .mockReset()
      .mockImplementation(async (_workspace, input) => cashResult(input));
    mockCreate.mockReset();
    mockList.mockReset().mockResolvedValue([]);
    mockUpdate.mockReset();
  });

  it("calculates and saves explicit source-labeled 30/60/90 scenarios without inventing cash", async () => {
    mockCreate.mockImplementation(async (_workspace, input) => ({
      _id: "64b000000000000000000201",
      kind: "cash_flow_snapshot",
      title: input.title,
      status: input.status,
      version: 1,
      payload: input.payload,
      sourceLinks: input.sourceLinks
    }));
    const screen = render(
      <CashFlowSnapshotTool
        workspace={{ workspaceType: "facility", facilityId: "facility-2" }}
        canViewCurrentCash
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );
    await waitFor(() =>
      expect(mockList).toHaveBeenCalledWith(
        { workspaceType: "facility", facilityId: "facility-2" },
        { kind: "cash_flow_snapshot" },
        { signal: expect.anything() }
      )
    );

    fireEvent.changeText(
      screen.getByLabelText("Cash-flow record title"),
      "Fall snapshot"
    );
    fireEvent.press(screen.getByLabelText("Cash-flow snapshot as of date and time"));
    fireEvent.changeText(screen.getByLabelText("Cash-flow freshness days"), "10");
    fireEvent.press(screen.getByLabelText("Add cash-flow entry"));
    fireEvent.changeText(
      screen.getByLabelText("Cash-flow entry 1 label"),
      "Reviewed quote"
    );
    fireEvent.changeText(screen.getByLabelText("Cash-flow entry 1 amount"), "125.00");
    fireEvent.press(screen.getByLabelText("Cash-flow entry 1 due date and time"));
    fireEvent.press(
      screen.getByLabelText("Cash-flow entry 1 source recorded date and time")
    );
    fireEvent.press(
      screen.getByLabelText("Cash-flow entry 1 source freshness date and time")
    );
    fireEvent.press(
      screen.getByLabelText("Cash-flow entry 1 source type Reviewed quote expectation")
    );
    fireEvent.changeText(
      screen.getByLabelText("Cash-flow entry 1 source record id"),
      "64b000000000000000000301"
    );
    fireEvent.press(screen.getByLabelText("Calculate cash-flow snapshot"));

    await waitFor(() => expect(mockCalculate).toHaveBeenCalledTimes(1));
    expect(mockCalculate).toHaveBeenCalledWith(
      { workspaceType: "facility", facilityId: "facility-2" },
      expect.objectContaining({
        calculator: "cash_flow",
        currency: "USD",
        minorUnitDigits: 2,
        currentCashMinor: null,
        staleAfterDays: 10,
        horizonsDays: [30, 60, 90],
        entries: [
          expect.objectContaining({
            label: "Reviewed quote",
            direction: "inflow",
            confidence: "expected",
            amountMinor: 12500,
            currency: "USD",
            sourceType: "quote",
            sourceRecordId: "64b000000000000000000301",
            sourceRecordedAt: expect.any(String),
            sourceFreshnessAt: expect.any(String)
          })
        ]
      })
    );
    expect(screen.getByText(/current cash is unknown/i)).toBeTruthy();
    expect(screen.getAllByText(/stale source/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Expected in:.*125\.00/i)).toHaveLength(3);
    expect(screen.getAllByText(/Projected cash: Unknown/i).length).toBe(3);

    await waitFor(() =>
      expect(
        screen.getByLabelText("Save cash-flow draft").props.accessibilityState.disabled
      ).toBe(false)
    );
    fireEvent.press(screen.getByLabelText("Save cash-flow draft"));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith(
      { workspaceType: "facility", facilityId: "facility-2" },
      expect.objectContaining({
        kind: "cash_flow_snapshot",
        status: "draft",
        idempotencyKey: expect.stringMatching(/^cash_flow_snapshot-create-/),
        sourceLinks: [
          {
            entityType: "quote",
            entityId: "64b000000000000000000301",
            label: "Reviewed quote"
          }
        ],
        payload: {
          cashFlowSnapshot: expect.objectContaining({
            currentCashMinor: null,
            currency: "USD",
            minorUnitDigits: 2,
            horizonsDays: [30, 60, 90],
            staleAfterDays: 10
          })
        }
      })
    );
    expect(
      screen.getByText(/not a bank-connected or verified bank balance/i)
    ).toBeTruthy();
    expect(
      screen.getByText(/not bookkeeping, a bank balance, tax advice, or an ML forecast/i)
    ).toBeTruthy();
  });

  it("requires evidence IDs, creates a draft, then reviews by transition only", async () => {
    const createdRecord = {
      _id: "64b000000000000000000202",
      kind: "cash_flow_snapshot",
      title: "Operating cash",
      status: "draft",
      version: 1,
      payload: {},
      sourceLinks: []
    };
    mockCreate.mockImplementation(async (_workspace, input) => {
      createdRecord.payload = input.payload;
      createdRecord.sourceLinks = input.sourceLinks;
      return createdRecord;
    });
    mockUpdate.mockImplementation(async (_workspace, id, input) => ({
      ...createdRecord,
      _id: id,
      status: input.status,
      version: 2
    }));
    const screen = render(
      <CashFlowSnapshotTool
        workspace={{ workspaceType: "commercial" }}
        canViewCurrentCash
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    fireEvent.changeText(
      screen.getByLabelText("Cash-flow record title"),
      "Operating cash"
    );
    fireEvent.press(screen.getByLabelText("Cash-flow snapshot as of date and time"));
    fireEvent.press(screen.getByLabelText("Add cash-flow entry"));
    fireEvent.changeText(screen.getByLabelText("Cash-flow entry 1 label"), "Invoice");
    fireEvent.changeText(screen.getByLabelText("Cash-flow entry 1 amount"), "50");
    fireEvent.press(screen.getByLabelText("Cash-flow entry 1 due date and time"));
    fireEvent.press(
      screen.getByLabelText("Cash-flow entry 1 source recorded date and time")
    );
    fireEvent.press(
      screen.getByLabelText("Cash-flow entry 1 source freshness date and time")
    );
    fireEvent.press(
      screen.getByLabelText("Cash-flow entry 1 source type Payment provider evidence")
    );
    fireEvent.press(screen.getByLabelText("Save cash-flow draft"));

    expect(
      await screen.findByText(/needs the authorized source or evidence ID/i)
    ).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();

    fireEvent.changeText(
      screen.getByLabelText("Cash-flow entry 1 source record id"),
      "provider-invoice-9"
    );
    expect(
      screen.getByLabelText("Review saved cash-flow draft").props.accessibilityState
        .disabled
    ).toBe(true);
    fireEvent.press(screen.getByLabelText("Save cash-flow draft"));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][1].status).toBe("draft");
    await waitFor(() =>
      expect(
        screen.getByLabelText("Review saved cash-flow draft").props.accessibilityState
          .disabled
      ).toBe(false)
    );
    fireEvent.press(screen.getByLabelText("Review saved cash-flow draft"));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][2]).toEqual({
      expectedVersion: 1,
      status: "reviewed",
      idempotencyKey: expect.stringMatching(/^cash_flow_snapshot-transition-/)
    });
    expect(mockUpdate.mock.calls[0][2]).not.toHaveProperty("title");
    expect(mockUpdate.mock.calls[0][2]).not.toHaveProperty("payload");
    expect(mockUpdate.mock.calls[0][2]).not.toHaveProperty("sourceLinks");
  });

  it("keeps owner current cash out of Manager state, inputs, and results", async () => {
    mockList.mockResolvedValue([
      {
        _id: "cash-owner-1",
        kind: "cash_flow_snapshot",
        title: "Owner cash snapshot",
        status: "draft",
        version: 1,
        payload: {
          cashFlowSnapshot: {
            asOf: "2026-08-22T16:00:00.000Z",
            currency: "USD",
            minorUnitDigits: 2,
            currentCashMinor: 987654,
            staleAfterDays: 30,
            entries: []
          }
        }
      }
    ]);
    const screen = render(
      <CashFlowSnapshotTool
        workspace={{ workspaceType: "facility", facilityId: "facility-2" }}
        canViewCurrentCash={false}
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );

    fireEvent.press(
      await screen.findByLabelText("Open cash-flow snapshot Owner cash snapshot")
    );
    expect(screen.queryByLabelText("Owner-entered current cash")).toBeNull();
    expect(screen.getByText("Opening cash is owner-only")).toBeTruthy();
    expect(screen.queryByText(/9,876\.54/)).toBeNull();

    fireEvent.press(screen.getByLabelText("Calculate cash-flow snapshot"));
    await waitFor(() => expect(mockCalculate).toHaveBeenCalledTimes(1));
    expect(mockCalculate.mock.calls[0][1]).toEqual(
      expect.objectContaining({ currentCashMinor: null })
    );
    expect(screen.queryByText(/Projected cash:/)).toBeNull();
  });

  it("reloads and archives a saved snapshot with its recorded evidence fields", async () => {
    const record = {
      _id: "64b000000000000000000203",
      kind: "cash_flow_snapshot",
      title: "Saved cash plan",
      status: "draft",
      version: 3,
      payload: {
        cashFlowSnapshot: {
          asOf: "2026-08-22T16:00:00.000Z",
          currency: "USD",
          minorUnitDigits: 2,
          currentCashMinor: -2500,
          horizonsDays: [30, 60, 90],
          staleAfterDays: 20,
          entries: [
            {
              label: "Upcoming bill",
              direction: "outflow",
              confidence: "recorded",
              amountMinor: 7500,
              currency: "USD",
              dueAt: "2026-08-25T16:00:00.000Z",
              sourceType: "external_reference",
              sourceRecordedAt: "2026-08-20T16:00:00.000Z",
              sourceFreshnessAt: "2026-08-20T16:00:00.000Z",
              sourceRecordId: "bill-22"
            }
          ],
          assumptions: "No unrecorded sales included."
        }
      }
    };
    mockList.mockResolvedValue([record]);
    mockArchive.mockResolvedValue({ ...record, archivedAt: "2026-08-22T17:00:00.000Z" });
    const screen = render(
      <CashFlowSnapshotTool
        workspace={{ workspaceType: "facility", facilityId: "facility-2" }}
        canViewCurrentCash
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );
    await screen.findByText("Saved cash plan");
    fireEvent.press(screen.getByLabelText("Open cash-flow snapshot Saved cash plan"));
    expect(screen.getByLabelText("Owner-entered current cash").props.value).toBe(
      "-25.00"
    );
    expect(screen.getByLabelText("Cash-flow entry 1 amount").props.value).toBe("75.00");
    expect(screen.getByLabelText("Cash-flow entry 1 source record id").props.value).toBe(
      "bill-22"
    );
    fireEvent.changeText(
      screen.getByLabelText("Business Desk archive reason"),
      "Snapshot superseded"
    );
    fireEvent.press(screen.getByLabelText("Archive Business Desk record"));
    await waitFor(() =>
      expect(mockArchive).toHaveBeenCalledWith(
        { workspaceType: "facility", facilityId: "facility-2" },
        "64b000000000000000000203",
        expect.objectContaining({
          expectedVersion: 3,
          reason: "Snapshot superseded",
          idempotencyKey: expect.stringMatching(/^cash_flow_snapshot-archive-/)
        })
      )
    );
  });
});
