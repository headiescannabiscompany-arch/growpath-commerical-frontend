const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  ApiError: class ApiError extends Error {},
  apiRequest: (...args: unknown[]) => mockApiRequest(...args)
}));

import {
  approveLegalEvidenceRequest,
  listAdminEvidenceRequests,
  normalizeAdminEvidenceRequest,
  reviewLegalEvidenceApproval,
  updateLegalEvidenceRequestReview
} from "@/api/adminEvidenceVault";

const REQUEST_ID = "64b000000000000000000011";
const TARGET_ID = "64b000000000000000000012";
const proposal = {
  targetUserId: TARGET_ID,
  scopes: ["account.identity" as const],
  reason: "Court order independently reviewed.",
  legalReview: {
    decision: "approve" as const,
    approverName: "Erick Admin",
    approverEmail: "erick@example.com",
    approverRole: "Independent legal approver",
    reference: "COUNSEL-2026-44"
  }
};

describe("Admin Evidence Vault API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("normalizes nested queue records, legacy fixtures, and redacted summaries", () => {
    const nested = normalizeAdminEvidenceRequest({
      id: REQUEST_ID,
      requestType: "court_order",
      status: "legal_review",
      preservationHold: true,
      targetBound: true,
      requester: {
        name: "Officer Example",
        organization: "Example Agency",
        email: "OFFICER@EXAMPLE.GOV"
      },
      preservation: {
        authority: "signed order",
        expiresAt: "2099-01-01T00:00:00.000Z",
        renewalCount: 2
      },
      targetUserId: TARGET_ID,
      scope: "Identity records"
    });
    expect(nested).toEqual(
      expect.objectContaining({
        _id: REQUEST_ID,
        detailsAvailable: true,
        requesterName: "Officer Example",
        requesterOrganization: "Example Agency",
        requesterEmail: "officer@example.gov",
        preservationAuthority: "signed order",
        preservationExpiresAt: "2099-01-01T00:00:00.000Z",
        preservationRenewalCount: 2,
        targetUserId: TARGET_ID
      })
    );

    expect(
      normalizeAdminEvidenceRequest({
        _id: "legacy-1",
        requestType: "preservation",
        status: "received",
        requesterName: "Legacy Requester",
        requesterEmail: "legacy@example.gov",
        scope: "Legacy scope",
        preservationHold: false
      })
    ).toEqual(
      expect.objectContaining({
        _id: "legacy-1",
        detailsAvailable: true,
        requesterName: "Legacy Requester",
        requesterEmail: "legacy@example.gov"
      })
    );

    const redacted = normalizeAdminEvidenceRequest({
      id: "redacted-1",
      requestType: "subpoena",
      status: "identity_review",
      preservationHold: true,
      targetBound: true,
      restricted: true
    });
    expect(redacted.detailsAvailable).toBe(false);
    expect(redacted.requesterName).toBe("");
    expect(redacted.requesterEmail).toBe("");
    expect(redacted.targetUserId).toBeNull();
  });

  it("sends only the typed prerequisite PATCH fields", async () => {
    const input = {
      jurisdiction: "Maryland",
      jurisdictionReview: {
        reviewed: true as const,
        determination: "Issuing court has jurisdiction.",
        reference: "JUR-22"
      },
      minimumNecessaryScope: "Identity records only.",
      userNoticeStatus: "delayed" as const,
      reason: "Counsel reviewed all prerequisites."
    };
    mockApiRequest.mockResolvedValue({
      ok: true,
      request: {
        id: REQUEST_ID,
        requestType: "court_order",
        status: "legal_review",
        requester: { name: "Officer" },
        preservationHold: true,
        scope: "Identity records"
      }
    });

    await updateLegalEvidenceRequestReview(REQUEST_ID, input);

    expect(mockApiRequest).toHaveBeenCalledWith(
      `/api/admin/evidence-requests/${REQUEST_ID}`,
      { method: "PATCH", body: input, cache: "no-store" }
    );
    expect(mockApiRequest.mock.calls[0][1].body).not.toHaveProperty("legalReview");
    expect(mockApiRequest.mock.calls[0][1].body).not.toHaveProperty("approved");
    expect(mockApiRequest.mock.calls[0][1].body).not.toHaveProperty("disclosed");
  });

  it("loads and normalizes the restricted Admin queue for the closed vault", async () => {
    mockApiRequest.mockResolvedValue({
      ok: true,
      requests: [
        {
          id: REQUEST_ID,
          requestType: "court_order",
          status: "legal_review",
          preservationHold: true,
          targetBound: true,
          restricted: true
        }
      ]
    });

    await expect(listAdminEvidenceRequests()).resolves.toEqual([
      expect.objectContaining({
        _id: REQUEST_ID,
        detailsAvailable: false,
        targetBound: true
      })
    ]);
    expect(mockApiRequest).toHaveBeenCalledWith("/api/admin/evidence-requests", {
      cache: "no-store"
    });
  });

  it("uses the dedicated review and approval routes with one exact proposal", async () => {
    const confirmation = `APPROVE EVIDENCE REQUEST ${REQUEST_ID} FOR ${TARGET_ID}`;
    mockApiRequest
      .mockResolvedValueOnce({
        ok: true,
        review: {
          evidenceRequestId: REQUEST_ID,
          targetUserId: TARGET_ID,
          scopes: ["account.identity"],
          reviewToken: "single-use-token",
          reviewExpiresAt: "2099-01-01T00:05:00.000Z",
          nextConfirmation: confirmation,
          externalTransmissionPerformed: false
        }
      })
      .mockResolvedValueOnce({
        ok: true,
        approval: {
          evidenceRequestId: REQUEST_ID,
          targetUserId: TARGET_ID,
          status: "approved",
          approvedArchiveScopes: ["account.identity"],
          approvedAt: "2099-01-01T00:01:00.000Z",
          approvedBy: "64b000000000000000000013",
          externalTransmissionPerformed: false
        }
      });

    await reviewLegalEvidenceApproval(REQUEST_ID, proposal);
    await approveLegalEvidenceRequest(REQUEST_ID, {
      ...proposal,
      reviewToken: "single-use-token",
      confirmation
    });

    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      `/api/admin/evidence-vault/evidence-requests/${REQUEST_ID}/approval-review`,
      { method: "POST", body: proposal, cache: "no-store" }
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      `/api/admin/evidence-vault/evidence-requests/${REQUEST_ID}/approval`,
      {
        method: "POST",
        body: { ...proposal, reviewToken: "single-use-token", confirmation },
        cache: "no-store"
      }
    );
  });

  it("fails closed if a receipt claims external transmission", async () => {
    mockApiRequest.mockResolvedValue({
      ok: true,
      review: {
        reviewToken: "token",
        nextConfirmation: "confirmation",
        externalTransmissionPerformed: true
      }
    });

    await expect(reviewLegalEvidenceApproval(REQUEST_ID, proposal)).rejects.toThrow(
      "invalid legal-approval review"
    );
  });

  it("fails closed if the approval review is already expired", async () => {
    mockApiRequest.mockResolvedValue({
      ok: true,
      review: {
        evidenceRequestId: REQUEST_ID,
        targetUserId: TARGET_ID,
        scopes: ["account.identity"],
        reviewToken: "expired-token",
        reviewExpiresAt: "2000-01-01T00:00:00.000Z",
        nextConfirmation: `APPROVE EVIDENCE REQUEST ${REQUEST_ID} FOR ${TARGET_ID}`,
        externalTransmissionPerformed: false
      }
    });

    await expect(reviewLegalEvidenceApproval(REQUEST_ID, proposal)).rejects.toThrow(
      "invalid legal-approval review"
    );
  });
});
