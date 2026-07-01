import { expect, test } from "@playwright/test";

function fulfillJson(route: any, body: any, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  });
}

async function installMocks(page: any) {
  const assistantPayloads: any[] = [];

  await page.addInitScript(() => {
    window.localStorage.setItem("auth_token_v1", "personal-ai-token");
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
        user: { id: "ai-user", email: "ai@example.com", plan: "pro" },
        ctx: {
          mode: "personal",
          plan: "pro",
          subscriptionStatus: "active",
          capabilities: {
            GROWS_PERSONAL_VIEW: true,
            LOGS_PERSONAL_VIEW: true,
            LOGS_PERSONAL_WRITE: true,
            AI_ASSISTANT: true
          },
          limits: {}
        }
      });
    }

    if (method === "GET" && url.pathname === "/api/personal/grows") {
      return fulfillJson(route, {
        grows: [
          { id: "grow-ai-1", name: "Flower Room", status: "flowering" },
          { id: "grow-ai-2", name: "Veg Tent", status: "vegetating" }
        ]
      });
    }

    if (method === "GET" && url.pathname === "/api/personal/plants") {
      return fulfillJson(route, {
        plants: [
          {
            id: "plant-ai-1",
            growId: "grow-ai-1",
            name: "Arbequina Olive #1",
            cropCommonName: "Olive",
            scientificName: "Olea europaea",
            cropProfileId: "crop-olive-1",
            cultivar: "Arbequina",
            stage: "fruiting",
            growthProfile: {
              cropProfile: "crop-olive-1",
              confirmationStatus: "user_confirmed",
              sizeMetrics: { canopyWidthCm: 140 },
              timingAdjustments: { stageDaysOffset: 8 },
              waterUseProfile: { observedDemand: "low" },
              phenoLabel: "compact"
            }
          }
        ]
      });
    }

    if (method === "GET" && url.pathname === "/api/personal/logs") {
      return fulfillJson(route, {
        logs: [
          {
            id: "log-ai-1",
            growId: "grow-ai-1",
            title: "Canopy check",
            notes: "Some RH pressure overnight.",
            date: "2026-06-29"
          }
        ]
      });
    }

    if (method === "GET" && url.pathname === "/api/personal/tasks") {
      return fulfillJson(route, {
        tasks: [
          {
            id: "task-ai-1",
            growId: "grow-ai-1",
            title: "Check dew point",
            description: "Inspect dense canopy.",
            dueDate: "2026-06-30",
            priority: "high",
            completed: false
          }
        ]
      });
    }

    if (method === "GET" && url.pathname === "/api/tools") {
      return fulfillJson(route, {
        tools: [
          {
            id: "run-ai-1",
            growId: "grow-ai-1",
            toolType: "dew-point-guard",
            createdAt: "2026-06-29T12:00:00Z"
          }
        ]
      });
    }

    if (method === "GET" && url.pathname === "/api/diagnose/history") {
      return fulfillJson(route, [
        {
          id: "diag-ai-1",
          growId: "grow-ai-1",
          issueSummary: "Watch humidity stress",
          createdAt: "2026-06-29T13:00:00Z"
        }
      ]);
    }

    if (method === "POST" && url.pathname === "/api/ai/assistant/personal") {
      assistantPayloads.push(request.postDataJSON());
      return fulfillJson(route, {
        success: true,
        intent: "environment",
        reply:
          "Flower Room has a recent dew point task. Olive crop context is confirmed; do not use cannabis defaults for this plant.",
        actions: [
          { label: "Open Dew Point Guard", href: "/home/personal/tools/dew-point-guard" }
        ],
        contextSummary: {
          grows: 2,
          logs: 1,
          tasks: 1,
          toolRuns: 1,
          diagnoses: 1,
          selectedGrowId: "grow-ai-1"
        },
        referencedData: [
          {
            type: "task",
            id: "task-ai-1",
            title: "Check dew point",
            timestamp: "2026-06-30"
          }
        ],
        proposedWrites: [
          {
            type: "create_task",
            payload: {
              growId: "grow-ai-1",
              title: "Review dew point and environment risk",
              description: "Inspect dense canopy/cold surfaces.",
              priority: "medium"
            }
          }
        ]
      });
    }

    if (method === "POST" && url.pathname === "/api/personal/tasks") {
      return fulfillJson(route, {
        task: {
          id: "task-ai-created",
          growId: "grow-ai-1",
          title: "Review dew point and environment risk"
        }
      });
    }

    return fulfillJson(route, { ok: true });
  });

  return { assistantPayloads };
}

test.describe("grow-aware personal AI assistant", () => {
  for (const size of [
    { name: "desktop", width: 1280, height: 900 },
    { name: "mobile", width: 390, height: 900 }
  ]) {
    test(`shows scoped context and confirms write on ${size.name}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      const api = await installMocks(page);

      await page.goto("/home/personal/ai", { waitUntil: "domcontentloaded" });
      await expect(page.getByText("Context Loaded")).toBeVisible();
      await expect(page.getByText("Plants: 1")).toBeVisible();
      await expect(page.getByText(/Crop context: .*Olive/i)).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Select AI grow Flower Room" })
      ).toBeVisible();

      await page
        .getByPlaceholder("Type here...")
        .fill("what should I do about humidity?");
      await page.getByRole("button", { name: "Send" }).click();

      await expect(page.getByText(/Olive crop context is confirmed/)).toBeVisible();
      expect(api.assistantPayloads[0]).toMatchObject({
        context: {
          selectedGrowId: "grow-ai-1",
          plants: [
            {
              id: "plant-ai-1",
              cropCommonName: "Olive",
              scientificName: "Olea europaea",
              cropProfileId: "crop-olive-1",
              growthProfile: {
                confirmationStatus: "user_confirmed",
                sizeMetrics: { canopyWidthCm: 140 },
                waterUseProfile: { observedDemand: "low" },
                phenoLabel: "compact"
              }
            }
          ]
        }
      });
      await expect(page.getByText("Referenced grow data")).toBeVisible();
      await expect(page.getByText(/task: Check dew point/)).toBeVisible();
      await expect(page.getByText("Drafted actions require confirmation")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Confirm create_task" })
      ).toBeVisible();

      await page.getByRole("button", { name: "Confirm create_task" }).click();
      await expect(page.getByText("AI suggested task created.")).toBeVisible();

      await page.screenshot({
        path: `tmp/screenshots/personal-ai-assistant-${size.name}.png`,
        fullPage: true
      });
    });
  }
});
