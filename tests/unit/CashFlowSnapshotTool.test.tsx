import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CashFlowSnapshotTool from "@/features/businessDesk/CashFlowSnapshotTool";

const mockArchive = jest.fn();
const mockCalculate = jest.fn();
const mockCreate = jest.fn();
const mockGetWorkspaceTimeZone = jest.fn();
const mockList = jest.fn();
const mockPatchWorkspaceTimeZone = jest.fn();
const mockUpdate = jest.fn();
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
  getBusinessDeskWorkspaceTimeZone: (...args: any[]) => mockGetWorkspaceTimeZone(...args),
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
  patchBusinessDeskWorkspaceTimeZone: (...args: any[]) =>
    mockPatchWorkspaceTimeZone(...args),
  requireBusinessDeskWorkspace: (workspace: any) => workspace,
  updateBusinessDeskRecord: (...args: any[]) => mockUpdate(...args)
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
    workspaceTimeZoneVersion: input.timeZoneVersion,
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
    mockSnapshotDateTime = "2026-08-22T12:00";
    mockDueDateTime = "2026-09-01T12:00";
    mockSourceDateTime = "2026-08-01T09:00";
    mockArchive.mockReset();
    mockCalculate
      .mockReset()
      .mockImplementation(async (_workspace, input) => cashResult(input));
    mockCreate.mockReset();
    mockGetWorkspaceTimeZone.mockReset().mockImplementation(async (workspace) => ({
      configured: true,
      workspaceType: workspace.workspaceType,
      workspaceId:
        workspace.workspaceType === "facility" ? workspace.facilityId : "owner-1",
      timeZone:
        workspace.workspaceType === "facility" ? "America/Denver" : "America/New_York",
      version: 3,
      selectedByUserId: "owner-1",
      selectedByRole: "OWNER",
      selectedAt: "2026-08-22T12:00:00.000Z"
    }));
    mockList.mockReset().mockImplementation(async (_workspace, filters) => {
      if (filters?.kind === "quote") return [reviewedQuote, draftQuote];
      return [];
    });
    mockPatchWorkspaceTimeZone.mockReset();
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
    expect(
      screen.getByText(/Authoritative setting: America\/Denver · version 3/i)
    ).toBeTruthy();
    expect(screen.queryByLabelText("Cash-flow planning time zone")).toBeNull();
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
        timeZoneVersion: 3,
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
            timeZoneVersion: 3,
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

  it("uses only the authoritative workspace time zone and pins its version", async () => {
    mockGetWorkspaceTimeZone.mockResolvedValue({
      configured: true,
      workspaceType: "facility",
      workspaceId: "facility-2",
      timeZone: "America/Chicago",
      version: 7,
      selectedByUserId: "owner-1",
      selectedByRole: "OWNER",
      selectedAt: "2026-08-22T12:00:00.000Z"
    });
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
    await screen.findByText(/Authoritative setting: America\/Chicago · version 7/i);
    expect(screen.queryByLabelText("Cash-flow planning time zone")).toBeNull();
    fireEvent.press(screen.getByLabelText("Calculate cash-flow snapshot"));
    await waitFor(() => expect(mockCalculate).toHaveBeenCalledTimes(1));
    expect(mockCalculate.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        timeZone: "America/Chicago",
        timeZoneVersion: 7,
        horizonsDays: [30, 60, 90]
      })
    );
    expect(screen.getByText("Planning time zone: America/Chicago")).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText("Cash-flow record title"), "Zone plan");
    fireEvent.press(screen.getByLabelText("Save cash-flow draft"));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][1].payload.cashFlowSnapshot).toEqual(
      expect.objectContaining({
        timeZone: "America/Chicago",
        timeZoneVersion: 7
      })
    );
  });

  it("discards a calculation and reloads when the server reports a newer workspace setting", async () => {
    mockCalculate.mockImplementation(async (_workspace, input) => ({
      ...cashResult(input),
      workspaceTimeZoneVersion: 4
    }));
    const screen = render(
      <CashFlowSnapshotTool
        workspace={{ workspaceType: "facility", facilityId: "facility-2" }}
        canViewCurrentCash
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );
    await screen.findByText(/Authoritative setting: America\/Denver · version 3/i);
    fireEvent.press(screen.getByLabelText("Calculate cash-flow snapshot"));

    await screen.findByText(/workspace time-zone version changed during calculation/i);
    expect(mockGetWorkspaceTimeZone).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("Planning time zone: America/Denver")).toBeNull();
  });

  it("blocks nonexistent and ambiguous workspace wall times before any API request", async () => {
    mockGetWorkspaceTimeZone.mockResolvedValue({
      configured: true,
      workspaceType: "facility",
      workspaceId: "facility-2",
      timeZone: "America/New_York",
      version: 4,
      selectedByUserId: "owner-1",
      selectedByRole: "OWNER",
      selectedAt: "2026-08-22T12:00:00.000Z"
    });
    mockSnapshotDateTime = "2026-03-08T02:30";
    const gapScreen = render(
      <CashFlowSnapshotTool
        workspace={{ workspaceType: "facility", facilityId: "facility-2" }}
        canViewCurrentCash
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );
    await gapScreen.findByText(/Authoritative setting: America\/New_York · version 4/i);
    fireEvent.press(gapScreen.getByLabelText("Cash-flow snapshot as of date and time"));
    await waitFor(() =>
      expect(
        gapScreen.getByLabelText("Cash-flow snapshot as of date and time").props.testValue
      ).toBe("2026-03-08T02:30")
    );
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
    await overlapScreen.findByText(
      /Authoritative setting: America\/New_York · version 4/i
    );
    fireEvent.press(
      overlapScreen.getByLabelText("Cash-flow snapshot as of date and time")
    );
    await waitFor(() =>
      expect(
        overlapScreen.getByLabelText("Cash-flow snapshot as of date and time").props
          .testValue
      ).toBe("2026-11-01T01:30")
    );
    fireEvent.press(overlapScreen.getByLabelText("Calculate cash-flow snapshot"));
    await overlapScreen.findByText(/occurs twice in America\/New_York/i);
    expect(mockCalculate).not.toHaveBeenCalled();
  });

  it("reloads the authoritative setting and clears draft state when the workspace changes", async () => {
    mockGetWorkspaceTimeZone.mockImplementation(async (workspace) => ({
      configured: true,
      workspaceType: "facility",
      workspaceId: workspace.facilityId,
      timeZone:
        workspace.facilityId === "facility-a" ? "America/Denver" : "America/Los_Angeles",
      version: workspace.facilityId === "facility-a" ? 3 : 9,
      selectedByUserId: "owner-1",
      selectedByRole: "OWNER",
      selectedAt: "2026-08-22T12:00:00.000Z"
    }));
    const screen = render(
      <CashFlowSnapshotTool
        workspace={{ workspaceType: "facility", facilityId: "facility-a" }}
        canViewCurrentCash
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );
    await screen.findByText(/Authoritative setting: America\/Denver · version 3/i);
    fireEvent.changeText(screen.getByLabelText("Cash-flow record title"), "Do not leak");
    fireEvent.press(screen.getByLabelText("Calculate cash-flow snapshot"));
    await screen.findByText("Planning time zone: America/Denver");

    screen.rerender(
      <CashFlowSnapshotTool
        workspace={{ workspaceType: "facility", facilityId: "facility-b" }}
        canViewCurrentCash
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );

    await screen.findByText(/Authoritative setting: America\/Los_Angeles · version 9/i);
    expect(screen.getByLabelText("Cash-flow record title").props.value).toBe("");
    expect(screen.queryByText("Planning time zone: America/Denver")).toBeNull();
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
    mockCalculate.mockImplementation(async (_workspace, input) => {
      const leaked = cashResult(input);
      return {
        ...leaked,
        currentCashMinor: 987654,
        complete: true,
        incompleteReasons: [],
        horizons: leaked.horizons.map((horizon) => ({
          ...horizon,
          projectedCashMinor: 1_000_154
        }))
      };
    });
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
    expect(screen.queryByText(/9,876\.54|10,001\.54/)).toBeNull();
    expect(screen.getByText(/Incomplete: current cash is unknown/i)).toBeTruthy();
    expect(screen.getByText("Facility Manager cash-redacted CSV")).toBeTruthy();
    expect(
      screen.getByText(/Facility Manager export omits owner-only current cash/i)
    ).toBeTruthy();
  });

  it("keeps a Facility Manager read-only and blocks time-sensitive writes while the workspace setting is unset", async () => {
    mockGetWorkspaceTimeZone.mockResolvedValue({
      configured: false,
      workspaceType: "facility",
      workspaceId: "facility-2",
      timeZone: null,
      version: 0
    });
    const screen = render(
      <CashFlowSnapshotTool
        workspace={{ workspaceType: "facility", facilityId: "facility-2" }}
        canViewCurrentCash={false}
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );

    await screen.findByText(
      /No workspace time zone is configured\. Time-sensitive calculations and writes are blocked/i
    );
    expect(screen.queryByLabelText("IANA workspace time zone")).toBeNull();
    expect(
      screen.getByText(/Only the current Facility owner can change this setting/i)
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Calculate cash-flow snapshot").props.accessibilityState
        .disabled
    ).toBe(true);
    expect(
      screen.getByLabelText("Save cash-flow draft").props.accessibilityState.disabled
    ).toBe(true);
    expect(screen.queryByLabelText("Owner-entered current cash")).toBeNull();
    expect(mockCalculate).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("reloads and archives a saved snapshot with its owner-entered evidence fields", async () => {
    mockGetWorkspaceTimeZone.mockResolvedValue({
      configured: true,
      workspaceType: "facility",
      workspaceId: "facility-2",
      timeZone: "America/Los_Angeles",
      version: 6,
      selectedByUserId: "owner-1",
      selectedByRole: "OWNER",
      selectedAt: "2026-08-22T12:00:00.000Z"
    });
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
    expect(
      screen.getByText(/Authoritative setting: America\/Los_Angeles · version 6/i)
    ).toBeTruthy();
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
        timeZoneVersion: 6,
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
