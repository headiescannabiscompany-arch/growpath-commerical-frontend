import { INTEGRATION_PROVIDER_EVIDENCE } from "@/knowledge/integrationProviderEvidenceRegistry";

describe("integration provider evidence registry", () => {
  it("has unique providers with official sources and review dates", () => {
    const ids = new Set<string>();
    for (const provider of INTEGRATION_PROVIDER_EVIDENCE) {
      expect(ids.has(provider.id)).toBe(false);
      ids.add(provider.id);
      expect(provider.officialSource).toMatch(/^https:\/\//);
      expect(provider.lastReviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(provider.limitations.length).toBeGreaterThan(0);
    }
  });

  it("does not advertise researched OAuth or key setup as implemented", () => {
    expect(
      INTEGRATION_PROVIDER_EVIDENCE.find((provider) => provider.id === "trolmaster")
    ).toMatchObject({ readiness: "credential_ready" });
    expect(
      INTEGRATION_PROVIDER_EVIDENCE.find((provider) => provider.id === "sensorpush")
    ).toMatchObject({ readiness: "oauth_required" });
    for (const id of ["weatherlink", "ecowitt", "rachio", "shelly", "particle"]) {
      expect(
        INTEGRATION_PROVIDER_EVIDENCE.find((provider) => provider.id === id)
      ).not.toMatchObject({ readiness: "implemented" });
    }
  });
});
