import { expect, test } from "@playwright/test";

const USER = {
  id: "tool-result-user",
  email: "tool-result@example.com",
  plan: "pro"
};

const GROW = {
  id: "grow-result-1",
  name: "Result Card Grow",
  status: "flowering",
  updatedAt: "2026-06-30T00:00:00.000Z"
};

const PLANT = {
  id: "plant-blueberry-1",
  growId: GROW.id,
  name: "Blueberry row A",
  cropCommonName: "Blueberry",
  scientificName: "Vaccinium corymbosum",
  cultivar: "Duke",
  cropProfileId: "crop-blueberry-1",
  stage: "fruiting",
  growthProfile: {
    phenoLabel: "early-fruiting",
    sizeMetrics: { canopyWidthCm: 120 },
    timingAdjustments: { fruitingDaysOffset: -4 },
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
  const calculatorPayloads: any[] = [];

  await page.addInitScript(() => {
    window.localStorage.setItem("auth_token_v1", "tool-result-token");
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
            GROWS_PERSONAL_WRITE: true,
            LOGS_PERSONAL_VIEW: true,
            LOGS_PERSONAL_WRITE: true,
            PLANTS_PERSONAL_VIEW: true,
            TOOLS_VPD: true,
            TOOL_NPK: true,
            AI_ASSISTANT: true
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

    if (method === "POST" && url.pathname === "/api/tools/vpd") {
      calculatorPayloads.push(request.postDataJSON());
      return fulfillJson(route, {
        toolRun: {
          id: "toolrun-vpd-1",
          _id: "toolrun-vpd-1",
          growId: GROW.id,
          plantId: PLANT.id,
          cropProfileId: PLANT.cropProfileId,
          selectedPlantContext: {
            id: PLANT.id,
            cropCommonName: PLANT.cropCommonName,
            scientificName: PLANT.scientificName,
            cropProfileId: PLANT.cropProfileId,
            growthProfile: PLANT.growthProfile
          },
          plantGrowthProfile: PLANT.growthProfile,
          toolType: "vpd",
          toolName: "vpd",
          schemaVersion: 1,
          calculatorVersion: "vpd-2026.06",
          status: "completed",
          inputs: {
            airTemp: 77,
            tempUnit: "F",
            rh: 60,
            leafTempOffsetC: -2,
            stage: "veg"
          },
          outputs: {
            vpdKpa: 1.18,
            leafTempC: 23,
            status: "in_range",
            target: { min: 0.7, max: 1.1 },
            targetSource: "starter_crop_profile:blueberry",
            targetConfidence: "low",
            warnings: [
              "Crop-specific VPD target is a starter default pending source/license review. Confirm against crop profile, cultivar, and observed plant response."
            ],
            recommendations: ["Maintain current VPD range."]
          },
          formulas: ["VPD = saturation vapor pressure - actual vapor pressure."],
          uncertainty:
            "Leaf temperature offset and sensor placement can change the result."
        },
        outputs: {
          vpdKpa: 1.18,
          leafTempC: 23,
          status: "in_range",
          target: { min: 0.7, max: 1.1 },
          targetSource: "starter_crop_profile:blueberry",
          targetConfidence: "low",
          warnings: [
            "Crop-specific VPD target is a starter default pending source/license review. Confirm against crop profile, cultivar, and observed plant response."
          ],
          recommendations: ["Maintain current VPD range."]
        }
      });
    }

    if (method === "POST" && url.pathname.includes("/api/tools/runs/")) {
      return fulfillJson(route, { ok: true, task: { id: "task-toolrun-1" } });
    }

    return fulfillJson(route, { ok: true });
  });

  return { calculatorPayloads };
}

test.describe("shared tool result card", () => {
  for (const size of [
    { name: "desktop", width: 1280, height: 900 },
    { name: "mobile", width: 390, height: 844 }
  ]) {
    test(`VPD result card exposes canonical sections on ${size.name}`, async ({
      page
    }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      const mocks = await installMocks(page);

      await page.goto(`/home/personal/tools/vpd?growId=${GROW.id}`, {
        waitUntil: "domcontentloaded"
      });
      await expect(page.getByRole("heading", { name: "VPD Calculator" })).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Run tool for Blueberry row A" })
      ).toBeVisible();
      await page.getByRole("button", { name: "Run tool for Blueberry row A" }).click();

      await page.getByRole("button", { name: "Calculate and Save" }).click();

      await expect
        .poll(() => mocks.calculatorPayloads[0], {
          message: "calculator payload includes selected plant context"
        })
        .toEqual(
          expect.objectContaining({
            plantId: PLANT.id,
            cropProfileId: PLANT.cropProfileId,
            selectedPlantContext: expect.objectContaining({
              scientificName: PLANT.scientificName,
              growthProfile: expect.objectContaining({
                phenoLabel: "early-fruiting"
              })
            })
          })
        );
      await expect(page.getByText("Inputs")).toBeVisible();
      await expect(page.getByText("Outputs")).toBeVisible();
      await expect(page.getByText("Formula / Why It Matters")).toBeVisible();
      await expect(page.getByText("Uncertainty / Confidence")).toBeVisible();
      await expect(
        page.getByText(/starter default pending source\/license review/i).first()
      ).toBeVisible();
      await expect(
        page.getByText(/starter_crop_profile:blueberry/i).first()
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Save to Grow Log" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Create Task" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Copy Result" })).toBeVisible();

      await page.screenshot({
        path: `tmp/screenshots/tool-result-card-vpd-${size.name}.png`,
        fullPage: true
      });
    });
  }
});
