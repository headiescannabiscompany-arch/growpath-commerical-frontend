import {
  claimComplimentaryGrant,
  issueComplimentaryGrant,
  listComplimentaryFacilityWorkspaces,
  listComplimentaryGrants,
  previewComplimentaryGrant,
  resendComplimentaryGrant,
  revokeComplimentaryGrant
} from "@/api/complimentaryGrants";

const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

const grant = {
  id: "grant/with unsafe path",
  recipientEmail: "recipient@example.com",
  recipientName: "Recipient",
  message: "Welcome",
  plan: "commercial",
  duration: "year",
  facilityId: null,
  status: "pending",
  reason: "Influencer access",
  issuedAt: "2026-09-03T12:00:00.000Z",
  claimExpiresAt: "2026-09-10T12:00:00.000Z",
  entitlementEndsAt: null,
  revocationReason: "",
  complimentary: true,
  paymentState: "nonpaid",
  renews: false,
  emailDelivery: {
    status: "sent",
    attempts: 1,
    lastAttemptAt: "2026-09-03T12:00:00.000Z",
    sentAt: "2026-09-03T12:00:01.000Z",
    failureKind: null,
    nextAttemptAt: null,
    exhaustedAt: null,
    lastErrorCode: ""
  }
} as const;

const claimResult = {
  claimed: true,
  plan: "commercial",
  duration: "year",
  facilityId: null,
  expiresAt: "2027-09-03T12:00:00.000Z",
  complimentary: true,
  paymentState: "nonpaid",
  renews: false,
  nextPath: "/account/billing"
} as const;

describe("complimentary grant API", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it("previews without authentication and claims with the stored token", async () => {
    mockApiRequest
      .mockResolvedValueOnce({ grant })
      .mockResolvedValueOnce({ data: claimResult });

    await expect(previewComplimentaryGrant("claim-token")).resolves.toBe(grant);
    await expect(claimComplimentaryGrant("claim-token")).resolves.toEqual(claimResult);

    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      "/api/subscription/complimentary-grants/claim/preview",
      {
        method: "POST",
        auth: false,
        cache: "no-store",
        body: { token: "claim-token" }
      }
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/subscription/complimentary-grants/claim",
      { method: "POST", cache: "no-store", body: { token: "claim-token" } }
    );
  });

  it("lists and issues grants through the protected Admin routes", async () => {
    mockApiRequest
      .mockResolvedValueOnce({ grants: [grant], nextCursor: "next-cursor" })
      .mockResolvedValueOnce({ data: { grant, deliveryAccepted: true } });

    await expect(
      listComplimentaryGrants({ limit: 25, cursor: "cursor-1" })
    ).resolves.toEqual({
      grants: [grant],
      nextCursor: "next-cursor",
      paidPeriodGiftsEnabled: false
    });
    await expect(
      issueComplimentaryGrant({
        recipientEmail: "recipient@example.com",
        plan: "commercial",
        duration: "year",
        reason: "Influencer access"
      })
    ).resolves.toEqual({ grant, deliveryAccepted: true });

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, "/api/admin/complimentary-grants", {
      method: "GET",
      cache: "no-store",
      params: { limit: 25, cursor: "cursor-1" }
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, "/api/admin/complimentary-grants", {
      method: "POST",
      body: {
        recipientEmail: "recipient@example.com",
        plan: "commercial",
        duration: "year",
        reason: "Influencer access"
      }
    });
  });

  it("lists safe owned workspaces for an Admin Facility grant", async () => {
    const workspaces = [
      {
        facilityId: "507f191e810c19729de86001",
        name: "North Greenhouse",
        workspaceReference: "FAC-101"
      }
    ];
    mockApiRequest.mockResolvedValue({
      ok: true,
      recipientEmail: "recipient@example.com",
      workspaces
    });

    await expect(
      listComplimentaryFacilityWorkspaces("recipient@example.com")
    ).resolves.toEqual({ recipientEmail: "recipient@example.com", workspaces });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/admin/complimentary-grants/facility-workspaces",
      {
        method: "GET",
        cache: "no-store",
        params: { recipientEmail: "recipient@example.com" }
      }
    );
  });

  it("rejects mismatched workspace lookup and Facility issue responses", async () => {
    const facilityId = "507f191e810c19729de86001";
    mockApiRequest
      .mockResolvedValueOnce({
        recipientEmail: "different@example.com",
        workspaces: [{ facilityId, name: "Wrong recipient", workspaceReference: null }]
      })
      .mockResolvedValueOnce({
        grant: {
          ...grant,
          recipientEmail: "recipient@example.com",
          plan: "facility",
          facilityId: "507f191e810c19729de86002"
        },
        deliveryAccepted: true
      });

    await expect(
      listComplimentaryFacilityWorkspaces("recipient@example.com")
    ).rejects.toThrow("invalid complimentary-access response");
    await expect(
      issueComplimentaryGrant({
        recipientEmail: "recipient@example.com",
        plan: "facility",
        duration: "year",
        facilityId,
        reason: "Approved Facility demonstration access"
      })
    ).rejects.toThrow("invalid complimentary-access response");
  });

  it("rejects empty, duplicate, or malformed Facility workspace identifiers", async () => {
    mockApiRequest.mockResolvedValue({
      recipientEmail: "recipient@example.com",
      workspaces: [{ facilityId: "", name: "Invalid", workspaceReference: null }]
    });
    await expect(
      listComplimentaryFacilityWorkspaces("recipient@example.com")
    ).rejects.toThrow("invalid complimentary-access response");
  });

  it("encodes grant IDs before resend and revoke actions", async () => {
    mockApiRequest
      .mockResolvedValueOnce({ grant, deliveryAccepted: true })
      .mockResolvedValueOnce({ data: { grant } });

    await resendComplimentaryGrant(grant.id, "Retry requested");
    await revokeComplimentaryGrant(grant.id, "Access withdrawn");

    const encodedId = encodeURIComponent(grant.id);
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      `/api/admin/complimentary-grants/${encodedId}/resend`,
      { method: "POST", body: { reason: "Retry requested" } }
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      `/api/admin/complimentary-grants/${encodedId}/revoke`,
      { method: "POST", body: { reason: "Access withdrawn" } }
    );
  });

  it("fails closed on malformed list payloads", async () => {
    mockApiRequest.mockResolvedValueOnce({ grants: null, nextCursor: 42 });

    await expect(listComplimentaryGrants()).rejects.toThrow(
      "invalid complimentary-access response"
    );
  });

  it("accepts a scheduled nonpaid claim without pretending the gift is active", async () => {
    const scheduled = {
      ...claimResult,
      scheduled: true,
      startsAt: "2026-10-15T22:15:22.000Z",
      expiresAt: null
    };
    mockApiRequest.mockResolvedValue({ data: scheduled });
    await expect(claimComplimentaryGrant("claim-token")).resolves.toEqual(scheduled);
  });

  it.each([
    { startsAt: "not-a-date" },
    { startsAt: null },
    { expiresAt: "2027-10-15T22:15:22.000Z" },
    { plan: "facility", facilityId: "507f191e810c19729de86001" },
    { renews: true },
    { paymentState: "paid" },
    { scheduled: "true" }
  ])("rejects an invalid scheduled claim result: %j", async (override) => {
    mockApiRequest.mockResolvedValue({
      ...claimResult,
      scheduled: true,
      startsAt: "2026-10-15T22:15:22.000Z",
      expiresAt: null,
      ...override
    });
    await expect(claimComplimentaryGrant("claim-token")).rejects.toThrow(
      "invalid complimentary-access response"
    );
  });

  it("validates the paid-period capability and scheduled Admin record", async () => {
    const scheduled = {
      ...grant,
      status: "scheduled",
      startMode: "after_paid_period",
      scheduledStartsAt: "2026-10-15T22:15:22.000Z",
      scheduledBlockCode: null
    };
    mockApiRequest.mockResolvedValue({
      grants: [scheduled],
      nextCursor: null,
      paidPeriodGiftsEnabled: true
    });
    await expect(listComplimentaryGrants()).resolves.toEqual({
      grants: [scheduled],
      nextCursor: null,
      paidPeriodGiftsEnabled: true
    });
    mockApiRequest.mockResolvedValue({
      grants: [scheduled],
      nextCursor: null,
      paidPeriodGiftsEnabled: "true"
    });
    await expect(listComplimentaryGrants()).rejects.toThrow(
      "invalid complimentary-access response"
    );
  });

  it.each([
    { startMode: "on_claim" },
    { scheduledStartsAt: "invalid" },
    { scheduledBlockCode: 42 },
    { entitlementEndsAt: "2027-10-15T22:15:22.000Z" }
  ])("rejects malformed scheduled Admin metadata: %j", async (override) => {
    mockApiRequest.mockResolvedValue({
      grants: [
        {
          ...grant,
          status: "scheduled",
          startMode: "after_paid_period",
          scheduledStartsAt: "2026-10-15T22:15:22.000Z",
          scheduledBlockCode: null,
          ...override
        }
      ],
      nextCursor: null
    });
    await expect(listComplimentaryGrants()).rejects.toThrow(
      "invalid complimentary-access response"
    );
  });

  it("binds an issued grant to its requested start mode", async () => {
    const input = {
      recipientEmail: grant.recipientEmail,
      plan: grant.plan,
      duration: grant.duration,
      reason: grant.reason,
      startMode: "after_paid_period" as const
    };
    mockApiRequest
      .mockResolvedValueOnce({
        grant: { ...grant, startMode: "after_paid_period" },
        deliveryAccepted: true
      })
      .mockResolvedValueOnce({ grant, deliveryAccepted: true });
    await expect(issueComplimentaryGrant(input)).resolves.toMatchObject({
      grant: { startMode: "after_paid_period" }
    });
    expect(mockApiRequest).toHaveBeenCalledWith("/api/admin/complimentary-grants", {
      method: "POST",
      body: input
    });
    await expect(issueComplimentaryGrant(input)).rejects.toThrow(
      "invalid complimentary-access response"
    );
  });

  it("rejects scheduled Facility issuance without making a request", async () => {
    await expect(
      issueComplimentaryGrant({
        recipientEmail: grant.recipientEmail,
        plan: "facility",
        duration: "year",
        facilityId: "507f191e810c19729de86001",
        reason: grant.reason,
        startMode: "after_paid_period"
      })
    ).rejects.toThrow("invalid complimentary-access response");
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("accepts only supported preview timing and leaves Facility unchanged", async () => {
    mockApiRequest
      .mockResolvedValueOnce({ grant: { ...grant, startMode: "after_paid_period" } })
      .mockResolvedValueOnce({ grant: { ...grant, startMode: "unknown" } })
      .mockResolvedValueOnce({
        grant: {
          ...grant,
          plan: "facility",
          facilityId: "507f191e810c19729de86001",
          startMode: "after_paid_period"
        }
      });
    await expect(previewComplimentaryGrant("token")).resolves.toMatchObject({
      startMode: "after_paid_period"
    });
    await expect(previewComplimentaryGrant("token")).rejects.toThrow(
      "invalid complimentary-access response"
    );
    await expect(previewComplimentaryGrant("token")).rejects.toThrow(
      "invalid complimentary-access response"
    );
  });

  it("fails closed when a grant loses its nonpaid invariants", async () => {
    mockApiRequest
      .mockResolvedValueOnce({
        grants: [{ ...grant, paymentState: "paid" }],
        nextCursor: null
      })
      .mockResolvedValueOnce({
        grant: { ...grant, renews: true },
        deliveryAccepted: true
      });

    await expect(listComplimentaryGrants()).rejects.toThrow(
      "invalid complimentary-access response"
    );
    await expect(
      issueComplimentaryGrant({
        recipientEmail: "recipient@example.com",
        plan: "commercial",
        duration: "year",
        reason: "Influencer access"
      })
    ).rejects.toThrow("invalid complimentary-access response");
  });
});
