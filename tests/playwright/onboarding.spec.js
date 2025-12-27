import { test, expect } from "@playwright/test";

test.describe("FE-02 Onboarding flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/**", (route) => {
      if (route.request().method() === "GET" && route.request().url().includes("/api/subscribe/status")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, status: "active" })
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true })
      });
    });
  });

  test("shows AppIntro after carousel is marked complete", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.localStorage.setItem("seenOnboardingCarousel", "true");
    });

    await page.goto("/");

    await expect(page.getByText("What is GrowPath?")).toHaveCount(0);
    await expect(page.getByText("Get Started")).toHaveCount(0);
    await expect(page.getByText("Grow with intention.")).toBeVisible();
    await expect(page.getByText("Continue")).toBeVisible();
    await expect(page.getByText("Welcome Back")).toHaveCount(0);
  });

  test("skips AppIntro after user becomes Pro", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.localStorage.setItem("seenOnboardingCarousel", "true");
      window.localStorage.setItem("token", "playwright-token");
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          subscriptionStatus: "active",
          guilds: [],
          email: "pro-user@example.com"
        })
      );
    });

    await page.goto("/");

    await expect(page.getByText("Grow with intention.")).toHaveCount(0);
    await expect(page.getByText("Continue")).toHaveCount(0);
    await expect(page.getByText("Welcome Back")).toBeVisible();
  });
});
