import { test, expect } from "@playwright/test";

const TEST_USER = {
  email: "grower@example.com",
  password: "Password123",
  subscriptionStatus: "active"
};

const VEG_GROW = {
  _id: "veg-grow",
  name: "Veg Run",
  strain: "Blue Dream",
  stage: "veg"
};

const FLOWER_GROW = {
  _id: "flower-grow",
  name: "Flower Run",
  strain: "OG Kush",
  stage: "flower"
};

test.describe("Grow logs experience", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.localStorage.setItem("seenOnboardingCarousel", "true");
      window.localStorage.setItem("seenAppIntro", "true");
      window.global = window;
    });
  });

  test("filters grows by stage and shows newly created grow", async ({ page }) => {
    let grows = [VEG_GROW, FLOWER_GROW];

    const fulfillJson = (route, body) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body)
      });

    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      const method = route.request().method();

      if (method === "POST" && url.pathname === "/api/auth/login") {
        return fulfillJson(route, {
          token: "grow-token",
          user: {
            _id: "user-1",
            email: TEST_USER.email,
            displayName: "Playwright Grower",
            subscriptionStatus: TEST_USER.subscriptionStatus
          }
        });
      }

      if (url.pathname === "/api/subscribe/status") {
        return fulfillJson(route, { success: true, status: TEST_USER.subscriptionStatus });
      }

      if (url.pathname === "/api/tasks/today") {
        return fulfillJson(route, []);
      }

      if (url.pathname === "/api/grows" && method === "GET") {
        const requestedStage = url.searchParams.get("stage");
        const response =
          requestedStage && requestedStage.length
            ? grows.filter((g) => g.stage === requestedStage)
            : grows;
        return fulfillJson(route, response);
      }

      if (url.pathname === "/api/grows" && method === "POST") {
        const payload = route.request().postDataJSON();
        const newGrow = {
          _id: `grow-${Date.now()}`,
          name: payload.name,
          strain: payload.strain,
          stage: payload.stage,
          breeder: payload.breeder
        };
        grows = [newGrow, ...grows];
        return fulfillJson(route, newGrow);
      }

      if (url.pathname.includes("/api/grows/") && url.pathname.endsWith("/entries")) {
        return fulfillJson(route, { _id: "entry-1" });
      }

      if (url.pathname === "/api/plants") {
        return fulfillJson(route, []);
      }

      return fulfillJson(route, { success: true });
    });

    await page.goto("/");
    await page.waitForFunction(() => typeof globalThis.__NAV__ !== "undefined");

    const loginResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/auth/login") &&
        response.request().method() === "POST"
    );

    await page.getByPlaceholder("Email").fill(TEST_USER.email);
    await page.getByPlaceholder("Password").fill(TEST_USER.password);
    await page.getByRole("button", { name: /login/i }).click();
    await loginResponse;

    await page.getByText("Quick Actions").waitFor();

    await page.evaluate(() => {
      globalThis.__NAV__?.navigate("PlantsTab");
    });

    await expect(page.getByText("Your Plants")).toBeVisible();
    await expect(page.getByText(VEG_GROW.name)).toBeVisible();
    await expect(page.getByText(FLOWER_GROW.name)).toBeVisible();

    await page.getByPlaceholder("Stage (e.g., veg, flower)").fill("veg");
    await page.getByTestId("apply-grow-filters").click();
    await expect(page.getByText(VEG_GROW.name)).toBeVisible();
    await expect(page.getByText(FLOWER_GROW.name)).toHaveCount(0);

    await page.getByPlaceholder("Stage (e.g., veg, flower)").fill("");
    await page.getByTestId("apply-grow-filters").click();

    await page.getByPlaceholder("Grow Name (required)").fill("Playwright Grow");
    await page.getByPlaceholder("Seedling, Veg, Flower, etc.").fill("veg");
    await page.getByTestId("create-grow-button").click();

    await expect(page.getByText("Playwright Grow")).toBeVisible();
  });
});
