import { expect, test } from "@playwright/test";

const GROW = {
  id: "grow-home-sources-1",
  name: "Home Source Grow",
  status: "flowering",
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
    window.localStorage.setItem("auth_token_v1", "personal-home-source-token");
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
        user: { id: "home-user", email: "home@example.com", plan: "pro" },
        ctx: {
          mode: "personal",
          plan: "pro",
          subscriptionStatus: "active",
          capabilities: {
            GROWS_PERSONAL_VIEW: true,
            GROWS_PERSONAL_WRITE: true,
            LOGS_PERSONAL_VIEW: true,
            LOGS_PERSONAL_WRITE: true,
            PLANTS_PERSONAL_VIEW: true
          },
          limits: {}
        }
      });
    }

    if (method === "GET" && url.pathname === "/api/personal/grows") {
      return fulfillJson(route, { grows: [GROW] });
    }

    if (method === "GET" && url.pathname === "/api/personal/logs") {
      return fulfillJson(route, {
        logs: [
          {
            id: "log-home-1",
            growId: GROW.id,
            title: "Morning canopy check",
            notes: "No new spread.",
            date: "2026-07-01T07:30:00.000Z"
          }
        ]
      });
    }

    if (method === "GET" && url.pathname === "/api/personal/plants") {
      return fulfillJson(route, {
        plants: [
          {
            id: "plant-home-1",
            growId: GROW.id,
            name: "Arbequina Olive #1",
            cropCommonName: "Olive",
            scientificName: "Olea europaea"
          }
        ]
      });
    }

    if (method === "GET" && url.pathname === "/api/personal/tasks") {
      return fulfillJson(route, {
        tasks: [
          {
            id: "task-home-diagnosis",
            growId: GROW.id,
            title: "Follow up on olive diagnosis",
            description: "Inspect leaves and confirm root-zone moisture.",
            dueDate: "2026-07-01T10:00:00.000Z",
            completed: false,
            priority: "high",
            sourceType: "ai_diagnosis",
            sourceDiagnosisId: "diag-home-1"
          },
          {
            id: "task-home-automation",
            growId: GROW.id,
            title: "Inspect canopy after automation alert",
            description: "Automation policy created this inspection.",
            dueDate: "2026-07-01T11:00:00.000Z",
            completed: false,
            priority: "medium",
            sourceType: "automation_policy",
            sourceObjectId: "event-home-1"
          }
        ]
      });
    }

    if (method === "GET" && url.pathname === "/api/tools") {
      return fulfillJson(route, { tools: [] });
    }

    return fulfillJson(route, { ok: true });
  });
}

test.describe("personal Home task source labels", () => {
  for (const size of [
    { name: "desktop", width: 1280, height: 900 },
    { name: "mobile", width: 390, height: 900 }
  ]) {
    test(`renders diagnosis and automation task sources on ${size.name}`, async ({
      page
    }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await installMocks(page);

      await page.goto("/home/personal", { waitUntil: "domcontentloaded" });

      await expect(page.getByText("Your Garden")).toBeVisible();
      await expect(page.getByText("Today's tasks")).toBeVisible();
      await expect(page.getByText("Follow up on olive diagnosis")).toBeVisible();
      await expect(page.getByText(/Source: ai diagnosis/)).toBeVisible();
      await expect(page.getByText("Inspect canopy after automation alert")).toBeVisible();
      await expect(page.getByText(/Source: automation policy/)).toBeVisible();
      await expect(page.getByText("Open Source")).toHaveCount(2);

      await page.screenshot({
        path: `tmp/screenshots/personal-home-task-sources-${size.name}.png`,
        fullPage: true
      });
    });
  }
});
