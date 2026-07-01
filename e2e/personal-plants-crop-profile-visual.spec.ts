import { expect, test } from "@playwright/test";

const GROW_ID = "grow-crop-profile-1";

function fulfillJson(route: any, body: any, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  });
}

async function installMocks(page: any, options: { cropProfiles?: any[] } = {}) {
  const createPayloads: any[] = [];
  const cropProfileDrafts: any[] = [];

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
        items: options.cropProfiles ?? [
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

    if (method === "POST" && url.pathname === "/api/crop-knowledge/crop-profiles") {
      const body = request.postDataJSON();
      const item = {
        _id: `crop-draft-${cropProfileDrafts.length + 1}`,
        id: `crop-draft-${cropProfileDrafts.length + 1}`,
        curationStatus: "needs_license_review",
        ...body
      };
      cropProfileDrafts.push(item);
      return fulfillJson(route, { item }, 201);
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

  return { createPayloads, cropProfileDrafts };
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
      await expect(
        page.getByRole("link", { name: "Run VPD for Cherry tomato #1" })
      ).toBeVisible();
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

      await page.getByRole("link", { name: "Run VPD for Cherry tomato #1" }).click();
      await expect(page).toHaveURL(/\/home\/personal\/tools\/vpd\?/);
      await expect(page).toHaveURL(/growId=grow-crop-profile-1/);
      await expect(page).toHaveURL(/plantId=plant-created-1/);
    });
  }

  test("creates a license-review draft crop profile when no match exists", async ({
    page
  }) => {
    await page.setViewportSize({ width: 1280, height: 950 });
    const api = await installMocks(page, { cropProfiles: [] });

    await page.goto(`/home/personal/grows/${GROW_ID}/plants`, {
      waitUntil: "domcontentloaded"
    });
    await page.getByRole("button", { name: "Add plant" }).click();

    await page.getByLabel("Plant name").fill("Patio fig #1");
    await page.getByLabel("Plant crop common name").fill("Fig");
    await page.getByLabel("Plant scientific name").fill("Ficus carica");
    await page.getByRole("button", { name: "Match crop profile" }).click();
    await expect(page.getByText(/No crop profile matched yet/)).toBeVisible();

    await page.getByRole("button", { name: "Create draft crop profile" }).click();
    await expect(page.getByText(/Draft crop profile created and linked/)).toBeVisible();
    await expect(page.getByText(/Fig \(needs_license_review\)/)).toBeVisible();

    await page.getByRole("button", { name: "Add plant to grow" }).click();
    await expect(page.getByText("Plant added to this grow.")).toBeVisible();

    expect(api.cropProfileDrafts[0]).toMatchObject({
      displayName: "Fig",
      scientificName: "Ficus carica",
      commonNames: ["Fig"],
      curationStatus: "needs_license_review",
      sourceRecords: [
        expect.objectContaining({
          sourceName: "User-entered crop profile request",
          sourceType: "user_entered",
          commercialUseAllowed: false,
          trainingUseAllowed: false,
          confidence: "low"
        })
      ]
    });
    expect(api.createPayloads[0]).toMatchObject({
      cropCommonName: "Fig",
      scientificName: "Ficus carica",
      cropProfileId: "crop-draft-1",
      confirmationStatus: "user_confirmed"
    });
  });
});
