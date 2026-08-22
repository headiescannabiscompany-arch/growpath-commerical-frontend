import { apiRequest } from "@/api/apiRequest";
import {
  BUSINESS_DESK_ARTIFACT_PROJECTION_VERSION,
  BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES,
  prepareBusinessDeskArtifact,
  previewBusinessDeskArtifact,
  type BusinessDeskArtifactKind,
  type BusinessDeskArtifactPreview,
  type BusinessDeskTransientArtifact
} from "@/api/businessDeskArtifacts";
import { sha256Utf8, utf8Bytes } from "@/utils/sha256Utf8";

jest.mock("@/api/apiRequest", () => ({ apiRequest: jest.fn() }));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;
const RECORD_ID = "507f191e810c19729de86020";
const REVISION_ID = "507f191e810c19729de86021";

const fixtureSpec: Record<
  BusinessDeskArtifactKind,
  {
    mode: "copy" | "csv";
    contentType: "text/plain; charset=utf-8" | "text/csv; charset=utf-8";
    profile: BusinessDeskTransientArtifact["redactionProfile"];
    recordKind: string;
  }
> = {
  quote_copy: {
    mode: "copy",
    contentType: "text/plain; charset=utf-8",
    profile: BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES.quote_copy,
    recordKind: "quote"
  },
  quote_csv: {
    mode: "csv",
    contentType: "text/csv; charset=utf-8",
    profile: BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES.quote_csv,
    recordKind: "quote"
  },
  expense_csv_batch: {
    mode: "csv",
    contentType: "text/csv; charset=utf-8",
    profile: BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES.expense_csv_batch,
    recordKind: "expense"
  },
  lead_private_csv: {
    mode: "csv",
    contentType: "text/csv; charset=utf-8",
    profile: BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES.lead_private_csv,
    recordKind: "lead"
  },
  job_redacted_csv: {
    mode: "csv",
    contentType: "text/csv; charset=utf-8",
    profile: BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES.job_redacted_csv,
    recordKind: "job"
  },
  cash_flow_csv: {
    mode: "csv",
    contentType: "text/csv; charset=utf-8",
    profile: BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES.cash_flow_full,
    recordKind: "cash_flow_snapshot"
  }
};

function artifact(
  artifactKind: BusinessDeskArtifactKind,
  content = '"field","value"\r\n"name","safe"'
) {
  const spec = fixtureSpec[artifactKind];
  return {
    mode: spec.mode,
    contentType: spec.contentType,
    filename: spec.mode === "copy" ? "quote-Q-1.txt" : `${artifactKind}.csv`,
    content,
    projectionVersion: BUSINESS_DESK_ARTIFACT_PROJECTION_VERSION,
    redactionProfile: spec.profile,
    fieldManifest: ["field", "value"],
    checksumSha256: sha256Utf8(content, { replaceUnpairedSurrogates: true }),
    bytes: utf8Bytes(content, { replaceUnpairedSurrogates: true }).length,
    rowCount: 2,
    recordCount: 1,
    deliveryStatus: "not_observed" as const
  } satisfies BusinessDeskTransientArtifact;
}

function pins(artifactKind: BusinessDeskArtifactKind, version = 4) {
  return [
    {
      recordId: RECORD_ID,
      revisionId: REVISION_ID,
      recordKind: fixtureSpec[artifactKind].recordKind,
      version
    }
  ];
}

function previewFixture(
  artifactKind: BusinessDeskArtifactKind,
  content?: string
): BusinessDeskArtifactPreview {
  const value = artifact(artifactKind, content);
  return {
    artifactKind,
    artifact: value,
    recordPins: pins(artifactKind) as BusinessDeskArtifactPreview["recordPins"],
    previewChecksumSha256: value.checksumSha256
  };
}

function prepareFixture(preview: BusinessDeskArtifactPreview) {
  const { content: _content, ...metadata } = preview.artifact;
  return {
    artifactKind: preview.artifactKind,
    receipt: {
      id: "507f191e810c19729de86022",
      artifactKind: preview.artifactKind,
      exportKind: preview.artifactKind,
      recordPins: preview.recordPins,
      preparedArtifact: metadata,
      actorRelationship: { prepared: true },
      createdAt: "2026-08-22T18:00:00.000Z"
    },
    artifact: preview.artifact,
    recordPins: preview.recordPins,
    idempotentReplay: false
  };
}

describe("generic reviewed Business Desk artifact API", () => {
  beforeEach(() => mockApiRequest.mockReset());

  it("pins every canonical public redaction profile string", () => {
    expect(BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES).toEqual({
      quote_copy: "quote_customer_copy_v1",
      quote_csv: "quote_customer_csv_v1",
      expense_csv_batch: "expense_private_csv_v1",
      lead_private_csv: "lead_private_csv_v1",
      job_redacted_csv: "job_redacted_csv_v1",
      cash_flow_full: "cash_flow_full_v1",
      cash_flow_facility_manager: "cash_flow_facility_manager_v1"
    });
  });

  it("previews one exact revision through the canonical route", async () => {
    const preview = previewFixture("quote_csv");
    mockApiRequest.mockResolvedValue({ data: preview });

    await expect(
      previewBusinessDeskArtifact(
        { workspaceType: "facility", facilityId: "facility/1" },
        {
          artifactKind: "quote_csv",
          revisionSelections: [{ recordId: RECORD_ID, revisionNumber: 4 }],
          expectedRedactionProfile: BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES.quote_csv
        }
      )
    ).resolves.toEqual(preview);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/facility/facility%2F1/business-desk/artifacts/preview",
      {
        method: "POST",
        body: {
          artifactKind: "quote_csv",
          revisionSelections: [{ recordId: RECORD_ID, revisionNumber: 4 }]
        }
      }
    );
  });

  it("rejects a cross-revision pin", async () => {
    const preview = previewFixture("lead_private_csv");
    mockApiRequest.mockResolvedValue({
      data: { ...preview, recordPins: pins("lead_private_csv", 5) }
    });

    await expect(
      previewBusinessDeskArtifact(
        { workspaceType: "commercial" },
        {
          artifactKind: "lead_private_csv",
          revisionSelections: [{ recordId: RECORD_ID, revisionNumber: 4 }]
        }
      )
    ).rejects.toThrow(/pin the requested revisions/i);
  });

  it("rejects internal-only digest fields in the public preview contract", async () => {
    const preview = previewFixture("quote_csv");
    mockApiRequest.mockResolvedValue({
      data: {
        ...preview,
        recordPins: [
          {
            ...preview.recordPins[0],
            snapshotDigest: "b".repeat(64)
          }
        ]
      }
    });

    await expect(
      previewBusinessDeskArtifact(
        { workspaceType: "commercial" },
        {
          artifactKind: "quote_csv",
          revisionSelections: [{ recordId: RECORD_ID, revisionNumber: 4 }]
        }
      )
    ).rejects.toThrow(/pin the requested revisions/i);
  });

  it("rejects a noncanonical public revision pin ID", async () => {
    const preview = previewFixture("lead_private_csv");
    mockApiRequest.mockResolvedValue({
      data: {
        ...preview,
        recordPins: [{ ...preview.recordPins[0], revisionId: "revision-4" }]
      }
    });

    await expect(
      previewBusinessDeskArtifact(
        { workspaceType: "commercial" },
        {
          artifactKind: "lead_private_csv",
          revisionSelections: [{ recordId: RECORD_ID, revisionNumber: 4 }]
        }
      )
    ).rejects.toThrow(/pin the requested revisions/i);
  });

  it("rejects content tampered after the server checksum was set", async () => {
    const preview = previewFixture("job_redacted_csv");
    mockApiRequest.mockResolvedValue({
      data: {
        ...preview,
        artifact: { ...preview.artifact, content: `${preview.artifact.content},tampered` }
      }
    });

    await expect(
      previewBusinessDeskArtifact(
        { workspaceType: "commercial" },
        {
          artifactKind: "job_redacted_csv",
          revisionSelections: [{ recordId: RECORD_ID, revisionNumber: 4 }]
        }
      )
    ).rejects.toThrow(/transient reviewed artifact response was invalid/i);
  });

  it.each([
    ["150,001 UTF-8 bytes", { content: "x".repeat(150_001) }],
    ["zero rows", { rowCount: 0 }],
    ["more than 30,000 rows", { rowCount: 30_001 }],
    ["an empty field manifest", { fieldManifest: [] }],
    [
      "more than 128 manifest fields",
      { fieldManifest: Array.from({ length: 129 }, (_, index) => `field-${index}`) }
    ],
    ["a manifest field longer than 120 characters", { fieldManifest: ["x".repeat(121)] }]
  ])(
    "rejects artifact metadata outside the backend bound: %s",
    async (_label, override) => {
      const preview = previewFixture("quote_csv");
      const nextContent =
        "content" in override ? String(override.content) : preview.artifact.content;
      const nextArtifact = {
        ...preview.artifact,
        ...override,
        ...(nextContent !== preview.artifact.content
          ? {
              content: nextContent,
              checksumSha256: sha256Utf8(nextContent, {
                replaceUnpairedSurrogates: true
              }),
              bytes: utf8Bytes(nextContent, { replaceUnpairedSurrogates: true }).length
            }
          : {})
      };
      mockApiRequest.mockResolvedValue({
        data: {
          ...preview,
          artifact: nextArtifact,
          previewChecksumSha256: nextArtifact.checksumSha256
        }
      });

      await expect(
        previewBusinessDeskArtifact(
          { workspaceType: "commercial" },
          {
            artifactKind: "quote_csv",
            revisionSelections: [{ recordId: RECORD_ID, revisionNumber: 4 }]
          }
        )
      ).rejects.toThrow(/transient reviewed artifact response was invalid/i);
    }
  );

  it("hashes Unicode and unpaired surrogates like TextEncoder and Node Buffer", async () => {
    const content = '"crop","note"\r\n"🌱","broken-\ud800-end"';
    const preview = previewFixture("expense_csv_batch", content);
    mockApiRequest.mockResolvedValue({ data: preview });

    await expect(
      previewBusinessDeskArtifact(
        { workspaceType: "commercial" },
        {
          artifactKind: "expense_csv_batch",
          revisionSelections: [{ recordId: RECORD_ID, revisionNumber: 4 }]
        }
      )
    ).resolves.toEqual(preview);
    expect(preview.artifact.checksumSha256).toBe(
      "a8d469d12337e467ae6ced9555b84970eea820d4c3b797efccc31754db2567b2"
    );
  });

  it("pins the canonical redaction profile", async () => {
    const preview = previewFixture("job_redacted_csv");
    mockApiRequest.mockResolvedValue({
      data: {
        ...preview,
        artifact: {
          ...preview.artifact,
          redactionProfile: BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES.lead_private_csv
        }
      }
    });

    await expect(
      previewBusinessDeskArtifact(
        { workspaceType: "commercial" },
        {
          artifactKind: "job_redacted_csv",
          revisionSelections: [{ recordId: RECORD_ID, revisionNumber: 4 }],
          expectedRedactionProfile:
            BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES.job_redacted_csv
        }
      )
    ).rejects.toThrow(/invalid/i);
  });

  it("prepares the exact confirmed preview and accepts a metadata-only receipt", async () => {
    const preview = previewFixture("cash_flow_csv");
    const prepared = prepareFixture(preview);
    mockApiRequest.mockResolvedValue({ data: prepared });

    await expect(
      prepareBusinessDeskArtifact(
        { workspaceType: "commercial" },
        {
          artifactKind: "cash_flow_csv",
          revisionSelections: [{ recordId: RECORD_ID, revisionNumber: 4 }],
          previewChecksumSha256: preview.previewChecksumSha256,
          confirmed: true,
          idempotencyKey: " artifact-cash-flow-0001 ",
          expectedRedactionProfile:
            BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES.cash_flow_full,
          expectedPreview: preview
        }
      )
    ).resolves.toEqual(prepared);
    expect(mockApiRequest).toHaveBeenCalledWith("/api/business-desk/artifacts/prepare", {
      method: "POST",
      body: {
        artifactKind: "cash_flow_csv",
        revisionSelections: [{ recordId: RECORD_ID, revisionNumber: 4 }],
        previewChecksumSha256: preview.previewChecksumSha256,
        confirmed: true,
        idempotencyKey: "artifact-cash-flow-0001"
      }
    });
    expect(prepared.receipt.preparedArtifact).not.toHaveProperty("content");
  });

  it("rejects plaintext inside the audited receipt", async () => {
    const preview = previewFixture("quote_copy");
    const prepared = prepareFixture(preview);
    mockApiRequest.mockResolvedValue({
      data: {
        ...prepared,
        receipt: {
          ...prepared.receipt,
          preparedArtifact: {
            ...prepared.receipt.preparedArtifact,
            content: preview.artifact.content
          }
        }
      }
    });

    await expect(
      prepareBusinessDeskArtifact(
        { workspaceType: "commercial" },
        {
          artifactKind: "quote_copy",
          revisionSelections: [{ recordId: RECORD_ID, revisionNumber: 4 }],
          previewChecksumSha256: preview.previewChecksumSha256,
          confirmed: true,
          idempotencyKey: "quote-copy-0001",
          expectedPreview: preview
        }
      )
    ).rejects.toThrow(/receipt was invalid/i);
  });

  it("rejects receipt metadata that does not equal the transient artifact", async () => {
    const preview = previewFixture("quote_csv");
    const prepared = prepareFixture(preview);
    mockApiRequest.mockResolvedValue({
      data: {
        ...prepared,
        receipt: {
          ...prepared.receipt,
          preparedArtifact: {
            ...prepared.receipt.preparedArtifact,
            bytes: prepared.receipt.preparedArtifact.bytes + 1
          }
        }
      }
    });

    await expect(
      prepareBusinessDeskArtifact(
        { workspaceType: "commercial" },
        {
          artifactKind: "quote_csv",
          revisionSelections: [{ recordId: RECORD_ID, revisionNumber: 4 }],
          previewChecksumSha256: preview.previewChecksumSha256,
          confirmed: true,
          idempotencyKey: "quote-csv-0001",
          expectedPreview: preview
        }
      )
    ).rejects.toThrow(/receipt was invalid/i);
  });

  it.each([
    ["noncanonical receipt ID", { id: "receipt-1" }],
    ["noncanonical creation instant", { createdAt: "2026-08-22T18:00:00Z" }]
  ])("rejects a %s", async (_label, receiptOverride) => {
    const preview = previewFixture("quote_csv");
    const prepared = prepareFixture(preview);
    mockApiRequest.mockResolvedValue({
      data: {
        ...prepared,
        receipt: { ...prepared.receipt, ...receiptOverride }
      }
    });

    await expect(
      prepareBusinessDeskArtifact(
        { workspaceType: "commercial" },
        {
          artifactKind: "quote_csv",
          revisionSelections: [{ recordId: RECORD_ID, revisionNumber: 4 }],
          previewChecksumSha256: preview.previewChecksumSha256,
          confirmed: true,
          idempotencyKey: "quote-csv-0001",
          expectedPreview: preview
        }
      )
    ).rejects.toThrow(/receipt was invalid/i);
  });

  it.each(["short", "x".repeat(201)])(
    "rejects an out-of-contract idempotency key before a request: %s",
    async (idempotencyKey) => {
      const preview = previewFixture("quote_csv");
      await expect(
        prepareBusinessDeskArtifact(
          { workspaceType: "commercial" },
          {
            artifactKind: "quote_csv",
            revisionSelections: [{ recordId: RECORD_ID, revisionNumber: 4 }],
            previewChecksumSha256: preview.previewChecksumSha256,
            confirmed: true,
            idempotencyKey,
            expectedPreview: preview
          }
        )
      ).rejects.toThrow(/confirm one exact/i);
      expect(mockApiRequest).not.toHaveBeenCalled();
    }
  );

  it("rejects a non-ObjectId record selection before a request", async () => {
    await expect(
      previewBusinessDeskArtifact(
        { workspaceType: "commercial" },
        {
          artifactKind: "quote_csv",
          revisionSelections: [{ recordId: "quote-1", revisionNumber: 4 }]
        }
      )
    ).rejects.toThrow(/unique exact saved revision/i);
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});
