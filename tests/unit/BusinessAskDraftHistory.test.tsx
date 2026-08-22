import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { ApiError } from "@/api/apiRequest";
import {
  getBusinessAskAttestation,
  getBusinessAskCitationEvidence,
  getBusinessDeskProviderOperation
} from "@/api/businessDeskProvider";
import {
  archiveBusinessDeskRecord,
  getBusinessDeskRecord,
  listBusinessDeskRecordPage,
  updateBusinessDeskRecord,
  type BusinessDeskRecord
} from "@/api/businessDesk";
import BusinessAskDraftHistory, {
  parseBusinessAskAssistantDraft
} from "@/features/businessDesk/BusinessAskDraftHistory";
import { businessAskProjectionDigest } from "@/features/businessDesk/businessAskEvidence";

const mockUseOptionalAuth = jest.fn();

jest.mock("@/auth/AuthContext", () => ({
  useOptionalAuth: () => mockUseOptionalAuth()
}));

jest.mock("@/api/businessDeskProvider", () => {
  const actual = jest.requireActual("@/api/businessDeskProvider");
  return {
    ...actual,
    getBusinessAskAttestation: jest.fn(),
    getBusinessAskCitationEvidence: jest.fn(),
    getBusinessDeskProviderOperation: jest.fn()
  };
});

jest.mock("@/api/businessDesk", () => {
  const actual = jest.requireActual("@/api/businessDesk");
  return {
    ...actual,
    archiveBusinessDeskRecord: jest.fn(),
    getBusinessDeskRecord: jest.fn(),
    listBusinessDeskRecordPage: jest.fn(),
    updateBusinessDeskRecord: jest.fn()
  };
});

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children, href }: any) => React.cloneElement(children, { testHref: href })
  };
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  function MockAppCard({ title, subtitle, children }: any) {
    return React.createElement(
      View,
      null,
      React.createElement(Text, null, title),
      React.createElement(Text, null, subtitle),
      children
    );
  }
  return MockAppCard;
});

const mockList = listBusinessDeskRecordPage as jest.MockedFunction<
  typeof listBusinessDeskRecordPage
>;
const mockGetRecord = getBusinessDeskRecord as jest.MockedFunction<
  typeof getBusinessDeskRecord
>;
const mockUpdate = updateBusinessDeskRecord as jest.MockedFunction<
  typeof updateBusinessDeskRecord
>;
const mockArchive = archiveBusinessDeskRecord as jest.MockedFunction<
  typeof archiveBusinessDeskRecord
>;
const mockGetOperation = getBusinessDeskProviderOperation as jest.MockedFunction<
  typeof getBusinessDeskProviderOperation
>;
const mockGetAttestation = getBusinessAskAttestation as jest.MockedFunction<
  typeof getBusinessAskAttestation
>;
const mockGetEvidence = getBusinessAskCitationEvidence as jest.MockedFunction<
  typeof getBusinessAskCitationEvidence
>;

const digest = "a".repeat(64);
const providerInputDigest = "b".repeat(64);
const sourceManifestDigest = "c".repeat(64);
const RECORD_IDS = [
  "507f191e810c19729de86011",
  "507f191e810c19729de86012",
  "507f191e810c19729de86013"
];
const OPERATION_IDS = [
  "507f191e810c19729de86001",
  "507f191e810c19729de86002",
  "507f191e810c19729de86003"
];

function citation(index = 0) {
  return {
    id: `S${String(index + 1).padStart(3, "0")}`,
    sourceType: "business_desk_record" as const,
    recordId: `507f191e810c19729de861${String(index).padStart(2, "0")}`,
    parentRecordId: null,
    recordKind: "quote",
    title: `Quote source ${index + 1}`,
    version: 2,
    sourceDate: "2026-08-21T12:00:00.000Z",
    dateRange: { from: "2026-07-01", to: "2026-08-22" }
  };
}

function result(recordIndex = 0, citationCount = 1) {
  const citations = Array.from({ length: citationCount }, (_, index) => citation(index));
  const citationIds = citations.map((entry) => entry.id);
  return {
    type: "business_ask" as const,
    schemaVersion: "business-desk-business-ask-v1" as const,
    resultDigestSha256: digest,
    answer: `Verified answer ${recordIndex + 1}`,
    incomplete: false,
    answerCitationIds: [citationIds[0]],
    facts: [
      { statement: `Structured fact ${recordIndex + 1}`, citationIds: [citationIds[0]] }
    ],
    calculations: [
      {
        statement: "Provider calculation for review",
        formula: "recorded input + recorded input",
        inputs: ["recorded input"],
        citationIds: [citationIds[0]],
        incomplete: false,
        verification: "provider_unverified" as const,
        requiresReview: true as const
      }
    ],
    assumptions: [{ statement: "Visible assumption", citationIds: [citationIds[0]] }],
    scenarios: [{ statement: "Visible scenario", citationIds: [citationIds[0]] }],
    recommendations: [
      {
        statement: "Visible reviewed recommendation",
        citationIds: [citationIds[0]],
        requiresReview: true as const
      }
    ],
    limitations: ["Visible limitation"],
    missingInformation: ["Visible missing information"],
    citations,
    kpiSnapshot: {
      scope: "in_selected_sources" as const,
      dateRange: { from: "2026-07-01", to: "2026-08-22" },
      selectedSourceCount: citationCount,
      truncated: false,
      omittedSourceCount: 0,
      metrics: [
        {
          key: "open_quotes" as const,
          count: citationCount,
          complete: true,
          sourceIds: citationIds
        }
      ]
    },
    dateRange: { from: "2026-07-01", to: "2026-08-22" },
    selectedRecordCount: citationCount,
    truncated: false,
    assistantDraftRecordId: RECORD_IDS[recordIndex],
    assistantDraftVersion: 1
  };
}

function draftRecord(
  recordIndex = 0,
  status: "draft" | "reviewed" | "rejected" = "draft",
  version = 1,
  citationCount = 1,
  archivedAt: string | null = null
): BusinessDeskRecord {
  const askResult = result(recordIndex, citationCount);
  const prompt = `Which saved work needs attention ${recordIndex + 1}?`;
  return {
    id: RECORD_IDS[recordIndex],
    kind: "assistant_draft",
    title: `Business Ask: ${prompt}`,
    status,
    version,
    archivedAt,
    updatedAt: "2026-08-22T12:00:00.000Z",
    payload: {
      assistantDraft: {
        tool: "business_ask",
        prompt,
        content: askResult.answer,
        provenance: "ai_draft",
        providerOperationId: OPERATION_IDS[recordIndex],
        citationIds: askResult.citations.map((entry) => entry.id),
        reviewStatus: status,
        reviewedAt: status === "reviewed" ? "2026-08-22T13:00:00.000Z" : null
      }
    },
    sourceLinks: []
  };
}

function operationPacket(recordIndex = 0, citationCount = 1) {
  return {
    operation: {
      id: OPERATION_IDS[recordIndex],
      kind: "business_ask" as const,
      state: "succeeded" as const,
      version: 2,
      clientOperationKey: `ask-operation-${recordIndex}`,
      requestDigest: digest,
      cancellable: false,
      timestamps: {
        createdAt: "2026-08-22T12:00:00.000Z",
        updatedAt: "2026-08-22T12:00:02.000Z",
        queuedAt: "2026-08-22T12:00:00.000Z",
        processingAt: "2026-08-22T12:00:01.000Z",
        completedAt: "2026-08-22T12:00:02.000Z",
        cancelledAt: null
      },
      error: null,
      credit: { credits: 1, status: "charged" as const },
      result: result(recordIndex, citationCount)
    },
    idempotentReplay: null
  };
}

function attestation(recordIndex = 0, citationCount = 1) {
  const askResult = result(recordIndex, citationCount);
  return {
    operationId: OPERATION_IDS[recordIndex],
    kind: "business_ask" as const,
    state: "succeeded" as const,
    providerInputDigestSha256: providerInputDigest,
    sourceManifestDigestSha256: sourceManifestDigest,
    resultDigestSha256: digest,
    provider: "openai",
    model: "configured-model",
    schemaVersion: "business-desk-business-ask-v1",
    promptVersion: "business-ask-v1",
    completedAt: "2026-08-22T12:00:02.000Z",
    sources: askResult.citations.map((entry) => ({
      id: entry.id,
      sourceType: entry.sourceType,
      recordId: entry.recordId,
      parentRecordId: entry.parentRecordId,
      recordKind: entry.recordKind,
      version: entry.version,
      sourceDate: entry.sourceDate
    }))
  };
}

function evidence(recordIndex: number, citationIndex: number) {
  const source = citation(citationIndex);
  const projection = { kind: "quote", title: source.title };
  return {
    operationId: OPERATION_IDS[recordIndex],
    citation: source,
    providerSourceProjection: projection,
    evidence: {
      providerSourceProjectionDigestSha256: businessAskProjectionDigest(projection),
      providerInputDigestSha256: providerInputDigest,
      sourceManifestDigestSha256: sourceManifestDigest,
      resultDigestSha256: digest,
      schemaVersion: "business-desk-business-ask-v1",
      promptVersion: "business-ask-v1"
    }
  };
}

function page(
  records: BusinessDeskRecord[],
  hasMore = false,
  nextCursor: string | null = null
) {
  return { records, page: { limit: 10, hasMore, nextCursor } };
}

function installEvidenceMocks(citationCounts: Record<number, number> = { 0: 1, 1: 1 }) {
  mockGetOperation.mockImplementation(async (_workspace, operationId) => {
    const recordIndex = OPERATION_IDS.indexOf(operationId);
    return operationPacket(recordIndex, citationCounts[recordIndex] || 1) as any;
  });
  mockGetAttestation.mockImplementation(async (_workspace, operationId) => {
    const recordIndex = OPERATION_IDS.indexOf(operationId);
    return attestation(recordIndex, citationCounts[recordIndex] || 1);
  });
  mockGetEvidence.mockImplementation(async (_workspace, operationId, citationId) => {
    const recordIndex = OPERATION_IDS.indexOf(operationId);
    const citationIndex = Number(citationId.slice(1)) - 1;
    return evidence(recordIndex, citationIndex) as any;
  });
}

describe("Saved Business Ask drafts", () => {
  beforeEach(() => {
    mockUseOptionalAuth.mockReset().mockReturnValue({
      user: { id: "account-one" },
      ctx: { facilityRole: "OWNER" }
    });
    mockList.mockReset().mockResolvedValue(page([draftRecord(0)]));
    mockGetRecord.mockReset().mockImplementation(async (_workspace, recordId) => {
      const recordIndex = RECORD_IDS.indexOf(recordId);
      return draftRecord(recordIndex);
    });
    mockUpdate.mockReset();
    mockArchive.mockReset();
    mockGetOperation.mockReset();
    mockGetAttestation.mockReset();
    mockGetEvidence.mockReset();
    installEvidenceMocks();
  });

  it("paginates to an older draft and verifies every cited projection before full review", async () => {
    mockList
      .mockResolvedValueOnce(page([draftRecord(0)], true, "older-page"))
      .mockResolvedValueOnce(page([draftRecord(1)], false, null));
    mockGetRecord.mockResolvedValueOnce(draftRecord(1, "draft", 1, 2));
    installEvidenceMocks({ 0: 1, 1: 2 });

    const screen = render(
      <BusinessAskDraftHistory
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );
    expect(await screen.findByText(/needs attention 1/i)).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Load more saved Business Ask drafts"));
    expect(await screen.findByText(/needs attention 2/i)).toBeTruthy();
    fireEvent.press(
      screen.getByLabelText(
        "Open Business Ask: Which saved work needs attention 2?, revision 1"
      )
    );

    expect(await screen.findByText("Structured fact 2")).toBeTruthy();
    expect(screen.getByText("Provider calculation for review")).toBeTruthy();
    expect(screen.getByText("Visible assumption")).toBeTruthy();
    expect(screen.getByText("Visible scenario")).toBeTruthy();
    expect(screen.getByText("Visible reviewed recommendation")).toBeTruthy();
    expect(screen.getByText("Visible limitation")).toBeTruthy();
    expect(screen.getByText("Visible missing information")).toBeTruthy();
    expect(screen.getByText("2 in selected sources")).toBeTruthy();
    expect(screen.getByLabelText("Mark exact assistant draft reviewed")).toBeTruthy();
    expect(mockGetEvidence).toHaveBeenCalledTimes(2);
    expect(mockGetEvidence).toHaveBeenNthCalledWith(
      2,
      { workspaceType: "commercial" },
      OPERATION_IDS[1],
      "S002",
      expect.objectContaining({ signal: expect.any(Object) })
    );
  });

  it("withholds all material draft content and lifecycle actions on evidence mismatch", async () => {
    mockGetEvidence.mockResolvedValueOnce({
      ...evidence(0, 0),
      evidence: {
        ...evidence(0, 0).evidence,
        resultDigestSha256: "f".repeat(64)
      }
    } as any);
    const screen = render(
      <BusinessAskDraftHistory
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );
    fireEvent.press(
      await screen.findByLabelText(
        "Open Business Ask: Which saved work needs attention 1?, revision 1"
      )
    );
    expect(await screen.findByText(/saved draft was withheld/i)).toBeTruthy();
    expect(screen.queryByText("Verified answer 1")).toBeNull();
    expect(screen.queryByText("Structured fact 1")).toBeNull();
    expect(screen.queryByLabelText("Mark exact assistant draft reviewed")).toBeNull();
  });

  it("clears prompt summaries and detail after access is revoked", async () => {
    mockGetRecord.mockRejectedValueOnce(new ApiError("FORBIDDEN", 403));
    const screen = render(
      <BusinessAskDraftHistory
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );
    const title = await screen.findByText(/needs attention 1/i);
    expect(title).toBeTruthy();
    fireEvent.press(
      screen.getByLabelText(
        "Open Business Ask: Which saved work needs attention 1?, revision 1"
      )
    );
    expect(
      await screen.findByText(/no longer available in the active account/i)
    ).toBeTruthy();
    expect(screen.queryByText(/needs attention 1/i)).toBeNull();
    expect(screen.queryByText("Verified answer 1")).toBeNull();
  });

  it("discards a late list response after the account workspace scope changes", async () => {
    let resolveCommercial!: (value: ReturnType<typeof page>) => void;
    const commercialPage = new Promise<ReturnType<typeof page>>((resolve) => {
      resolveCommercial = resolve;
    });
    mockList
      .mockReturnValueOnce(commercialPage)
      .mockResolvedValueOnce(page([draftRecord(1)]));
    const screen = render(
      <BusinessAskDraftHistory
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );
    screen.rerender(
      <BusinessAskDraftHistory
        workspace={{ workspaceType: "facility", facilityId: "facility-b" }}
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );
    expect(await screen.findByText(/needs attention 2/i)).toBeTruthy();
    resolveCommercial(page([draftRecord(0)]));
    await waitFor(() => expect(screen.queryByText(/needs attention 1/i)).toBeNull());
    expect(
      screen.getByText(/shared workspace content visible to authorized Owners/i)
    ).toBeTruthy();
  });

  it("reuses the same retry key for an unconfirmed review and reopens reviewed evidence", async () => {
    mockUpdate
      .mockRejectedValueOnce(new ApiError("NETWORK_ERROR", null))
      .mockResolvedValueOnce(draftRecord(0, "reviewed", 2));
    const screen = render(
      <BusinessAskDraftHistory
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );
    fireEvent.press(
      await screen.findByLabelText(
        "Open Business Ask: Which saved work needs attention 1?, revision 1"
      )
    );
    const review = await screen.findByLabelText("Mark exact assistant draft reviewed");
    fireEvent.press(review);
    expect(await screen.findByText(/server response was not confirmed/i)).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Mark exact assistant draft reviewed"));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(2));
    const firstKey = mockUpdate.mock.calls[0][2].idempotencyKey;
    const secondKey = mockUpdate.mock.calls[1][2].idempotencyKey;
    expect(firstKey).toBe(secondKey);
    expect(mockUpdate).toHaveBeenLastCalledWith(
      { workspaceType: "commercial" },
      RECORD_IDS[0],
      expect.objectContaining({ expectedVersion: 1, status: "reviewed" }),
      expect.objectContaining({ signal: expect.any(Object) })
    );
    expect(
      await screen.findByText(/exact assistant draft revision is now reviewed/i)
    ).toBeTruthy();
    expect(screen.getByText(/reviewed · operation evidence verified/i)).toBeTruthy();
  });

  it("accepts a rejected lifecycle with null reviewedAt and archives with a reason", async () => {
    mockUpdate.mockResolvedValueOnce(draftRecord(0, "rejected", 2));
    mockArchive.mockResolvedValueOnce(
      draftRecord(0, "rejected", 3, 1, "2026-08-22T14:00:00.000Z")
    );
    const screen = render(
      <BusinessAskDraftHistory
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );
    fireEvent.press(
      await screen.findByLabelText(
        "Open Business Ask: Which saved work needs attention 1?, revision 1"
      )
    );
    fireEvent.press(await screen.findByLabelText("Reject exact assistant draft"));
    expect(
      await screen.findByText(/exact assistant draft revision is now rejected/i)
    ).toBeTruthy();
    fireEvent.changeText(
      screen.getByLabelText("Saved assistant draft archive reason"),
      "Superseded by a newer reviewed answer"
    );
    fireEvent.press(screen.getByLabelText("Archive exact assistant draft"));
    await waitFor(() => expect(mockArchive).toHaveBeenCalledTimes(1));
    expect(mockArchive).toHaveBeenCalledWith(
      { workspaceType: "commercial" },
      RECORD_IDS[0],
      expect.objectContaining({
        expectedVersion: 2,
        reason: "Superseded by a newer reviewed answer",
        idempotencyKey: expect.any(String)
      }),
      expect.objectContaining({ signal: expect.any(Object) })
    );
    expect(
      await screen.findByText(/archived with its audit history retained/i)
    ).toBeTruthy();
  });

  it("requires a refreshed version after a 409 conflict", async () => {
    mockUpdate.mockRejectedValueOnce(new ApiError("VERSION_CONFLICT", 409));
    mockGetRecord
      .mockResolvedValueOnce(draftRecord(0))
      .mockResolvedValueOnce(draftRecord(0, "draft", 2));
    const screen = render(
      <BusinessAskDraftHistory
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );
    fireEvent.press(
      await screen.findByLabelText(
        "Open Business Ask: Which saved work needs attention 1?, revision 1"
      )
    );
    fireEvent.press(await screen.findByLabelText("Mark exact assistant draft reviewed"));
    expect(await screen.findByText(/changed after it was opened/i)).toBeTruthy();
    fireEvent.press(
      screen.getByLabelText("Refresh exact assistant draft after conflict")
    );
    expect(
      await screen.findByText(/Verified assistant draft · revision 2/i)
    ).toBeTruthy();
  });

  it("accepts more than twenty bounded citation IDs in the saved draft contract", () => {
    const citations = Array.from(
      { length: 21 },
      (_, index) => `S${String(index + 1).padStart(3, "0")}`
    );
    const record = draftRecord(0);
    (record.payload.assistantDraft as any).citationIds = citations;
    expect(parseBusinessAskAssistantDraft(record)?.citationIds).toHaveLength(21);
  });
});
