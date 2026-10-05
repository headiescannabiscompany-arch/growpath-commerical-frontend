/** @jest-environment node */
import { readFileSync } from "node:fs";
import { filterMarketingEvent, HEYCATCH_INGESTION_TOKEN } from "../../src/analytics/marketingPolicy";

describe("installed HeyCatch SDK transport contract", () => {
  it("preserves the required public ingestion token from the actual pinned SDK", () => {
    // Read installed browser SDK, not a hand-written mock of its event envelope.
    // Deliberately fails on a changed SDK contract so upgrades get reviewed.
    const source = readFileSync(require.resolve("@heycatch/sdk"), "utf8");
    const publicToken = source.match(/"(phc_[A-Za-z0-9]+)"/)?.[1];
    expect(publicToken).toBe(HEYCATCH_INGESTION_TOKEN);
    expect(source).toContain('["token"]');
    expect(source).toContain("This property is required for ingestion, so the event will be dropped.");
    const result = filterMarketingEvent({
      event: "$pageview",
      properties: {
        token: publicToken,
        distinct_id: "synthetic-anonymous-id",
        $current_url: "https://growpathai.com/about?token=private#secret"
      }
    }, "https://growpathai.com/about");
    expect(result?.properties.token).toBe(publicToken);
    expect(result?.properties.$current_url).toBe("https://growpathai.com/about");
    expect(JSON.stringify(result)).not.toMatch(/private|secret/);
  });
});
