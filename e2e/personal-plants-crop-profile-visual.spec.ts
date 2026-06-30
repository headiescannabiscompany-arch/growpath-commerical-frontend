import { expect, test } from "@playwright/test";

const GROW_ID = "grow-crop-profile-1";

function fulfillJson(route: any, body: any, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  });
}

async function installMocks(page: any) {
  const createPayloads: any[] = [];

  await page.addInitScript(() => {
    window.localStorage.setItem("auth_token_v1", "plants-crop-profile-token");
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
        user: { id: "plant-user", email: "plant@example.com", plan: "pro" },
        ctx: {
          mode: "personal",
          plan: "pro",
          subscriptionStatus: "active",
          capabilities: {
            GROWS_PERSONAL_VIEW: true,
            GROWS_PERSONAL_WRITE: true,
            PLANTS_PERSONAL_VIEW: true
          },
          limits: {}
        }
      });
    }

    if (method === "GET" && url.pathname === "/api/personal/plants") {
      return fulfillJson(route, {
        plants:
          createPayloads.length > 0
            ? [
                {
                  id: "plant-created-1",
                  growId: GROW_ID,
                  name: createPayloads[0].name,
                  cropCommonName: createPayloads[0].cropCommonName,
                  scientificName: createPayloads[0].scientificName,
                  cultivar: createPayloads[0].cultivar,
                  cropProfileId: createPayloads[0].cropProfileId,
                  stage: "seedling",
                  growthProfile: {
                    cropProfile: createPayloads[0].cropProfileId,
                    confirmationStatus: "user_confirmed",
                    sizeMetrics: createPayloads[0].sizeMetrics,
                    timingAdjustments: createPayloads[0].timingAdjustments,
                    waterUseProfile: createPayloads[0].waterUseProfile,
                    phenoLabel: createPayloads[0].phenoLabel
                  }
                }
              ]
            : []
      });
    }

    if (method === "GET" && url.pathname === "/api/crop-knowledge/crop-profiles") {
      return fulfillJson(route, {
        items: [
          {
            _id: "crop-tomato-1",
            displayName: "Tomato",
            scientificName: "Solanum lycopersicum",
            cropCategory: "greenhouse_crop",
            curationStatus: "needs_license_review"
          }
        ]
      });
    }

    if (method === "POST" && url.pathname === "/api/personal/plants") {
      const body = request.postDataJSON();
      createPayloads.push(body);
      return fulfillJson(
        route,
        {
          plant: {
            id: "plant-created-1",
            ...body,
            stage: "seedling"
          },
          growthProfile: {
            id: "growth-profile-1",
            sizeMetrics: body.sizeMetrics,
            timingAdjustments: body.timingAdjustments,
            waterUseProfile: body.waterUseProfile
          }
        },
        201
      );
    }

    return fulfillJson(route, { ok: true });
  });

  return { createPayloads };
}

test.describe("personal plant crop profile form", () => {
  for (const size of [
    { name: "desktop", width: 1280, height: 950 },
    { name: "mobile", width: 390, height: 950 }
  ]) {
    test(`creates plant with crop identity on ${size.name}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      const api = await installMocks(page);

      await page.goto(`/home/personal/grows/${GROW_ID}/plants`, {
        waitUntil: "domcontentloaded"
      });
      await expect(page.getByRole("heading", { name: "Plants" })).toBeVisible();
      await page.getByRole("button", { name: "Add plant" }).click();

      await page.getByLabel("Plant name").fill("Cherry tomato #1");
      await page.getByLabel("Cultivar or strain").fill("Cherry tomato");
      await page.getByLabel("Plant crop common name").fill("Tomato");
      await page.getByLabel("Plant scientific name").fill("Solanum lycopersicum");
      await page.getByRole("button", { name: "Match crop profile" }).click();
      await expect(page.getByText(/Tomato \(needs_license_review\)/)).toBeVisible();

      await page.getByLabel("Plant medium").fill("Coco");
      await page.getByLabel("Plant canopy width").fill("75");
      await page.getByLabel("Plant timing offset").fill("7");
      await page.getByLabel("Plant water demand").fill("high");
      await page.getByLabel("Plant pheno label").fill("vigorous");
      await page.getByRole("button", { name: "Add plant to grow" }).click();

      await expect(page.getByText("Plant added to this grow.")).toBeVisible();
      await expect(page.getByText("Cherry tomato #1")).toBeVisible();
      await expect(page.getByText(/Species: Tomato/)).toBeVisible();
      await expect(page.getByText(/Growth overlay: canopy 75 cm/)).toBeVisible();
      expect(api.createPayloads[0]).toMatchObject({
        cropCommonName: "Tomato",
        scientificName: "Solanum lycopersicum",
        cropProfileId: "crop-tomato-1",
        sizeMetrics: { canopyWidthCm: 75 },
        timingAdjustments: { stageDaysOffset: 7 },
        waterUseProfile: { observedDemand: "high" },
        phenoLabel: "vigorous"
      });

      await page.screenshot({
        path: `tmp/screenshots/personal-plants-crop-profile-${size.name}.png`,
        fullPage: true
      });
    });
  }
});
