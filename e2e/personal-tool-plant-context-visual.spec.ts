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
            PLANTS_PERSONAL_VIEW: true
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

    return fulfillJson(route, { ok: true });
  });

  return { createdToolRuns };
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
      page.getByText("Olive | Arbequina | pheno: compact-container")
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
});
