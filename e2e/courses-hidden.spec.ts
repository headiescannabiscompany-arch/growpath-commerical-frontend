import { expect, test } from "@playwright/test";

function fulfillJson(route: any, body: any, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  });
}

async function installMocks(page: any) {
  await page.addInitScript(() => {
    window.localStorage.setItem("auth_token_v1", "courses-hidden-token");
    window.localStorage.setItem("seenOnboardingCarousel", "true");
    window.localStorage.setItem("seenAppIntro", "true");
    window.global = window;
  });

  await page.route("**/api/**", async (route: any) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (
      method === "GET" &&
      (url.pathname === "/api/me" || url.pathname === "/api/auth/me")
    ) {
      return fulfillJson(route, {
        user: {
          id: "courses-hidden-user",
          email: "courses-hidden@example.com",
          plan: "pro"
        },
        ctx: {
          mode: "personal",
          plan: "pro",
          subscriptionStatus: "active",
          capabilities: {
            GROWS_PERSONAL_VIEW: true,
            GROWS_PERSONAL_WRITE: true
          },
          limits: {}
        }
      });
    }

    return fulfillJson(route, { ok: true });
  });
}

test.describe("hidden courses routes", () => {
  for (const target of [
    { name: "personal", path: "/home/personal/courses" },
    { name: "top-level", path: "/courses" }
  ]) {
    test(`blocks ${target.name} courses route`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 900 });
      await installMocks(page);

      await page.goto(target.path, { waitUntil: "domcontentloaded" });

      await expect(page.getByText("Courses", { exact: true }).first()).toBeVisible();
      await expect(page.getByText("Hidden for release")).toBeVisible();
      await expect(page.getByText(/moderation, creator, payout/i)).toBeVisible();
      await expect(page.getByText(/Release decision: hidden/i)).toBeVisible();
      await expect(page.getByText("Create Course")).toHaveCount(0);
      await expect(page.getByText("Loading courses...")).toHaveCount(0);
      await expect(page.getByText("Open details")).toHaveCount(0);

      await page.screenshot({
        path: `tmp/screenshots/courses-hidden-${target.name}.png`,
        fullPage: true
      });
    });
  }
});
