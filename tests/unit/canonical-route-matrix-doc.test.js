const fs = require("node:fs");
const path = require("node:path");

describe("canonical route matrix current corrections", () => {
  const doc = fs.readFileSync(
    path.join(__dirname, "../../docs/CANONICAL_ROUTE_MATRIX.md"),
    "utf8"
  );

  it("keeps current workspace roots ahead of older generated route rows", () => {
    expect(doc).toContain("Commercial dashboard: `/home/commercial`");
    expect(doc).toContain("Commercial Storefront owner route: `/home/commercial/storefront`");
    expect(doc).toContain("Public storefront route: `/store/:slug`");
    expect(doc).toContain(
      "Public storefront alias routes: `/storefront/:slug` and `/storefront/:slug/products/:productId` mirror the `/store` public URL family."
    );
    expect(doc).toContain(
      "Exact legacy `/storefront` is a redirect-only stale-link guard, not a visible owner module."
    );
    expect(doc).toContain("Commercial Feed / Campaigns owner route: `/home/commercial/feed`");
    expect(doc).toContain("Shared Feed viewer route: `/feed`");
    expect(doc).toContain("Feed is commercial/facility advertising and outreach, not discussion.");
    expect(doc).toContain("Forum/Q&A discussion routes are `/forum` and `/forum/post/:id`.");
    expect(doc).toContain(
      "Generated sections below this correction block are historical context only"
    );
    expect(doc).toContain(
      "Current root routing is `/home/personal`, `/home/commercial`, `/home/facility/select`, and `/home/facility`."
    );
    expect(doc).toContain(
      "Current workspace profile routes are `/home/personal/profile`, `/home/commercial/profile`, and `/home/facility/profile`"
    );
  });
});
