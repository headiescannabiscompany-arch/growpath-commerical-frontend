import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CashFlowSnapshotTool, {
  resolveCashFlowDefaultTimeZone
} from "@/features/businessDesk/CashFlowSnapshotTool";

const mockArchive = jest.fn();
const mockCalculate = jest.fn();
const mockCreate = jest.fn();
const mockList = jest.fn();
const mockUpdate = jest.fn();
let mockActiveFacility: any = null;
let mockSnapshotDateTime = "2026-08-22T12:00";
let mockDueDateTime = "2026-09-01T12:00";
let mockSourceDateTime = "2026-08-01T09:00";

const reviewedQuote = {
  _id: "64b000000000000000000301",
  kind: "quote",
  title: "Reviewed quote",
  status: "reviewed",
  version: 3,
  createdAt: "2026-08-20T16:00:00.000Z",
  updatedAt: "2026-08-21T16:00:00.000Z",
  payload: {}
};

const draftQuote = {
  _id: "64b000000000000000000302",
  kind: "quote",
  title: "Draft quote",
  status: "draft",
  version: 1,
  createdAt: "2026-08-20T16:00:00.000Z",
  updatedAt: "2026-08-21T16:00:00.000Z",
  payload: {}
};

jest.mock("@/api/businessDesk", () => ({
  archiveBusinessDeskRecord: (...args: any[]) => mockArchive(...args),
  businessDeskWorkspaceKey: (workspace: any) =>
    workspace.workspaceType === "facility"
      ? `facility:${workspace.facilityId}`
      : "commercial",
  calculateBusinessDesk: (...args: any[]) => mockCalculate(...args),
  createBusinessDeskRecord: (...args: any[]) => mockCreate(...args),
  listBusinessDeskRecords: (...args: any[]) => mockList(...args),
  normalizeIanaTimeZone: (value: unknown) => {
    const candidate = typeof value === "string" ? value.trim() : "";
    if (!candidate) return null;
    try {
      return new Intl.DateTimeFormat("en-US", { timeZone: candidate }).resolvedOptions()
        .timeZone;
    } catch {
      return null;
    }
  },
  requireBusinessDeskWorkspace: (workspace: any) => workspace,
  updateBusinessDeskRecord: (...args: any[]) => mockUpdate(...args)
}));

jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selected: mockActiveFacility })
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
  return function MockCalendarDateField({
    accessibilityLabel,
    label,
    onChange,
    value: fieldValue
  }: any) {
    const name = String(accessibilityLabel || label);
    let value = mockSourceDateTime;
    if (name.includes("snapshot as of")) value = mockSnapshotDateTime;
    if (name.includes("due date")) value = mockDueDateTime;
    return React.createElement(
      Pressable,
      {
        accessibilityLabel: name,
        onPress: () => onChange(value),
        testValue: fieldValue
      },
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
    timeZone: input.timeZone,
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
    mockActiveFacility = null;
    mockSnapshotDateTime = "2026-08-22T12:00";
    mockDueDateTime = "2026-09-01T12:00";
    mockSourceDateTime = "2026-08-01T09:00";
    mockArchive.mockReset();
    mockCalculate
      .mockReset()
      .mockImplementation(async (_workspace, input) => cashResult(input));
    mockCreate.mockReset();
    mockList.mockReset().mockImplementation(async (_workspace, filters) => {
      if (filters?.kind === "quote") return [reviewedQuote, draftQuote];
      return [];
    });
    mockUpdate.mockReset();
  });

  it("calculates and saves explicit source-labeled 30/60/90 scenarios without inventing cash", async () => {
    mockActiveFacility = {
      id: "facility-2",
      name: "North house",
      timezone: "America/Denver"
    };
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
    expect(screen.getByLabelText("Cash-flow planning time zone").props.value).toBe(
      "America/Denver"
    );
    fireEvent.changeText(screen.getByLabelText("Cash-flow freshness days"), "10");
    fireEvent.press(screen.getByLabelText("Add cash-flow entry"));
    fireEvent.changeText(
      screen.getByLabelText("Cash-flow entry 1 label"),
      "Reviewed quote"
    );
    fireEvent.changeText(screen.getByLabelText("Cash-flow entry 1 amount"), "125.00");
    fireEvent.press(screen.getByLabelText("Cash-flow entry 1 due date and time"));
    fireEvent.press(
      screen.getByLabelText("Cash-flow entry 1 source type Reviewed quote expectation")
    );
    fireEvent.press(
      await screen.findByLabelText("Use cash-flow source Reviewed quote revision 3")
    );
    expect(
      screen.queryByLabelText("Use cash-flow source Draft quote revision 1")
    ).toBeNull();
    expect(screen.queryByLabelText("Cash-flow entry 1 source record id")).toBeNull();
    fireEvent.press(screen.getByLabelText("Calculate cash-flow snapshot"));

    await waitFor(() => expect(mockCalculate).toHaveBeenCalledTimes(1));
    expect(mockCalculate).toHaveBeenCalledWith(
      { workspaceType: "facility", facilityId: "facility-2" },
      expect.objectContaining({
        calculator: "cash_flow",
        currency: "USD",
        minorUnitDigits: 2,
        currentCashMinor: null,
        asOf: "2026-08-22T18:00:00.000Z",
        timeZone: "America/Denver",
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
            sourceRecordedAt: "2026-08-21T16:00:00.000Z",
            sourceFreshnessAt: "2026-08-21T16:00:00.000Z",
            dueAt: "2026-09-01T18:00:00.000Z"
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
            timeZone: "America/Denver",
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

  it("uses only a valid Facility/device/UTC default and sends a reviewed time-zone change", async () => {
    expect(resolveCashFlowDefaultTimeZone("America/Los_Angeles", "Europe/London")).toBe(
      "America/Los_Angeles"
    );
    expect(resolveCashFlowDefaultTimeZone("Moon/Sea", "Europe/London")).toBe(
      "Europe/London"
    );
    expect(resolveCashFlowDefaultTimeZone(undefined, "Moon/Sea")).toBe("UTC");

    mockActiveFacility = {
      id: "facility-2",
      name: "North house",
      timezone: "America/Denver"
    };
    mockCreate.mockImplementation(async (_workspace, input) => ({
      _id: "64b000000000000000000204",
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
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    const zoneField = screen.getByLabelText("Cash-flow planning time zone");
    expect(zoneField.props.value).toBe("America/Denver");

    fireEvent.changeText(zoneField, "Moon/Sea");
    fireEvent.press(screen.getByLabelText("Calculate cash-flow snapshot"));
    await screen.findByText(/Enter a valid IANA time zone/i);
    expect(mockCalculate).not.toHaveBeenCalled();

    fireEvent.changeText(zoneField, "America/Chicago");
    fireEvent.press(screen.getByLabelText("Calculate cash-flow snapshot"));
    await waitFor(() => expect(mockCalculate).toHaveBeenCalledTimes(1));
    expect(mockCalculate.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        timeZone: "America/Chicago",
        horizonsDays: [30, 60, 90]
      })
    );
    expect(screen.getByText("Planning time zone: America/Chicago")).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText("Cash-flow record title"), "Zone plan");
    fireEvent.press(screen.getByLabelText("Save cash-flow draft"));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][1].payload.cashFlowSnapshot.timeZone).toBe(
      "America/Chicago"
    );
  });

  it("blocks nonexistent and ambiguous workspace wall times before any API request", async () => {
    mockActiveFacility = {
      id: "facility-2",
      name: "North house",
      timezone: "America/New_York"
    };
    mockSnapshotDateTime = "2026-03-08T02:30";
    const gapScreen = render(
      <CashFlowSnapshotTool
        workspace={{ workspaceType: "facility", facilityId: "facility-2" }}
        canViewCurrentCash
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    fireEvent.press(gapScreen.getByLabelText("Cash-flow snapshot as of date and time"));
    fireEvent.press(gapScreen.getByLabelText("Calculate cash-flow snapshot"));
    await gapScreen.findByText(/does not exist in America\/New_York/i);
    gapScreen.unmount();

    mockSnapshotDateTime = "2026-11-01T01:30";
    const overlapScreen = render(
      <CashFlowSnapshotTool
        workspace={{ workspaceType: "facility", facilityId: "facility-2" }}
        canViewCurrentCash
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );
    fireEvent.press(
      overlapScreen.getByLabelText("Cash-flow snapshot as of date and time")
    );
    fireEvent.press(overlapScreen.getByLabelText("Calculate cash-flow snapshot"));
    await overlapScreen.findByText(/occurs twice in America\/New_York/i);
    expect(mockCalculate).not.toHaveBeenCalled();
  });

  it("resets edited time-zone and draft state when the workspace changes", async () => {
    mockActiveFacility = {
      id: "facility-a",
      name: "East",
      timezone: "America/Denver"
    };
    const screen = render(
      <CashFlowSnapshotTool
        workspace={{ workspaceType: "facility", facilityId: "facility-a" }}
        canViewCurrentCash
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    fireEvent.changeText(
      screen.getByLabelText("Cash-flow planning time zone"),
      "Asia/Tokyo"
    );
    fireEvent.changeText(screen.getByLabelText("Cash-flow record title"), "Do not leak");
    fireEvent.press(screen.getByLabelText("Calculate cash-flow snapshot"));
    await screen.findByText("Planning time zone: Asia/Tokyo");

    mockActiveFacility = {
      id: "facility-b",
      name: "West",
      timezone: "America/Los_Angeles"
    };
    screen.rerender(
      <CashFlowSnapshotTool
        workspace={{ workspaceType: "facility", facilityId: "facility-b" }}
        canViewCurrentCash
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );

    await waitFor(() =>
      expect(screen.getByLabelText("Cash-flow planning time zone").props.value).toBe(
        "America/Los_Angeles"
      )
    );
    expect(screen.getByLabelText("Cash-flow record title").props.value).toBe("");
    expect(screen.queryByText("Planning time zone: Asia/Tokyo")).toBeNull();
    expect(mockList).toHaveBeenCalledWith(
      { workspaceType: "facility", facilityId: "facility-b" },
      { kind: "cash_flow_snapshot" },
      { signal: expect.anything() }
    );
  });

  it("keeps manual evidence owner-entered, creates a draft, then reviews by transition only", async () => {
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
    fireEvent.changeText(
      screen.getByLabelText("Cash-flow entry 1 label"),
      "Owner-entered subscription"
    );
    fireEvent.changeText(screen.getByLabelText("Cash-flow entry 1 amount"), "50");
    fireEvent.press(screen.getByLabelText("Cash-flow entry 1 due date and time"));
    fireEvent.press(
      screen.getByLabelText("Cash-flow entry 1 source recorded date and time")
    );
    fireEvent.press(
      screen.getByLabelText("Cash-flow entry 1 source freshness date and time")
    );
    fireEvent.press(screen.getByLabelText("Cash-flow entry 1 direction Outgoing"));
    expect(screen.queryByText(/Payment provider evidence/i)).toBeNull();
    expect(screen.queryByText(/Bank import/i)).toBeNull();
    expect(screen.queryByLabelText("Cash-flow entry 1 source record id")).toBeNull();
    expect(
      screen.getByLabelText("Review saved cash-flow draft").props.accessibilityState
        .disabled
    ).toBe(true);
    fireEvent.press(screen.getByLabelText("Save cash-flow draft"));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][1].status).toBe("draft");
    expect(mockCreate.mock.calls[0][1].sourceLinks).toEqual([]);
    expect(mockCreate.mock.calls[0][1].payload.cashFlowSnapshot.entries[0]).toEqual(
      expect.objectContaining({
        direction: "outflow",
        sourceType: "manual",
        sourceRecordId: ""
      })
    );
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
    expect(screen.getByText("Owner full cash-flow CSV")).toBeTruthy();
    expect(
      screen.getByLabelText("Preview owner full cash-flow CSV").props.accessibilityState
    ).toEqual({ busy: false, disabled: false });
  });

  it("keeps owner current cash out of Manager state, inputs, and results", async () => {
    const record = {
      _id: "cash-owner-1",
      kind: "cash_flow_snapshot",
      title: "Owner cash snapshot",
      status: "draft",
      version: 1,
      payload: {
        cashFlowSnapshot: {
          asOf: "2026-08-22T16:00:00.000Z",
          timeZone: "America/Los_Angeles",
          currency: "USD",
          minorUnitDigits: 2,
          currentCashMinor: 987654,
          staleAfterDays: 30,
          entries: []
        }
      }
    };
    mockList.mockImplementation(async (_workspace, filters) =>
      filters?.kind === "cash_flow_snapshot" ? [record] : []
    );
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
    expect(screen.getByText("Facility Manager cash-redacted CSV")).toBeTruthy();
    expect(
      screen.getByText(/Facility Manager export omits owner-only current cash/i)
    ).toBeTruthy();
  });

  it("reloads and archives a saved snapshot with its owner-entered evidence fields", async () => {
    const record = {
      _id: "64b000000000000000000203",
      kind: "cash_flow_snapshot",
      title: "Saved cash plan",
      status: "draft",
      version: 3,
      payload: {
        cashFlowSnapshot: {
          asOf: "2026-08-22T16:00:45.123Z",
          timeZone: "America/Los_Angeles",
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
              dueAt: "2026-08-25T16:00:30.456Z",
              sourceType: "manual",
              sourceRecordedAt: "2026-08-20T16:00:15.789Z",
              sourceFreshnessAt: "2026-08-20T16:00:15.789Z",
              sourceRecordId: ""
            }
          ],
          assumptions: "No unrecorded sales included."
        }
      }
    };
    mockList.mockImplementation(async (_workspace, filters) =>
      filters?.kind === "cash_flow_snapshot" ? [record] : []
    );
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
    expect(screen.getByLabelText("Cash-flow planning time zone").props.value).toBe(
      "America/Los_Angeles"
    );
    expect(
      screen.getByLabelText("Cash-flow snapshot as of date and time").props.testValue
    ).toBe("2026-08-22T09:00");
    expect(
      screen.getByLabelText("Cash-flow entry 1 due date and time").props.testValue
    ).toBe("2026-08-25T09:00");
    expect(
      screen.getByLabelText("Cash-flow entry 1 source recorded date and time").props
        .testValue
    ).toBe("2026-08-20T09:00");
    expect(screen.getByLabelText("Cash-flow entry 1 amount").props.value).toBe("75.00");
    expect(screen.queryByLabelText("Cash-flow entry 1 source record id")).toBeNull();
    expect(
      screen.getByLabelText("Cash-flow entry 1 source recorded date and time")
    ).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Calculate cash-flow snapshot"));
    await waitFor(() => expect(mockCalculate).toHaveBeenCalledTimes(1));
    expect(mockCalculate.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        asOf: "2026-08-22T16:00:45.123Z",
        timeZone: "America/Los_Angeles",
        horizonsDays: [30, 60, 90],
        entries: [
          expect.objectContaining({
            dueAt: "2026-08-25T16:00:30.456Z",
            sourceRecordedAt: "2026-08-20T16:00:15.789Z",
            sourceFreshnessAt: "2026-08-20T16:00:15.789Z"
          })
        ]
      })
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
