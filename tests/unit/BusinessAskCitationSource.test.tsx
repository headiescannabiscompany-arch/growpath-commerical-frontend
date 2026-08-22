import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import {
  getBusinessAskAttestation,
  getBusinessAskCitationEvidence,
  getBusinessDeskProviderOperation
} from "@/api/businessDeskProvider";
import { getBusinessDeskRecord, getBusinessDeskRevision } from "@/api/businessDesk";
import { getBusinessInventoryItem } from "@/api/businessInventory";
import BusinessAskCitationSource from "@/features/businessDesk/BusinessAskCitationSource";
import { businessDeskProviderSignatureSha256 } from "@/features/businessDesk/providerOperationPersistence";

const mockParams = {
  operationId: "507f191e810c19729de86001",
  citationId: "S001"
};

jest.mock("expo-router", () => ({
  Link: ({ children }: any) => children,
  useLocalSearchParams: () => mockParams
}));

jest.mock("@/api/businessDeskProvider", () => ({
  businessAskAttestationMatchesResult: jest.requireActual("@/api/businessDeskProvider")
    .businessAskAttestationMatchesResult,
  getBusinessAskAttestation: jest.fn(),
  getBusinessAskCitationEvidence: jest.fn(),
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
  return function MockAppPage({ header, children }: any) {
    return React.createElement(View, null, header, children);
  };
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return function MockAppCard({ title, children }: any) {
    return React.createElement(
      View,
      null,
      React.createElement(Text, null, title),
      children
    );
  };
});

const mockGetOperation = getBusinessDeskProviderOperation as jest.MockedFunction<
  typeof getBusinessDeskProviderOperation
>;
const mockGetAttestation = getBusinessAskAttestation as jest.MockedFunction<
  typeof getBusinessAskAttestation
>;
const mockGetCitationEvidence = getBusinessAskCitationEvidence as jest.MockedFunction<
  typeof getBusinessAskCitationEvidence
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

const resultDigest = "a".repeat(64);
const providerInputDigest = "b".repeat(64);
const sourceManifestDigest = "c".repeat(64);

function citation(citationOverrides: Record<string, unknown> = {}) {
  return {
    id: "S001",
    sourceType: "business_desk_record",
    recordId: "507f191e810c19729de86010",
    parentRecordId: null,
    recordKind: "quote",
    title: "Spring quote",
    version: 3,
    sourceDate: "2026-08-21T12:00:00.000Z",
    dateRange: { from: "2026-07-01", to: "2026-08-22" },
    ...citationOverrides
  };
}

function operationPacket(citationOverrides: Record<string, unknown> = {}) {
  return {
    operation: {
      state: "succeeded",
      result: {
        type: "business_ask",
        resultDigestSha256: resultDigest,
        selectedRecordCount: 1,
        citations: [citation(citationOverrides)]
      }
    }
  } as any;
}

function attestation(citationOverrides: Record<string, unknown> = {}) {
  const row = citation(citationOverrides);
  return {
    operationId: "507f191e810c19729de86001",
    kind: "business_ask",
    state: "succeeded",
    providerInputDigestSha256: providerInputDigest,
    sourceManifestDigestSha256: sourceManifestDigest,
    resultDigestSha256: resultDigest,
    provider: "openai",
    model: "configured-model",
    schemaVersion: "business-desk-business-ask-v1",
    promptVersion: "business-ask-v1",
    completedAt: "2026-08-22T12:00:02.000Z",
    sources: [
      {
        id: row.id,
        sourceType: row.sourceType,
        recordId: row.recordId,
        parentRecordId: row.parentRecordId,
        recordKind: row.recordKind,
        version: row.version,
        sourceDate: row.sourceDate
      }
    ]
  } as any;
}

function citationEvidence(
  citationOverrides: Record<string, unknown> = {},
  providerSourceProjection: unknown = { title: "Spring quote" }
) {
  return {
    operationId: "507f191e810c19729de86001",
    citation: citation(citationOverrides),
    providerSourceProjection,
    evidence: {
      providerSourceProjectionDigestSha256: businessDeskProviderSignatureSha256(
        JSON.stringify(providerSourceProjection)
      ),
      providerInputDigestSha256: providerInputDigest,
      sourceManifestDigestSha256: sourceManifestDigest,
      resultDigestSha256: resultDigest,
      schemaVersion: "business-desk-business-ask-v1",
      promptVersion: "business-ask-v1"
    }
  } as any;
}

describe("Business Ask citation source inspector", () => {
  beforeEach(() => {
    mockGetOperation.mockReset();
    mockGetAttestation.mockReset();
    mockGetCitationEvidence.mockReset();
    mockGetRecord.mockReset();
    mockGetRevision.mockReset();
    mockGetInventoryItem.mockReset();
    mockGetAttestation.mockResolvedValue(attestation());
    mockGetCitationEvidence.mockResolvedValue(citationEvidence());
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
    expect(mockGetAttestation).not.toHaveBeenCalled();
    expect(mockGetCitationEvidence).not.toHaveBeenCalled();
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

    expect(await screen.findByText("Projection used by Business Ask")).toBeTruthy();
    expect(screen.getByText(/authorized revision 3 for comparison only/i)).toBeTruthy();
    expect(screen.getByText(/"title": "Spring quote"/i)).toBeTruthy();
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

    expect(
      await screen.findByText(/authorized current-record comparison is unavailable/i)
    ).toBeTruthy();
    expect(screen.getByText("Projection used by Business Ask")).toBeTruthy();
    await waitFor(() => expect(mockGetRevision).toHaveBeenCalledTimes(1));
    expect(mockGetRecord).not.toHaveBeenCalled();
  });

  it("opens the exact cited lot identity through its server-attested parent item", async () => {
    const lotCitation = {
      sourceType: "business_inventory_lot",
      recordId: "507f191e810c19729de86021",
      parentRecordId: "507f191e810c19729de86020",
      recordKind: "business_inventory_lot",
      title: "Lot SOIL-22",
      version: null
    };
    mockGetOperation.mockResolvedValue(operationPacket(lotCitation));
    mockGetAttestation.mockResolvedValue(attestation(lotCitation));
    mockGetCitationEvidence.mockResolvedValue(
      citationEvidence(lotCitation, { lotCode: "SOIL-22", quantityOnHand: 4 })
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
      await screen.findByText(/current authorized lot for comparison only/i)
    ).toBeTruthy();
    expect(screen.getAllByText(/SOIL-22/i).length).toBeGreaterThan(0);
    expect(mockGetInventoryItem).toHaveBeenCalledWith({}, "507f191e810c19729de86020");
  });

  it("refuses to substitute a different or missing lot from the cited parent item", async () => {
    const lotCitation = {
      sourceType: "business_inventory_lot",
      recordId: "507f191e810c19729de86021",
      parentRecordId: "507f191e810c19729de86020",
      recordKind: "business_inventory_lot",
      title: "Missing lot",
      version: null
    };
    mockGetOperation.mockResolvedValue(operationPacket(lotCitation));
    mockGetAttestation.mockResolvedValue(attestation(lotCitation));
    mockGetCitationEvidence.mockResolvedValue(
      citationEvidence(lotCitation, { lotCode: "SOIL-22", quantityOnHand: 4 })
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

  it("separates the exact AI projection from fuller authorized comparison fields", async () => {
    const cashCitation = {
      recordKind: "cash_flow_snapshot",
      title: "Cash-flow snapshot"
    };
    mockGetOperation.mockResolvedValue(operationPacket(cashCitation));
    mockGetAttestation.mockResolvedValue(attestation(cashCitation));
    mockGetCitationEvidence.mockResolvedValue(
      citationEvidence(cashCitation, {
        currency: "USD",
        kind: "cash_flow_snapshot"
      })
    );
    mockGetRevision.mockResolvedValue({
      recordId: "507f191e810c19729de86010",
      revisionNumber: 3,
      snapshot: {
        kind: "cash_flow_snapshot",
        currency: "USD",
        currentCashMinor: 987654
      }
    });

    const screen = render(
      <BusinessAskCitationSource
        workspace={{ workspaceType: "facility", facilityId: "facility-1" }}
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );

    expect(await screen.findByText("Projection used by Business Ask")).toBeTruthy();
    const projection = screen.getByText(/"kind": "cash_flow_snapshot"/i);
    expect(projection.props.children).not.toContain("currentCashMinor");
    expect(screen.getByText("Authorized record comparison — not AI input")).toBeTruthy();
    expect(screen.getByText(/"currentCashMinor": 987654/)).toBeTruthy();
    expect(
      screen.getByText(/Only the projection above is attributed to the AI/i)
    ).toBeTruthy();
  });

  it("withholds both the projection and comparison when evidence digests drift", async () => {
    mockGetOperation.mockResolvedValue(operationPacket());
    mockGetCitationEvidence.mockResolvedValue({
      ...citationEvidence(),
      evidence: {
        ...citationEvidence().evidence,
        resultDigestSha256: "d".repeat(64)
      }
    });
    mockGetRevision.mockResolvedValue({
      recordId: "507f191e810c19729de86010",
      revisionNumber: 3,
      snapshot: { customer: "Must remain hidden" }
    });

    const screen = render(
      <BusinessAskCitationSource
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );

    expect(await screen.findByText(/Nothing was displayed/i)).toBeTruthy();
    expect(screen.queryByText("Projection used by Business Ask")).toBeNull();
    expect(screen.queryByText(/Must remain hidden/i)).toBeNull();
    expect(mockGetRevision).not.toHaveBeenCalled();
  });
});
