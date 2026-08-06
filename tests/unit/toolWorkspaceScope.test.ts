import {
  resolveToolWorkspaceType,
  toolWorkspaceIdentity
} from "@/features/personal/tools/toolWorkspaceScope";

describe("tool workspace scope", () => {
  it("keeps the authenticated commercial workspace when route flags disappear", () => {
    expect(
      resolveToolWorkspaceType({
        entitlementMode: "commercial",
        requestedWorkspaceType: "personal"
      })
    ).toBe("commercial");
  });

  it("keeps the authenticated facility workspace when a hostile commercial signal appears", () => {
    expect(
      resolveToolWorkspaceType({
        entitlementMode: "facility",
        requestedWorkspaceType: "commercial",
        commercialAccountId: "untrusted-commercial-id"
      })
    ).toBe("facility");
  });

  it("treats a commercial account id as a shared-mode signal for a Personal baseline", () => {
    expect(
      resolveToolWorkspaceType({
        entitlementMode: "personal",
        commercialAccountId: "untrusted-commercial-id"
      })
    ).toBe("commercial");
  });

  it("treats a facility id as a shared-mode signal for a Personal baseline", () => {
    expect(
      resolveToolWorkspaceType({
        entitlementMode: "personal",
        facilityId: "facility-route-id"
      })
    ).toBe("facility");
  });

  it("fails closed to facility when unauthenticated shared signals conflict", () => {
    expect(
      resolveToolWorkspaceType({
        entitlementMode: "personal",
        requestedWorkspaceType: "commercial",
        facilityId: "facility-route-id",
        commercialAccountId: "untrusted-commercial-id"
      })
    ).toBe("facility");
  });

  it("includes a commercial route signal in the local state-reset identity", () => {
    expect(
      toolWorkspaceIdentity({
        workspaceType: "commercial",
        commercialAccountId: "untrusted-commercial-id"
      })
    ).toBe("commercial::untrusted-commercial-id");
  });
});
