// e2e/growLogs.e2e.js
// Detox test for GrowLogsScreen entitlement gating

describe("GrowLogsScreen Entitlement", () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    // TODO: Login as Free user (mock or use test account)
  });

  it("should show upgrade CTA for multiple grows (Free user)", async () => {
    await element(by.text("GrowLogs")).tap();
    await element(by.placeholder("e.g., Spring 2026")).typeText("Grow 1");
    await element(by.text("Create Grow")).tap();
    await element(by.placeholder("e.g., Spring 2026")).typeText("Grow 2");
    await element(by.text("Create Grow")).tap();
    await expect(element(by.text("Upgrade Required"))).toBeVisible();
  });

  it("should allow multiple grows for Pro user", async () => {
    await device.launchApp({ newInstance: true });
    // TODO: Login as Pro user (mock or use test account)
    await element(by.text("GrowLogs")).tap();
    await element(by.placeholder("e.g., Spring 2026")).typeText("Grow 1");
    await element(by.text("Create Grow")).tap();
    await element(by.placeholder("e.g., Spring 2026")).typeText("Grow 2");
    await element(by.text("Create Grow")).tap();
    await expect(element(by.text("Grow 2"))).toBeVisible();
  });

  it("should gate photo upload for Free user", async () => {
    await device.launchApp({ newInstance: true });
    // TODO: Login as Free user
    await element(by.text("GrowLogs")).tap();
    await element(by.text("Add Grow Photo")).tap();
    await expect(element(by.text("Upgrade to add photo"))).toBeVisible();
  });
});
