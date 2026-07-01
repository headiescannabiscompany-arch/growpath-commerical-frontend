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
            date: "2026-07-01T07:30:00.000Z",
            photos: ["/uploads/home-canopy.jpg"],
            photoMetadata: [
              {
                growId: GROW.id,
                plantId: "plant-home-1",
                createdAt: "2026-07-01T07:35:00.000Z",
                consentForAI: true,
                consentForTraining: false
              }
            ]
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
      return fulfillJson(route, {
        tools: [
          {
            id: "tool-home-1",
            growId: GROW.id,
            toolType: "dew-point-guard",
            createdAt: "2026-07-01T08:30:00.000Z",
            warnings: ["Condensation risk increased after lights-off."]
          }
        ]
      });
    }

    if (method === "GET" && url.pathname === "/api/telemetry/sources") {
      return fulfillJson(route, {
        sources: [
          {
            id: "telemetry-home-1",
            growId: GROW.id,
            type: "growlink",
            name: "Home tent controller",
            timezone: "America/New_York",
            isActive: true,
            config: {},
            lastPointIso: "2026-06-29T08:00:00.000Z",
            updatedAt: "2026-06-29T08:00:00.000Z"
          }
        ]
      });
    }

    if (method === "GET" && url.pathname === "/api/diagnose/history") {
      return fulfillJson(route, [
        {
          id: "diag-home-1",
          growId: GROW.id,
          plantId: "plant-home-1",
          issueSummary: "Possible olive leaf spot",
          diagnosisClass: "plant_health_triage",
          urgency: "high",
          createdAt: "2026-07-01T08:15:00.000Z"
        }
      ]);
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
      await expect(page.getByText("Active alerts")).toBeVisible();
      await expect(page.getByText("High priority today")).toBeVisible();
      await expect(page.getByText("Diagnosis follow-up")).toBeVisible();
      await expect(page.getByText("Latest tool warning")).toBeVisible();
      await expect(page.getByText("Telemetry stale")).toBeVisible();
      await expect(page.getByText(/Home tent controller has not updated/)).toBeVisible();
      await expect(page.getByText("Follow up on olive diagnosis")).toBeVisible();
      await expect(page.getByText(/Source: ai diagnosis/)).toBeVisible();
      await expect(page.getByText("Inspect canopy after automation alert")).toBeVisible();
      await expect(page.getByText(/Source: automation policy/)).toBeVisible();
      await expect(page.getByText("Latest diagnosis")).toBeVisible();
      await expect(
        page.getByText(/Possible olive leaf spot \| 7\/1\/2026/)
      ).toBeVisible();
      await expect(page.getByText("Recent photos")).toBeVisible();
      await expect(page.getByText(/1 recent photo attached to this grow/)).toBeVisible();
      await expect(page.getByText("Diagnose").first()).toBeVisible();
      await expect(page.getByText("Add Photo").first()).toBeVisible();
      await expect(page.getByText("Create Task")).toBeVisible();
      await expect(page.getByText("Open Source")).toHaveCount(2);

      await page.screenshot({
        path: `tmp/screenshots/personal-home-task-sources-${size.name}.png`,
        fullPage: true
      });
    });
  }
});
