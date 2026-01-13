import { test, expect } from "@playwright/test";

const TEST_USER = {
  email: "planttest@example.com",
  password: "Password123",
  subscriptionStatus: "active"
};

const PLANT_1 = {
  _id: "plant-1",
  name: "Blue Dream",
  strain: "Blue Dream",
  stage: "veg",
  growMedium: "Soil"
};
const PLANT_2 = {
  _id: "plant-2",
  name: "OG Kush",
  strain: "OG Kush",
  stage: "flower",
  growMedium: "Hydro"
};

test.describe("Plant management UI/API integration", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.localStorage.setItem("seenOnboardingCarousel", "true");
      window.localStorage.setItem("seenAppIntro", "true");
      window.global = window;
      try {
        window.localStorage.setItem("seenOnboarding", "true");
      } catch {}
    });
  });

  test("lists, creates, updates, and deletes plants", async ({ page }) => {
    let plants = [PLANT_1, PLANT_2];

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
          token: "plant-token",
          user: {
            _id: "user-1",
            email: TEST_USER.email,
            displayName: "Playwright Plant",
            subscriptionStatus: TEST_USER.subscriptionStatus
          }
        });
      }

      if (url.pathname === "/api/plants" && method === "GET") {
        return fulfillJson(route, plants);
      }
      if (url.pathname === "/api/plants" && method === "POST") {
        const payload = route.request().postDataJSON();
        const newPlant = { _id: `plant-${Date.now()}`, ...payload };
        plants = [newPlant, ...plants];
        return fulfillJson(route, newPlant);
      }
      if (url.pathname.startsWith("/api/plants/") && method === "PUT") {
        const id = url.pathname.split("/").pop();
        const payload = route.request().postDataJSON();
        plants = plants.map((p) => (p._id === id ? { ...p, ...payload } : p));
        return fulfillJson(
          route,
          plants.find((p) => p._id === id)
        );
      }
      if (url.pathname.startsWith("/api/plants/") && method === "DELETE") {
        const id = url.pathname.split("/").pop();
        plants = plants.filter((p) => p._id !== id);
        return fulfillJson(route, { success: true });
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

    await page.evaluate(() => {
      globalThis.__NAV__?.navigate("PlantsTab");
    });

    await expect(page.getByText("Your Plants")).toBeVisible();
    await expect(page.getByText(PLANT_1.name)).toBeVisible();
    await expect(page.getByText(PLANT_2.name)).toBeVisible();

    // Create new plant
    await page.getByPlaceholder("Plant Name").fill("Northern Lights");
    await page.getByPlaceholder("Strain").fill("Northern Lights");
    await page.getByRole("button", { name: /add plant/i }).click();
    await expect(page.getByText("Northern Lights")).toBeVisible();

    // Edit plant
    await page.getByText("Edit").first().click();
    await page.getByPlaceholder("Plant Name").fill("Northern Lights Updated");
    await page.getByRole("button", { name: /update plant/i }).click();
    await expect(page.getByText("Northern Lights Updated")).toBeVisible();

    // Delete plant
    await page.getByText("Delete").first().click();
    // The UI should update after deletion
  });
});
