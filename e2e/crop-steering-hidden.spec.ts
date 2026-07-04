import { expect, test } from "@playwright/test";

const GROW_ID = "grow-crop-steering-hidden-1";

function fulfillJson(route: any, body: any, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  });
}

async function installMocks(page: any) {
  await page.addInitScript(() => {
    window.localStorage.setItem("auth_token_v1", "crop-steering-hidden-token");
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
          id: "crop-steering-hidden-user",
          email: "crop-steering-hidden@example.com",
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

test.describe("hidden crop steering route", () => {
  for (const size of [
    { name: "desktop", width: 1280, height: 900 },
    { name: "mobile", width: 390, height: 900 }
  ]) {
    test(`blocks scaffolded crop steering actions on ${size.name}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await installMocks(page);

      await page.goto(`/home/personal/tools/crop-steering?growId=${GROW_ID}`, {
        waitUntil: "domcontentloaded"
      });

      await expect(page.getByRole("heading", { name: "Unmatched Route" })).toBeVisible();
      await expect(page.getByText("Page could not be found.")).toBeVisible();
      await expect(page.getByText("Hidden for release")).toHaveCount(0);
      await expect(page.getByText(/Release decision: hidden/i)).toHaveCount(0);
      await expect(page.getByText("Save and Open Journal")).toHaveCount(0);
      await expect(page.getByText("Estimated Output")).toHaveCount(0);
      await expect(page.getByPlaceholder("coco")).toHaveCount(0);

      await page.screenshot({
        path: `tmp/screenshots/crop-steering-hidden-${size.name}.png`,
        fullPage: true
      });
    });
  }
});
