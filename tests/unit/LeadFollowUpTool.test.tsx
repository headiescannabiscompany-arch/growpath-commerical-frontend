import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import LeadFollowUpTool, {
  allowedLeadTransitions,
  getLeadFollowUpState
} from "@/features/businessDesk/LeadFollowUpTool";

const mockArchive = jest.fn();
const mockCreate = jest.fn();
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
  return ({ accessibilityLabel, onChange }: any) =>
    React.createElement(
      Pressable,
      {
        accessibilityLabel,
        onPress: () =>
          onChange(
            String(accessibilityLabel).includes("last contacted")
              ? "2026-08-22T09:15"
              : "2026-08-23T10:30"
          )
      },
      React.createElement(Text, null, "Choose date and time")
    );
});

const workspace = {
  workspaceType: "facility" as const,
  facilityId: "facility-1"
};

const quote = {
  _id: "64b000000000000000000101",
  kind: "quote" as const,
  title: "Irrigation quote",
  status: "reviewed",
  version: 3,
  payload: { quote: {} }
};

function leadRecord(overrides: Record<string, unknown> = {}) {
  return {
    _id: "64b000000000000000000102",
    kind: "lead" as const,
    title: "Existing lead",
    status: "new",
    version: 4,
    payload: {
      lead: {
        contact: { name: "Alex", company: "", email: "", phone: "" },
        contactProvidedVoluntarily: false,
        interest: "Irrigation",
        nextAction: "Prepare quote",
        nextActionAt: "2026-08-23T14:30:00.000Z",
        notes: "Initial note",
        tags: []
      }
    },
    sourceLinks: [],
    ...overrides
  };
}

describe("LeadFollowUpTool", () => {
  beforeEach(() => {
    mockArchive.mockReset();
    mockCreate.mockReset();
    mockList
      .mockReset()
      .mockImplementation(async (_workspace, options) =>
        options?.kind === "lead" ? [] : [quote]
      );
    mockUpdate.mockReset();
  });

  it("reports follow-up state and exposes only authoritative lifecycle transitions", () => {
    const now = Date.parse("2026-08-22T16:00:00.000Z");

    expect(getLeadFollowUpState("new", "", "", now)).toBe("missing_action");
    expect(getLeadFollowUpState("contacted", "Call", "", now)).toBe("missing_date");
    expect(
      getLeadFollowUpState("quote_sent", "Check response", "2026-08-22T15:59:00Z", now)
    ).toBe("overdue");
    expect(
      getLeadFollowUpState("considering", "Check response", "2026-08-22T16:01:00Z", now)
    ).toBe("scheduled");
    expect(getLeadFollowUpState("won", "", "", now)).toBe("closed");
    expect(allowedLeadTransitions("new")).toEqual([
      "contacted",
      "quote_requested",
      "lost",
      "on_hold"
    ]);
    expect(allowedLeadTransitions("won")).toEqual([]);
    expect(allowedLeadTransitions("lost")).toEqual(["contacted", "on_hold"]);
  });

  it("creates New with voluntary contact data and an authorized source link", async () => {
    mockCreate.mockImplementation(async (_workspace, input) => ({
      _id: "64b000000000000000000103",
      kind: "lead",
      title: input.title,
      status: input.status,
      version: 1,
      payload: input.payload,
      sourceLinks: input.sourceLinks
    }));
    const screen = render(
      <LeadFollowUpTool
        workspace={workspace}
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );
    await waitFor(() =>
      expect(mockList).toHaveBeenCalledWith(
        workspace,
        { kind: "lead" },
        { signal: expect.anything() }
      )
    );
    await screen.findByLabelText("Related workspace records Irrigation quote");

    fireEvent.changeText(
      screen.getByLabelText("Lead record title"),
      "Spring install lead"
    );
    fireEvent.changeText(screen.getByLabelText("Lead person name"), "Alex Garden");
    fireEvent.changeText(screen.getByLabelText("Lead email"), "ALEX@EXAMPLE.COM");
    fireEvent.press(
      screen.getByLabelText("Lead contact details were supplied voluntarily")
    );
    fireEvent.changeText(screen.getByLabelText("Lead interest"), "Irrigation estimate");
    fireEvent.changeText(screen.getByLabelText("Lead estimated value"), "125.50");
    fireEvent.changeText(screen.getByLabelText("Lead estimated value currency"), "usd");
    fireEvent.changeText(screen.getByLabelText("Lead source"), "Website form");
    fireEvent.press(screen.getByLabelText("Lead last contacted date and time"));
    fireEvent.changeText(screen.getByLabelText("Lead next action"), "Prepare quote");
    fireEvent.press(screen.getByLabelText("Lead next follow-up date and time"));
    fireEvent.changeText(screen.getByLabelText("Lead tags"), "design, warm");
    fireEvent.press(screen.getByLabelText("Related workspace records Irrigation quote"));
    fireEvent.press(screen.getByLabelText("Save lead record"));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith(
      workspace,
      expect.objectContaining({
        kind: "lead",
        title: "Spring install lead",
        status: "new",
        idempotencyKey: expect.stringMatching(/^lead-create-/),
        sourceLinks: [
          {
            entityType: "quote",
            entityId: "64b000000000000000000101",
            label: "Irrigation quote"
          }
        ],
        payload: {
          lead: expect.objectContaining({
            contact: {
              name: "Alex Garden",
              company: "",
              email: "alex@example.com",
              phone: ""
            },
            contactProvidedVoluntarily: true,
            interest: "Irrigation estimate",
            estimatedValueMinor: 12550,
            estimatedValueCurrency: "USD",
            estimatedValueMinorUnitDigits: 2,
            source: "Website form",
            lastContactedAt: expect.any(String),
            nextAction: "Prepare quote",
            nextActionAt: expect.any(String),
            tags: ["design", "warm"]
          })
        }
      })
    );
    const lead = mockCreate.mock.calls[0][1].payload.lead;
    expect(lead).not.toHaveProperty("stage");
    expect(lead).not.toHaveProperty("relatedRecordId");
    expect(screen.queryByLabelText(/related.* ID/i)).toBeNull();
  });

  it("uses an exact-version transition request with no content fields", async () => {
    const existing = leadRecord();
    mockList.mockImplementation(async (_workspace, options) =>
      options?.kind === "lead" ? [existing] : [quote]
    );
    mockUpdate.mockImplementation(async (_workspace, _id, input) => ({
      ...existing,
      status: input.status,
      version: 5,
      payload: {
        lead: { ...(existing.payload as any).lead, stage: input.status }
      }
    }));
    const screen = render(
      <LeadFollowUpTool
        workspace={workspace}
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );
    fireEvent.press(await screen.findByLabelText("Open lead follow-up Existing lead"));
    fireEvent.press(screen.getByLabelText("Next lead status Quote requested"));
    fireEvent.press(screen.getByLabelText("Change lead status"));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    const transition = mockUpdate.mock.calls[0][2];
    expect(transition).toEqual({
      expectedVersion: 4,
      status: "quote_requested",
      idempotencyKey: expect.stringMatching(/^lead-transition-/)
    });
    expect(transition).not.toHaveProperty("payload");
    expect(transition).not.toHaveProperty("title");
    expect(transition).not.toHaveProperty("sourceLinks");
  });

  it("does not discard unsaved content during a status transition", async () => {
    const existing = leadRecord();
    mockList.mockImplementation(async (_workspace, options) =>
      options?.kind === "lead" ? [existing] : [quote]
    );
    const screen = render(
      <LeadFollowUpTool
        workspace={workspace}
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );
    fireEvent.press(await screen.findByLabelText("Open lead follow-up Existing lead"));
    fireEvent.changeText(screen.getByLabelText("Lead notes"), "Unsaved detail");
    fireEvent.press(screen.getByLabelText("Next lead status Quote requested"));
    fireEvent.press(screen.getByLabelText("Change lead status"));

    expect(
      await screen.findByText(/Save or discard the unsaved lead changes/i)
    ).toBeTruthy();
    expect(screen.getByDisplayValue("Unsaved detail")).toBeTruthy();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("updates content against the selected revision without changing lifecycle", async () => {
    const existing = leadRecord({ status: "contacted" });
    mockList.mockImplementation(async (_workspace, options) =>
      options?.kind === "lead" ? [existing] : [quote]
    );
    mockUpdate.mockImplementation(async (_workspace, _id, input) => ({
      ...existing,
      title: input.title,
      status: input.status,
      version: 5,
      payload: input.payload,
      sourceLinks: input.sourceLinks
    }));
    const screen = render(
      <LeadFollowUpTool
        workspace={workspace}
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );
    fireEvent.press(await screen.findByLabelText("Open lead follow-up Existing lead"));
    fireEvent.changeText(screen.getByLabelText("Lead notes"), "Contact confirmed");
    fireEvent.press(screen.getByLabelText("Save lead record"));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][2]).toEqual(
      expect.objectContaining({
        expectedVersion: 4,
        status: "contacted",
        title: "Existing lead",
        idempotencyKey: expect.stringMatching(/^lead-update-/)
      })
    );
    expect(mockUpdate.mock.calls[0][2].payload.lead.notes).toBe("Contact confirmed");
  });

  it("blocks unconfirmed contact details and unsupported currency precision", async () => {
    const screen = render(
      <LeadFollowUpTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    fireEvent.changeText(screen.getByLabelText("Lead record title"), "Private lead");
    fireEvent.changeText(screen.getByLabelText("Lead person name"), "Jordan");
    fireEvent.changeText(screen.getByLabelText("Lead email"), "jordan@example.com");
    fireEvent.press(screen.getByLabelText("Save lead record"));

    expect(
      await screen.findByText(/voluntarily supplied the email or phone/i)
    ).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();

    fireEvent.press(
      screen.getByLabelText("Lead contact details were supplied voluntarily")
    );
    fireEvent.changeText(screen.getByLabelText("Lead estimated value"), "1.005");
    fireEvent.changeText(screen.getByLabelText("Lead estimated value currency"), "USD");
    fireEvent.press(screen.getByLabelText("Save lead record"));

    expect(
      await screen.findByText(/supports at most 2 decimal places in USD/i)
    ).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
