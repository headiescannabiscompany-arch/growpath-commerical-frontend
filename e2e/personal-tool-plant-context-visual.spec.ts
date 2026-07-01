import { expect, test } from "@playwright/test";

const USER = {
  id: "plant-context-user",
  email: "plant-context@example.com",
  plan: "pro"
};

const GROW = {
  id: "grow-plant-context-1",
  name: "Mixed Orchard Trial",
  status: "active"
};

const PLANT = {
  id: "plant-olive-1",
  growId: GROW.id,
  name: "Olive patio tree",
  cropCommonName: "Olive",
  scientificName: "Olea europaea",
  cultivar: "Arbequina",
  cropProfileId: "crop-olive-1",
  stage: "fruiting",
  medium: "soil",
  growthProfile: {
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

async function installMocks(page: any) {
  const createdToolRuns: any[] = [];
  const createdTasks: any[] = [];
  const createdLogs: any[] = [];

  await page.addInitScript(() => {
    window.localStorage.setItem("auth_token_v1", "plant-context-token");
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
        user: USER,
        ctx: {
          mode: "personal",
          plan: "pro",
          subscriptionStatus: "active",
          facilityId: null,
          facilityRole: null,
          capabilities: {
            GROWS_PERSONAL_VIEW: true,
            LOGS_PERSONAL_VIEW: true,
            LOGS_PERSONAL_WRITE: true,
            PLANTS_PERSONAL_VIEW: true,
            DIAGNOSE_AI: true,
            TOOL_TIMELINE_PLANNER: true
          },
          limits: {}
        }
      });
    }

    if (method === "GET" && url.pathname === "/api/personal/plants") {
      return fulfillJson(route, { plants: [PLANT] });
    }

    if (method === "GET" && url.pathname === "/api/personal/grows") {
      return fulfillJson(route, { grows: [GROW] });
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
            createdAt: "2026-06-30T14:00:00.000Z",
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

    if (method === "POST" && url.pathname === "/api/tools") {
      const payload = request.postDataJSON();
      createdToolRuns.push(payload);
      return fulfillJson(route, {
        tool: {
          _id: "toolrun-ppfd-1",
          id: "toolrun-ppfd-1",
          growId: GROW.id,
          plantId: PLANT.id,
          cropProfileId: PLANT.cropProfileId,
          toolName: payload.toolName,
          inputs: payload.inputs,
          outputs: payload.outputs,
          selectedPlantContext: payload.selectedPlantContext,
          plantGrowthProfile: payload.plantGrowthProfile
        }
      });
    }

    if (method === "POST" && url.pathname === "/api/personal/tasks") {
      const payload = request.postDataJSON();
      createdTasks.push(payload);
      return fulfillJson(route, {
        task: {
          id: `task-${createdTasks.length}`,
          ...payload,
          completed: false
        }
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

  return { createdToolRuns, createdTasks, createdLogs };
}

test.describe("personal tool plant context", () => {
  test("PPFD saves selected non-cannabis plant context", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const mocks = await installMocks(page);

    await page.goto(`/home/personal/tools/ppfd?growId=${GROW.id}`, {
      waitUntil: "domcontentloaded"
    });

    await expect(page.getByRole("heading", { name: "PPFD / DLI Planner" })).toBeVisible();
    await page.getByRole("button", { name: "Run tool for Olive patio tree" }).click();
    await expect(
      page.getByText(
        "Olive | Arbequina | canopy 140 cm | fruiting +10d | water medium | pheno compact-container"
      )
    ).toBeVisible();

    await page.screenshot({
      path: "tmp/screenshots/personal-tool-plant-context-ppfd-mobile.png",
      fullPage: true
    });

    await page.getByRole("button", { name: "Save and Open Journal" }).click();

    await expect
      .poll(() => mocks.createdToolRuns[0], {
        message: "PPFD tool run includes selected plant context"
      })
      .toEqual(
        expect.objectContaining({
          toolName: "ppfd",
          growId: GROW.id,
          plantId: PLANT.id,
          cropProfileId: PLANT.cropProfileId,
          selectedPlantContext: expect.objectContaining({
            cropCommonName: "Olive",
            scientificName: "Olea europaea",
            cultivarOrStrain: "Arbequina",
            growthProfile: expect.objectContaining({
              phenoLabel: "compact-container"
            })
          })
        })
      );
  });

  test("Timeline Planner creates selected plant tasks", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const mocks = await installMocks(page);

    await page.goto(`/home/personal/tools/timeline-planner?growId=${GROW.id}`, {
      waitUntil: "domcontentloaded"
    });

    await expect(page.getByRole("heading", { name: "Timeline Planner" })).toBeVisible();
    await page.getByRole("button", { name: "Run tool for Olive patio tree" }).click();

    await page.screenshot({
      path: "tmp/screenshots/personal-tool-plant-context-timeline-mobile.png",
      fullPage: true
    });

    await page.getByRole("button", { name: "Create Tasks" }).click();

    await expect
      .poll(() => mocks.createdTasks.length, {
        message: "timeline planner created milestone tasks"
      })
      .toBeGreaterThan(0);
    expect(mocks.createdTasks[0]).toEqual(
      expect.objectContaining({
        growId: GROW.id,
        plantId: PLANT.id,
        description: expect.stringContaining("Species: Olea europaea")
      })
    );
  });

  test("Watering planner shows selected plant size and demand adjustment", async ({
    page
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await installMocks(page);

    await page.goto(`/home/personal/tools/watering?growId=${GROW.id}`, {
      waitUntil: "domcontentloaded"
    });

    await expect(page.getByRole("heading", { name: "Watering Planner" })).toBeVisible();
    await page.getByRole("button", { name: "Run tool for Olive patio tree" }).click();
    await expect(page.getByText("Plant adjustment")).toBeVisible();
    await expect(page.getByText("+15%")).toBeVisible();
    await expect(
      page.getByText("canopy 140 cm | observed water demand medium")
    ).toBeVisible();

    await page.screenshot({
      path: "tmp/screenshots/personal-tool-plant-context-watering-mobile.png",
      fullPage: true
    });
  });

  test("Grow tools page shows plant context on recent runs", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await installMocks(page);

    await page.goto(`/home/personal/grows/${GROW.id}/tools`, {
      waitUntil: "domcontentloaded"
    });

    await expect(page.getByText("Grow Tools")).toBeVisible();
    await expect(page.getByText("vpd | 2026-06-30")).toBeVisible();
    await expect(page.getByText("Olive patio tree | Olive | Arbequina")).toBeVisible();

    await page.screenshot({
      path: "tmp/screenshots/personal-tool-plant-context-grow-tools-mobile.png",
      fullPage: true
    });
  });

  test("New journal entry preserves selected plant and tool result context", async ({
    page
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const mocks = await installMocks(page);

    await page.goto(
      `/home/personal/logs/new?growId=${GROW.id}&plantId=${PLANT.id}&toolRunId=toolrun-vpd-olive-1`,
      { waitUntil: "domcontentloaded" }
    );

    await expect(page.getByRole("heading", { name: "New Journal Entry" })).toBeVisible();
    await expect(
      page.getByText(
        "Olive | Arbequina | canopy 140 cm | fruiting +10d | water medium | pheno compact-container"
      )
    ).toBeVisible();
    await expect(page.getByText("plant linked")).toBeVisible();

    await page.getByLabel("Log title").fill("Olive canopy note");
    await page.getByLabel("Log notes").fill("Checked leaves after VPD review.");

    await page.screenshot({
      path: "tmp/screenshots/personal-tool-plant-context-new-log-mobile.png",
      fullPage: true
    });

    await page.getByRole("button", { name: "Create log" }).click();

    await expect
      .poll(() => mocks.createdLogs[0], {
        message: "new journal entry includes plant and tool run context"
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
});
