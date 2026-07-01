import { expect, test } from "@playwright/test";

const LOG = {
  id: "log-broken-photo-1",
  growId: "grow-photo-1",
  plantId: "plant-photo-1",
  type: "photo",
  date: "2026-07-01T08:00:00.000Z",
  title: "Broken photo fallback check",
  notes: "This entry intentionally references a missing uploaded image.",
  photos: ["/uploads/missing-grow-photo.jpg"],
  photoMetadata: [
    {
      url: "/uploads/missing-grow-photo.jpg",
      mimeType: "image/jpeg",
      width: 1600,
      height: 1200,
      stage: "fruiting",
      consentForAI: true,
      consentForTraining: false
    }
  ],
  tags: ["photo", "fallback"],
  createdAt: "2026-07-01T08:00:00.000Z",
  updatedAt: "2026-07-01T08:00:00.000Z"
};

function fulfillJson(route: any, body: any, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  });
}

async function installMocks(page: any) {
  await page.addInitScript(() => {
    window.localStorage.setItem("auth_token_v1", "log-photo-fallback-token");
    window.localStorage.setItem("seenOnboardingCarousel", "true");
    window.localStorage.setItem("seenAppIntro", "true");
    window.global = window;
  });

  await page.route("**/uploads/missing-grow-photo.jpg", async (route: any) => {
    await route.fulfill({
      status: 404,
      contentType: "text/plain",
      body: "missing"
    });
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
        user: { id: "photo-user", email: "photo@example.com", plan: "pro" },
        ctx: {
          mode: "personal",
          plan: "pro",
          subscriptionStatus: "active",
          capabilities: {
            LOGS_PERSONAL_VIEW: true,
            LOGS_PERSONAL_WRITE: true
          },
          limits: {}
        }
      });
    }

    if (method === "GET" && url.pathname === `/api/personal/logs/${LOG.id}`) {
      return fulfillJson(route, { log: LOG });
    }

    return fulfillJson(route, { ok: true });
  });
}

test.describe("log photo fallback", () => {
  for (const size of [
    { name: "desktop", width: 1280, height: 900 },
    { name: "mobile", width: 390, height: 900 }
  ]) {
    test(`shows broken uploaded photo fallback on ${size.name}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await installMocks(page);

      await page.goto(`/home/personal/logs/${LOG.id}`, {
        waitUntil: "domcontentloaded"
      });

      await expect(page.getByText("Broken photo fallback check")).toBeVisible();
      await expect(page.getByText("Photo unavailable")).toBeVisible();
      await expect(page.getByText("/uploads/missing-grow-photo.jpg")).toBeVisible();
      await expect(page.getByText("image/jpeg | 1600x1200")).toBeVisible();

      await page.screenshot({
        path: `tmp/screenshots/log-photo-fallback-${size.name}.png`,
        fullPage: true
      });
    });
  }
});
