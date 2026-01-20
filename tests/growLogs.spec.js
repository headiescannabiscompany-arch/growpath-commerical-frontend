// tests/growLogs.spec.js
// Playwright test for GrowLogsScreen entitlement gating
import { test, expect } from "@playwright/test";

test.describe("GrowLogsScreen Entitlement", () => {
  test("Free user cannot add multiple grows", async ({ page }) => {
    await page.goto("http://localhost:19006");
    // TODO: Implement login as Free user (mock or real)
    await page.click("text=GrowLogs");
    await page.fill('input[placeholder="e.g., Spring 2026"]', "Grow 1");
    await page.click("text=Create Grow");
    // Try to add another grow
    await page.fill('input[placeholder="e.g., Spring 2026"]', "Grow 2");
    await page.click("text=Create Grow");
    await expect(page.locator("text=Upgrade Required")).toBeVisible();
  });

  test("Pro user can add multiple grows", async ({ page }) => {
    await page.goto("http://localhost:19006");
    // TODO: Implement login as Pro user (mock or real)
    await page.click("text=GrowLogs");
    await page.fill('input[placeholder="e.g., Spring 2026"]', "Grow 1");
    await page.click("text=Create Grow");
    await page.fill('input[placeholder="e.g., Spring 2026"]', "Grow 2");
    await page.click("text=Create Grow");
    await expect(page.locator("text=Grow 2")).toBeVisible();
  });

  test("Photo upload is gated for Free user", async ({ page }) => {
    await page.goto("http://localhost:19006");
    // TODO: Implement login as Free user
    await page.click("text=GrowLogs");
    await page.click("text=Add Grow Photo");
    await expect(page.locator("text=Upgrade to add photo")).toBeVisible();
  });
});
