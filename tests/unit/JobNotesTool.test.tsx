import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import JobNotesTool, {
  allowedJobTransitions
} from "@/features/businessDesk/JobNotesTool";

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
            String(accessibilityLabel).includes("start")
              ? "2026-08-24T09:00"
              : "2026-08-24T12:30"
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
    mockArchive.mockReset();
    mockCreate.mockReset();
    mockList
      .mockReset()
      .mockImplementation(async (_workspace, options) =>
        options?.kind === "job" ? [] : [quote]
      );
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
            scheduledStartAt: expect.any(String),
            scheduledEndAt: expect.any(String),
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
