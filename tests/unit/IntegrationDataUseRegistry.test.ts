import {
  INTEGRATION_DATA_USE_CONSUMERS,
  INTEGRATION_DATA_USE_REGISTRY
} from "@/knowledge/integrationDataUseRegistry";

describe("integration data-use registry", () => {
  it("assigns each governed field at least one supported consumer", () => {
    const allowed = new Set(INTEGRATION_DATA_USE_CONSUMERS);
    const fields = new Set<string>();
    for (const rule of INTEGRATION_DATA_USE_REGISTRY) {
      expect(rule.field).toBeTruthy();
      expect(fields.has(rule.field)).toBe(false);
      fields.add(rule.field);
      expect(rule.consumers.length).toBeGreaterThan(0);
      rule.consumers.forEach((consumer) => expect(allowed.has(consumer)).toBe(true));
    }
  });

  it("keeps credentials secret and excludes them from ordinary exports and AI", () => {
    const credentials = INTEGRATION_DATA_USE_REGISTRY.find(
      (rule) => rule.field === "credentials"
    );
    expect(credentials).toMatchObject({ secret: true, consumers: ["display"] });
  });

  it("governs ownership, reviewed metric mapping, normalized values, and sync receipts", () => {
    const fields = new Set(INTEGRATION_DATA_USE_REGISTRY.map((rule) => rule.field));
    for (const field of [
      "connectionId",
      "workspaceMode",
      "workspaceId",
      "targetRef",
      "targetType",
      "roomId",
      "sourceTimezone",
      "sourceFileIdentity",
      "importReview",
      "metricMap",
      "normalizedValue",
      "normalizedUnit",
      "syncReceipt"
    ]) {
      expect(fields.has(field)).toBe(true);
    }
  });
});
