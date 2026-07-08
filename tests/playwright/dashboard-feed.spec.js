import { test } from "@playwright/test";

test.describe.skip("Dashboard campaign placements E2E", () => {
  test("personal dashboard shows commercial/facility outreach placements", async () => {
    test.skip(
      true,
      "Legacy dashboard social-feed E2E was retired. Current dashboard placement behavior is covered by PersonalFeedPlacement and DashboardScreenFeedPolicy unit tests until the Playwright harness supports the current workspace shell."
    );
  });
});
