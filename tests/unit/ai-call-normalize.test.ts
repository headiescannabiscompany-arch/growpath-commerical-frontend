import { describe, expect, it } from "@jest/globals";

import { normalizeAIEnvelope } from "../../src/hooks/useAICall";

describe("normalizeAIEnvelope", () => {
  it("maps facility AI call result responses to data for UI cards", () => {
    const normalized = normalizeAIEnvelope({
      success: true,
      tool: "harvest",
      fn: "estimateHarvestWindow",
      growId: "grow-1",
      result: { recommendation: "Monitor daily" }
    });

    expect(normalized.success).toBe(true);
    expect(normalized.error).toBeNull();
    expect(normalized.data).toEqual({
      tool: "harvest",
      fn: "estimateHarvestWindow",
      growId: "grow-1",
      result: { recommendation: "Monitor daily" },
      writes: []
    });
  });

  it("preserves error envelopes", () => {
    const normalized = normalizeAIEnvelope({
      success: false,
      error: { code: "UNKNOWN_TOOL", message: "Tool is not registered" }
    });

    expect(normalized.success).toBe(false);
    expect(normalized.data).toBeNull();
    expect(normalized.error?.code).toBe("UNKNOWN_TOOL");
  });
});
