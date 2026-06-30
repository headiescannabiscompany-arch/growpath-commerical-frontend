import { expect, test } from "@playwright/test";

const USER = {
  id: "nutrient-user",
  email: "nutrient@example.com",
  plan: "pro"
};

const GROW = {
  id: "grow-nutrient-1",
  name: "Nutrient Trial Grow",
  status: "flower",
  updatedAt: "2026-06-30T00:00:00.000Z"
};

const NPK_OUTPUTS = {
  totals: {
    Nppm: 110,
    Pppm: 43.6,
    Kppm: 83,
    Cappm: 20,
    Mgppm: 8
  },
  formula:
    "ppm = product grams x 1000 x nutrient fraction / batch liters; label P2O5 and K2O are converted to elemental P and K.",
  warnings: ["Source water EC is elevated. Include baseline minerals when comparing measured EC."],
  recommendations: [
    "Confirm product labels, nutrient forms, and units, then verify finished solution EC and pH with calibrated meters."
  ],
  releaseDisclaimer:
    "Release windows are planning estimates, not guaranteed availability.",
  sourceConfidence: {
    overall: "medium",
    counts: { high: 0, medium: 1, low: 0 }
  },
  mixingOrder: [
    "Start with source water and record baseline EC/pH before adding products.",
    "Add base nutrients one at a time with agitation; wait for each product to dissolve.",
    "Measure and record finished EC and pH, then adjust only after the solution is fully mixed."
  ],
  availabilityEstimate: {
    windows: {
      day_0_3: { Nppm: 110, Pppm: 43.6, Kppm: 83, Cappm: 20, Mgppm: 8 },
      day_3_14: { Nppm: 0, Pppm: 0, Kppm: 0, Cappm: 0, Mgppm: 0 },
      day_14_45: { Nppm: 0, Pppm: 0, Kppm: 0, Cappm: 0, Mgppm: 0 },
      day_45_120: { Nppm: 0, Pppm: 0, Kppm: 0, Cappm: 0, Mgppm: 0 },
      day_120_plus: { Nppm: 0, Pppm: 0, Kppm: 0, Cappm: 0, Mgppm: 0 },
      unknown: { Nppm: 0, Pppm: 0, Kppm: 0, Cappm: 0, Mgppm: 0 }
    },
    disclaimer:
      "Availability by window is an estimate from nutrient form and release class."
  },
  releaseTimeline: {
    day_0_3: [
      {
        name: "Base A",
        form: "nitrate",
        confidence: "medium"
      }
    ],
    day_3_14: [],
    day_14_45: [],
    day_45_120: [],
    day_120_plus: [],
    unknown: []
  },
  measured: { ec: 1.8, ph: 6.1 },
  waterBaseline: {
    sourceEC: 0.2,
    sourcePH: 7,
    alkalinityPpm: 80
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
  await page.addInitScript(() => {
    window.localStorage.setItem("auth_token_v1", "nutrient-token");
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

    if (method === "GET" && url.pathname === "/api/tools/recipes") {
      return fulfillJson(route, { items: [] });
    }

    if (method === "POST" && url.pathname === "/api/tools/npk-recipe") {
      return fulfillJson(route, {
        toolRun: {
          id: "toolrun-npk-1",
          _id: "toolrun-npk-1",
          growId: GROW.id,
          toolType: "npk_recipe",
          toolName: "npk_recipe",
          schemaVersion: 1,
          calculatorVersion: "1",
          status: "completed",
          inputs: await request.postDataJSON(),
          outputs: NPK_OUTPUTS,
          recommendations: NPK_OUTPUTS.recommendations,
          warnings: NPK_OUTPUTS.warnings,
          formulas: [NPK_OUTPUTS.formula],
          uncertainty:
            "Ingredient labels, density assumptions, water baseline, and product source confidence affect nutrient totals.",
          confidence: "beta-calculator"
        },
        outputs: NPK_OUTPUTS
      });
    }

    if (method === "POST" && url.pathname === "/api/tools/recipes") {
      return fulfillJson(
        route,
        {
          recipe: {
            _id: "recipe-npk-1",
            name: "Olive baseline feed",
            version: 1,
            growId: GROW.id,
            stage: "veg",
            medium: "soil",
            batchVolume: 5,
            batchUnit: "gal",
            products: [],
            calculation: NPK_OUTPUTS,
            sourceConfidence: NPK_OUTPUTS.sourceConfidence,
            mixingOrder: NPK_OUTPUTS.mixingOrder,
            useCount: 0
          }
        },
        201
      );
    }

    if (method === "POST" && url.pathname.includes("/api/tools/runs/")) {
      return fulfillJson(route, { ok: true });
    }

    return fulfillJson(route, { ok: true });
  });
}

test.describe("nutrient recipe workflow", () => {
  for (const size of [
    { name: "desktop", width: 1280, height: 1100 },
    { name: "mobile", width: 390, height: 1000 }
  ]) {
    test(`shows water baseline, confidence, and mixing guidance on ${size.name}`, async ({
      page
    }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await installMocks(page);

      await page.goto(`/home/personal/tools/npk?growId=${GROW.id}`, {
        waitUntil: "domcontentloaded"
      });

      await expect(
        page.getByRole("heading", { name: "NPK Label Ratio (Preview)" })
      ).toBeVisible();
      await expect(page.getByText("Water baseline and measured feed")).toBeVisible();

      await page.getByPlaceholder("e.g. Veg base").fill("Olive baseline feed");
      await page.getByPlaceholder("Product name").first().fill("Base A");
      await page.getByPlaceholder("Amount").first().fill("10");
      await page.getByText("Calculate recipe").scrollIntoViewIfNeeded();
      await page.getByText("Calculate recipe").click();

      await expect(page.getByText("Source confidence", { exact: true })).toBeVisible();
      await expect(page.getByText("Mixing sequence", { exact: true })).toBeVisible();
      await expect(page.getByText("Estimated availability", { exact: true })).toBeVisible();
      await expect(page.getByText("Release timing", { exact: true })).toBeVisible();
      await expect(page.getByText("Save Recipe")).toBeVisible();

      await page.getByText("Source confidence", { exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `tmp/screenshots/nutrient-recipe-${size.name}.png`,
        fullPage: true
      });
    });
  }
});
