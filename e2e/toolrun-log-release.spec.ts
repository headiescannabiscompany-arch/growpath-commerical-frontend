import { expect, test } from "@playwright/test";

const GROW = { id: "grow-toolrun-log-1", name: "ToolRun Log Grow" };
const PLANT = {
  id: "plant-toolrun-log-1",
  growId: GROW.id,
  name: "Olive patio tree",
  cropCommonName: "Olive",
  scientificName: "Olea europaea",
  cultivar: "Arbequina",
  cropProfileId: "crop-olive-1",
  stage: "fruiting",
  growthProfile: {
    confirmationStatus: "user_confirmed",
    phenoLabel: "compact-container",
    sizeMetrics: { canopyWidthCm: 140 },
    timingAdjustments: { fruitingDaysOffset: 10 },
    waterUseProfile: { observedDemand: "medium" }
  }
};

function fulfillJson(route: any, body: any, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  });
}

test("release gate: journal entry preserves selected plant and ToolRun context", async ({
  page
}) => {
  const createdLogs: any[] = [];

  await page.addInitScript(() => {
    window.localStorage.setItem("auth_token_v1", "toolrun-log-token");
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
        user: { id: "toolrun-log-user", email: "toolrun-log@example.com", plan: "pro" },
        ctx: {
          mode: "personal",
          plan: "pro",
          subscriptionStatus: "active",
          capabilities: {
            GROWS_PERSONAL_VIEW: true,
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

    if (method === "GET" && url.pathname === "/api/personal/plants") {
      return fulfillJson(route, { plants: [PLANT] });
    }

    if (method === "GET" && url.pathname === "/api/tools") {
      return fulfillJson(route, {
        tools: [
          {
            _id: "toolrun-vpd-olive-1",
            id: "toolrun-vpd-olive-1",
            growId: GROW.id,
            plantId: PLANT.id,
            cropProfileId: PLANT.cropProfileId,
            toolType: "vpd",
            toolName: "vpd",
            createdAt: "2026-07-02T14:00:00.000Z",
            inputs: { rh: 60 },
            outputs: { vpdKpa: 1.1 },
            selectedPlantContext: {
              id: PLANT.id,
              name: PLANT.name,
              cropCommonName: PLANT.cropCommonName,
              scientificName: PLANT.scientificName,
              cultivarOrStrain: PLANT.cultivar,
              cropProfileId: PLANT.cropProfileId,
              growthProfile: PLANT.growthProfile
            }
          }
        ]
      });
    }

    if (method === "POST" && url.pathname === "/api/personal/logs") {
      const payload = request.postDataJSON();
      createdLogs.push(payload);
      return fulfillJson(route, {
        log: {
          id: `log-${createdLogs.length}`,
          ...payload
        }
      });
    }

    return fulfillJson(route, { ok: true });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    `/home/personal/logs/new?growId=${GROW.id}&plantId=${PLANT.id}&toolRunId=toolrun-vpd-olive-1`,
    { waitUntil: "domcontentloaded" }
  );

  await expect(page.getByRole("heading", { name: "New Journal Entry" })).toBeVisible();
  await expect(page.getByText("plant linked")).toBeVisible();
  await page.getByLabel("Log title").fill("Olive canopy note");
  await page.getByLabel("Log notes").fill("Checked leaves after VPD review.");
  await page.getByRole("button", { name: "Create log" }).click();

  await expect
    .poll(() => createdLogs[0], {
      message: "journal entry includes selected plant and ToolRun context"
    })
    .toEqual(
      expect.objectContaining({
        growId: GROW.id,
        plantId: PLANT.id,
        toolRunId: "toolrun-vpd-olive-1",
        title: "Olive canopy note"
      })
    );
});
