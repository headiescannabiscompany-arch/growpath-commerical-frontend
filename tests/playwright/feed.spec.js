import { test } from "@playwright/test";

test.describe.skip("Feed / Campaigns E2E", () => {
  test("commercial and facility campaigns render as outreach placements", async () => {
    test.skip(
      true,
      "Legacy social-feed E2E was retired. Current Feed behavior is covered by CommercialFeedRoute Jest tests until the Playwright harness supports workspace mode selection."
    );
  });
});
