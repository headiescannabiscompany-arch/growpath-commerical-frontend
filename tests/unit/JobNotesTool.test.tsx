import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import JobNotesTool, {
  allowedJobTransitions
} from "@/features/businessDesk/JobNotesTool";

const mockArchive = jest.fn();
const mockCreate = jest.fn();
const mockGetWorkspaceTimeZone = jest.fn();
const mockList = jest.fn();
const mockListTeamMembers = jest.fn();
const mockPatchWorkspaceTimeZone = jest.fn();
const mockUpdate = jest.fn();
let mockJobStart = "2026-08-24T09:00";
let mockJobEnd = "2026-08-24T12:30";

jest.mock("@/api/businessDesk", () => ({
  archiveBusinessDeskRecord: (...args: any[]) => mockArchive(...args),
  businessDeskWorkspaceKey: (workspace: any) =>
    workspace.workspaceType === "facility"
      ? `facility:${workspace.facilityId}`
      : "commercial",
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

jest.mock("@/api/team", () => ({
  listTeamMembers: (...args: any[]) => mockListTeamMembers(...args)
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
  return ({ accessibilityLabel, disabled, onChange, timeZoneLabel, value }: any) =>
    React.createElement(
      Pressable,
      {
        accessibilityLabel,
        accessibilityState: { disabled },
        disabled,
        testTimeZoneLabel: timeZoneLabel,
        testValue: value,
        onPress: () =>
          onChange(
            String(accessibilityLabel).includes("start") ? mockJobStart : mockJobEnd
          )
      },
      React.createElement(Text, null, "Choose date and time")
    );
});

jest.mock("@/features/businessDesk/ProtectedAttachmentField", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");
  return ({ attachmentIds, onChange, onUserEdit, purpose, title }: any) => {
    const id = "507f191e810c19729de86201";
    return React.createElement(
      View,
      null,
      React.createElement(Text, null, title),
      React.createElement(
        Text,
        null,
        `Protected attachment IDs: ${attachmentIds.join(",")}`
      ),
      React.createElement(
        Pressable,
        {
          accessibilityLabel: `Test add ${purpose} attachment`,
          onPress: () => {
            onChange([...attachmentIds, id]);
            onUserEdit?.();
          }
        },
        React.createElement(Text, null, "Test add ready attachment")
      )
    );
  };
});

const workspace = {
  workspaceType: "facility" as const,
  facilityId: "facility-2"
};

const quote = {
  _id: "64b000000000000000000201",
  kind: "quote" as const,
  title: "Pump quote",
  status: "reviewed",
  version: 2,
  payload: { quote: {} }
};

function jobRecord(overrides: Record<string, unknown> = {}) {
  return {
    _id: "64b000000000000000000202",
    kind: "job" as const,
    title: "Existing pump job",
    status: "in_progress",
    version: 7,
    payload: {
      job: {
        customer: { name: "Casey", company: "", email: "", phone: "" },
        projectName: "Pump replacement",
        privateLocation: "Room 4",
        scope: "Replace failed pump",
        scheduledStartAt: null,
        scheduledEndAt: null,
        relatedQuoteId: "",
        completionNotes: "",
        notes: "Work underway",
        nextAction: "Install replacement"
      }
    },
    sourceLinks: [],
    ...overrides
  };
}

describe("JobNotesTool", () => {
  beforeEach(() => {
    mockJobStart = "2026-08-24T09:00";
    mockJobEnd = "2026-08-24T12:30";
    mockArchive.mockReset();
    mockCreate.mockReset();
    mockGetWorkspaceTimeZone.mockReset().mockImplementation(async (requestWorkspace) => ({
      configured: true,
      workspaceType: requestWorkspace.workspaceType,
      workspaceId:
        requestWorkspace.workspaceType === "facility"
          ? requestWorkspace.facilityId
          : "owner-1",
      timeZone: "America/New_York",
      version: 4,
      selectedByUserId: "owner-1",
      selectedByRole: "OWNER",
      selectedAt: "2026-08-22T12:00:00.000Z"
    }));
    mockList
      .mockReset()
      .mockImplementation(async (_workspace, options) =>
        options?.kind === "job" ? [] : [quote]
      );
    mockListTeamMembers.mockReset().mockResolvedValue([]);
    mockPatchWorkspaceTimeZone.mockReset();
    mockUpdate.mockReset();
  });

  it("exposes only authoritative job lifecycle transitions", () => {
    expect(allowedJobTransitions("requested")).toEqual(["estimating", "cancelled"]);
    expect(allowedJobTransitions("estimating")).toEqual([
      "approved",
      "waiting",
      "cancelled"
    ]);
    expect(allowedJobTransitions("in_progress")).toEqual([
      "waiting",
      "complete",
      "cancelled"
    ]);
    expect(allowedJobTransitions("complete")).toEqual([]);
    expect(allowedJobTransitions("cancelled")).toEqual([]);
  });

  it("creates Requested with an authorized quote and truthful manual provider reference", async () => {
    mockCreate.mockImplementation(async (_workspace, input) => ({
      _id: "64b000000000000000000203",
      kind: "job",
      title: input.title,
      status: input.status,
      version: 1,
      payload: {
        job: {
          ...input.payload.job,
          externalProviderRef: input.payload.job.externalProviderRef
            ? {
                ...input.payload.job.externalProviderRef,
                verificationStatus: "unverified_manual"
              }
            : undefined
        }
      },
      sourceLinks: input.sourceLinks
    }));
    const screen = render(
      <JobNotesTool
        workspace={workspace}
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );
    await screen.findByLabelText("Related quote Pump quote");
    await screen.findByText(/Authoritative setting: America\/New_York · version 4/i);

    fireEvent.changeText(screen.getByLabelText("Job record title"), "Pump replacement");
    fireEvent.changeText(screen.getByLabelText("Job project name"), "Greenhouse pump");
    fireEvent.changeText(screen.getByLabelText("Job customer name"), "Casey Grower");
    fireEvent.changeText(
      screen.getByLabelText("Job customer email"),
      "CASEY@EXAMPLE.COM"
    );
    fireEvent.changeText(screen.getByLabelText("Job private location"), "Room 4");
    fireEvent.changeText(
      screen.getByLabelText("Job scope"),
      "Replace failed circulation pump"
    );
    fireEvent.press(screen.getByLabelText("Job scheduled start date and time"));
    fireEvent.press(screen.getByLabelText("Job scheduled end date and time"));
    fireEvent.changeText(
      screen.getByLabelText("Job next action"),
      "Confirm parts onsite"
    );
    fireEvent.press(screen.getByLabelText("Related quote Pump quote"));
    fireEvent.changeText(
      screen.getByLabelText("Job unverified external provider"),
      "Stripe"
    );
    fireEvent.changeText(
      screen.getByLabelText("Job unverified external reference ID"),
      "in_123"
    );
    fireEvent.changeText(
      screen.getByLabelText("Job unverified external reference URL"),
      "https://example.test/in_123"
    );
    fireEvent.press(screen.getByLabelText("Save job record"));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith(
      workspace,
      expect.objectContaining({
        kind: "job",
        title: "Pump replacement",
        status: "requested",
        idempotencyKey: expect.stringMatching(/^job-create-/),
        sourceLinks: [
          {
            entityType: "quote",
            entityId: "64b000000000000000000201",
            label: "Pump quote"
          }
        ],
        payload: {
          job: expect.objectContaining({
            customer: {
              name: "Casey Grower",
              company: "",
              email: "casey@example.com",
              phone: ""
            },
            projectName: "Greenhouse pump",
            scheduledStartAt: "2026-08-24T13:00:00.000Z",
            scheduledEndAt: "2026-08-24T16:30:00.000Z",
            scheduleTimeZone: "America/New_York",
            scheduleTimeZoneVersion: 4,
            privateLocation: "Room 4",
            scope: "Replace failed circulation pump",
            relatedQuoteId: "64b000000000000000000201",
            externalProviderRef: {
              provider: "Stripe",
              referenceId: "in_123",
              referenceUrl: "https://example.test/in_123"
            },
            nextAction: "Confirm parts onsite"
          })
        }
      })
    );
    const job = mockCreate.mock.calls[0][1].payload.job;
    expect(job).not.toHaveProperty("stage");
    expect(job).not.toHaveProperty("assigneeUserId");
    expect(job.attachmentRefs).toEqual([]);
    expect(job.externalProviderRef).not.toHaveProperty("verificationStatus");
    expect(screen.queryByLabelText(/assignee user ID/i)).toBeNull();
    expect(screen.queryByLabelText(/attachment references/i)).toBeNull();
    expect(screen.queryByLabelText(/related quote ID/i)).toBeNull();
    expect(screen.getByText(/does not verify provider ownership/i)).toBeTruthy();
    expect(
      screen.getByText(/intentionally omits direct customer contact PII/i)
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Preview PII-redacted job CSV").props.accessibilityState
    ).toEqual({ busy: false, disabled: false });
  });

  it("binds ready job attachments and replaces them when another record opens", async () => {
    const firstId = "507f191e810c19729de86211";
    const secondId = "507f191e810c19729de86212";
    const first = jobRecord({
      _id: "64b000000000000000000211",
      title: "First attachment job",
      payload: {
        job: {
          ...(jobRecord().payload as any).job,
          attachmentRefs: [{ assetId: firstId }]
        }
      }
    });
    const second = jobRecord({
      _id: "64b000000000000000000212",
      title: "Second attachment job",
      payload: {
        job: {
          ...(jobRecord().payload as any).job,
          attachmentRefs: [{ assetId: secondId }]
        }
      }
    });
    mockList.mockImplementation(async (_workspace, options) =>
      options?.kind === "job" ? [first, second] : [quote]
    );
    mockUpdate.mockImplementation(async (_workspace, _id, input) => ({
      ...second,
      title: input.title,
      version: 8,
      payload: input.payload,
      sourceLinks: input.sourceLinks
    }));
    const screen = render(
      <JobNotesTool
        workspace={workspace}
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );
    fireEvent.press(await screen.findByLabelText("Open job notes First attachment job"));
    expect(screen.getByText(`Protected attachment IDs: ${firstId}`)).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Open job notes Second attachment job"));
    expect(screen.getByText(`Protected attachment IDs: ${secondId}`)).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Test add job_attachment attachment"));
    fireEvent.press(screen.getByLabelText("Save job record"));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][2].payload.job.attachmentRefs).toEqual([
      { assetId: secondId },
      { assetId: "507f191e810c19729de86201" }
    ]);
  });

  it("requires saved completion evidence, then transitions the exact revision only", async () => {
    const existing = jobRecord();
    mockList.mockImplementation(async (_workspace, options) =>
      options?.kind === "job" ? [existing] : [quote]
    );
    mockUpdate.mockImplementation(async (_workspace, _id, input) => {
      if (input.payload) {
        return {
          ...existing,
          title: input.title,
          status: input.status,
          version: 8,
          payload: input.payload,
          sourceLinks: input.sourceLinks
        };
      }
      return {
        ...existing,
        status: input.status,
        version: 9,
        payload: {
          job: {
            ...(existing.payload as any).job,
            completionNotes: "Pump tested under load",
            stage: input.status
          }
        }
      };
    });
    const screen = render(
      <JobNotesTool
        workspace={workspace}
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );
    fireEvent.press(await screen.findByLabelText("Open job notes Existing pump job"));
    fireEvent.press(screen.getByLabelText("Next job status Complete"));
    fireEvent.press(screen.getByLabelText("Change job status"));

    expect(
      await screen.findByText(/Save completion notes on this exact revision/i)
    ).toBeTruthy();
    expect(mockUpdate).not.toHaveBeenCalled();

    fireEvent.changeText(
      screen.getByLabelText("Job completion notes"),
      "Pump tested under load"
    );
    fireEvent.press(screen.getByLabelText("Save job record"));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][2]).toEqual(
      expect.objectContaining({
        expectedVersion: 7,
        status: "in_progress",
        title: "Existing pump job",
        idempotencyKey: expect.stringMatching(/^job-update-/)
      })
    );

    fireEvent.press(screen.getByLabelText("Next job status Complete"));
    fireEvent.press(screen.getByLabelText("Change job status"));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(2));
    const transition = mockUpdate.mock.calls[1][2];
    expect(transition).toEqual({
      expectedVersion: 8,
      status: "complete",
      idempotencyKey: expect.stringMatching(/^job-transition-/)
    });
    expect(transition).not.toHaveProperty("payload");
    expect(transition).not.toHaveProperty("title");
    expect(transition).not.toHaveProperty("sourceLinks");
  });

  it("fails closed when a legacy quote ID is not in authorized workspace results", async () => {
    const existing = jobRecord({
      payload: {
        job: {
          ...(jobRecord().payload as any).job,
          relatedQuoteId: "64b000000000000000000299"
        }
      }
    });
    mockList.mockImplementation(async (_workspace, options) =>
      options?.kind === "job" ? [existing] : [quote]
    );
    const screen = render(
      <JobNotesTool
        workspace={workspace}
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );
    fireEvent.press(await screen.findByLabelText("Open job notes Existing pump job"));
    fireEvent.press(screen.getByLabelText("Save job record"));

    expect(
      await screen.findByText(/related quote is no longer available in this workspace/i)
    ).toBeTruthy();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("rejects nonexistent and ambiguous job wall times in the authoritative zone", async () => {
    mockJobStart = "2026-03-08T02:30";
    const gapScreen = render(
      <JobNotesTool
        workspace={workspace}
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );
    await gapScreen.findByText(/Authoritative setting: America\/New_York · version 4/i);
    fireEvent.changeText(gapScreen.getByLabelText("Job record title"), "DST gap");
    fireEvent.changeText(gapScreen.getByLabelText("Job notes"), "Review schedule");
    fireEvent.press(gapScreen.getByLabelText("Job scheduled start date and time"));
    fireEvent.press(gapScreen.getByLabelText("Save job record"));
    await gapScreen.findByText(/does not exist in America\/New_York/i);
    gapScreen.unmount();

    mockJobStart = "2026-11-01T01:30";
    const overlapScreen = render(
      <JobNotesTool
        workspace={workspace}
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );
    await overlapScreen.findByText(
      /Authoritative setting: America\/New_York · version 4/i
    );
    fireEvent.changeText(overlapScreen.getByLabelText("Job record title"), "DST overlap");
    fireEvent.changeText(overlapScreen.getByLabelText("Job notes"), "Review schedule");
    fireEvent.press(overlapScreen.getByLabelText("Job scheduled start date and time"));
    fireEvent.press(overlapScreen.getByLabelText("Save job record"));
    await overlapScreen.findByText(/occurs twice in America\/New_York/i);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("keeps a Facility Manager read-only and blocks scheduling, while allowing an unscheduled note", async () => {
    mockGetWorkspaceTimeZone.mockResolvedValue({
      configured: false,
      workspaceType: "facility",
      workspaceId: "facility-2",
      timeZone: null,
      version: 0
    });
    mockCreate.mockImplementation(async (_workspace, input) => ({
      _id: "64b000000000000000000222",
      kind: "job",
      title: input.title,
      status: input.status,
      version: 1,
      payload: input.payload,
      sourceLinks: input.sourceLinks
    }));
    const screen = render(
      <JobNotesTool
        workspace={workspace}
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
        canConfigureTimeZone={false}
      />
    );
    await screen.findByText(
      /No workspace time zone is configured\. Time-sensitive calculations and writes are blocked/i
    );
    expect(screen.queryByLabelText("IANA workspace time zone")).toBeNull();
    expect(
      screen.getByLabelText("Job scheduled start date and time").props.accessibilityState
        .disabled
    ).toBe(true);
    fireEvent.changeText(screen.getByLabelText("Job record title"), "Unscheduled note");
    fireEvent.changeText(screen.getByLabelText("Job notes"), "Call before scheduling");
    fireEvent.press(screen.getByLabelText("Save job record"));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][1].payload.job).toEqual(
      expect.objectContaining({
        scheduledStartAt: null,
        scheduledEndAt: null,
        scheduleTimeZone: "",
        scheduleTimeZoneVersion: null
      })
    );
  });

  it("requires an explicit schedule decision when an owner changes zones after entering a wall time", async () => {
    mockPatchWorkspaceTimeZone.mockResolvedValue({
      configured: true,
      workspaceType: "facility",
      workspaceId: "facility-2",
      timeZone: "America/Chicago",
      version: 5,
      selectedByUserId: "owner-1",
      selectedByRole: "OWNER",
      selectedAt: "2026-08-22T14:00:00.000Z"
    });
    const screen = render(
      <JobNotesTool
        workspace={workspace}
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
        canConfigureTimeZone
      />
    );
    await screen.findByText(/Authoritative setting: America\/New_York · version 4/i);
    fireEvent.press(screen.getByLabelText("Job scheduled start date and time"));
    await waitFor(() =>
      expect(
        screen.getByLabelText("Job scheduled start date and time").props.testValue
      ).toBe("2026-08-24T09:00")
    );
    fireEvent.changeText(
      screen.getByLabelText("IANA workspace time zone"),
      "America/Chicago"
    );
    fireEvent.press(screen.getByLabelText("Save workspace time zone"));

    await screen.findByText(/Authoritative setting: America\/Chicago · version 5/i);
    expect(
      screen.getByText(/wall time without an exact instant was cleared/i)
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Save job record").props.accessibilityState.disabled
    ).toBe(true);
    fireEvent.press(screen.getByLabelText("Keep job unscheduled after time zone change"));
    expect(
      screen.getByLabelText("Save job record").props.accessibilityState.disabled
    ).toBe(false);
  });

  it("offers only active current Facility members and saves a reauthorized proposal without side-effect claims", async () => {
    const existing = jobRecord();
    mockList.mockImplementation(async (_workspace, options) =>
      options?.kind === "job" ? [existing] : [quote]
    );
    mockListTeamMembers.mockResolvedValue([
      {
        id: "member-alice",
        userId: "user-alice",
        role: "STAFF",
        name: "Alice Active"
      },
      {
        id: "member-bob",
        userId: "user-bob",
        role: "STAFF",
        name: "Bob Invited",
        invited: true
      },
      {
        id: "member-carol",
        userId: "user-carol",
        role: "MANAGER",
        name: "Carol Removed",
        deletedAt: "2026-08-20T12:00:00.000Z"
      },
      {
        id: "member-admin",
        userId: "user-admin",
        role: "ADMIN",
        name: "Legacy Admin"
      }
    ]);
    mockUpdate.mockImplementation(async (_workspace, _id, input) => ({
      ...existing,
      title: input.title,
      version: 8,
      payload: {
        job: {
          ...input.payload.job,
          assigneeProposalEvidence: {
            authorizationStatus: "authorized_proposal",
            assigneeRole: "STAFF",
            authorizationCheckedAt: "2026-08-22T13:00:00.000Z",
            sideEffectsPerformed: false
          }
        }
      },
      sourceLinks: input.sourceLinks
    }));
    const screen = render(
      <JobNotesTool
        workspace={workspace}
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );
    fireEvent.press(await screen.findByLabelText("Open job notes Existing pump job"));
    fireEvent.press(await screen.findByLabelText("Propose job assignee Alice Active"));
    expect(screen.queryByLabelText(/Bob Invited/i)).toBeNull();
    expect(screen.queryByLabelText(/Carol Removed/i)).toBeNull();
    expect(screen.queryByLabelText(/Legacy Admin/i)).toBeNull();
    expect(screen.queryByLabelText(/assignee user ID/i)).toBeNull();
    fireEvent.press(screen.getByLabelText("Save job record"));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][2].payload.job.assigneeUserId).toBe("user-alice");
    expect(
      await screen.findByText(/assignee proposal was reauthorized for this revision/i)
    ).toBeTruthy();
    expect(screen.getByText(/Side effects performed: none/i)).toBeTruthy();
    expect(
      screen.queryByText(/notification sent|task created|customer contacted/i)
    ).toBeNull();
  });

  it("offers only the authenticated Commercial self identity", async () => {
    const existing = jobRecord();
    mockList.mockImplementation(async (_workspace, options) =>
      options?.kind === "job" ? [existing] : [quote]
    );
    mockUpdate.mockImplementation(async (_workspace, _id, input) => ({
      ...existing,
      title: input.title,
      version: 8,
      payload: input.payload,
      sourceLinks: input.sourceLinks
    }));
    const screen = render(
      <JobNotesTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
        currentUser={{ userId: "owner-1", label: "Commercial Owner" }}
      />
    );
    fireEvent.press(await screen.findByLabelText("Open job notes Existing pump job"));
    fireEvent.press(screen.getByLabelText("Propose job assignee Commercial Owner"));
    fireEvent.press(screen.getByLabelText("Save job record"));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][2].payload.job.assigneeUserId).toBe("owner-1");
    expect(screen.queryByLabelText(/assignee user ID/i)).toBeNull();
    expect(mockListTeamMembers).not.toHaveBeenCalled();
  });

  it("retains the draft and requires authorization reload after role drift", async () => {
    const existing = jobRecord();
    const accessChanged = Object.assign(
      new Error("Workspace access changed. Reload before retrying."),
      { code: "BUSINESS_DESK_WORKSPACE_ACCESS_CHANGED", status: 403 }
    );
    mockList.mockImplementation(async (_workspace, options) =>
      options?.kind === "job" ? [existing] : [quote]
    );
    mockUpdate.mockRejectedValue(accessChanged);
    const screen = render(
      <JobNotesTool
        workspace={workspace}
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );
    fireEvent.press(await screen.findByLabelText("Open job notes Existing pump job"));
    fireEvent.changeText(
      screen.getByLabelText("Job record title"),
      "Draft retained after drift"
    );
    fireEvent.press(screen.getByLabelText("Save job record"));

    expect(
      await screen.findAllByText(/Workspace access changed\. Reload before retrying/i)
    ).not.toHaveLength(0);
    expect(screen.getByLabelText("Job record title").props.value).toBe(
      "Draft retained after drift"
    );
    expect(screen.getByLabelText("Reload job authorization data")).toBeTruthy();
    const listCallsBeforeReload = mockList.mock.calls.length;
    fireEvent.press(screen.getByLabelText("Reload job authorization data"));
    await screen.findByText(/Loading authoritative workspace time zone/i);
    await waitFor(() =>
      expect(mockList.mock.calls.length).toBeGreaterThan(listCallsBeforeReload)
    );
    await screen.findByText(/Authoritative setting: America\/New_York · version 4/i);
    expect(mockGetWorkspaceTimeZone.mock.calls.length).toBeGreaterThan(1);
    expect(mockListTeamMembers.mock.calls.length).toBeGreaterThan(1);
  });

  it("rejects incomplete or non-http manual provider references", async () => {
    const screen = render(
      <JobNotesTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    fireEvent.changeText(screen.getByLabelText("Job record title"), "Provider note");
    fireEvent.changeText(screen.getByLabelText("Job notes"), "Reference supplied");
    fireEvent.changeText(
      screen.getByLabelText("Job unverified external provider"),
      "Stripe"
    );
    fireEvent.press(screen.getByLabelText("Save job record"));
    expect(
      await screen.findByText(/needs both the provider name and reference ID/i)
    ).toBeTruthy();

    fireEvent.changeText(
      screen.getByLabelText("Job unverified external reference ID"),
      "in_123"
    );
    fireEvent.changeText(
      screen.getByLabelText("Job unverified external reference URL"),
      "javascript:alert(1)"
    );
    fireEvent.press(screen.getByLabelText("Save job record"));
    expect(
      await screen.findByText(/must start with http:\/\/ or https:\/\//i)
    ).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
