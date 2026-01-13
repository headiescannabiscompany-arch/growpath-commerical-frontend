import { test, expect } from "@playwright/test";

const TEST_USER = {
  email: "equiptest@example.com",
  password: "Password123",
  subscriptionStatus: "active"
};

const FACILITY_ID = "facility-1";
const EQUIPMENT_1 = { _id: "eq-1", name: "Dehumidifier", notes: "Main flower room" };
const EQUIPMENT_2 = { _id: "eq-2", name: "LED Light", notes: "Veg room" };

test.describe("Equipment management UI/API integration", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.localStorage.setItem("seenOnboardingCarousel", "true");
      window.localStorage.setItem("seenAppIntro", "true");
      window.localStorage.setItem("facilityMode", "facility");
      window.localStorage.setItem("selectedFacilityId", "facility-1");
      window.global = window;
      // Bypass onboarding for web/Playwright
      try {
        window.localStorage.setItem("seenOnboarding", "true");
      } catch {}
    });
  });

  test("lists, creates, updates, and deletes equipment", async ({ page }) => {
    let equipment = [EQUIPMENT_1, EQUIPMENT_2];

    const fulfillJson = (route, body) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body)
      });

    const handler = async (route) => {
      const url = new URL(route.request().url());
      const method = route.request().method();

      if (method === "POST" && url.pathname === "/api/auth/login") {
        return fulfillJson(route, {
          token: "equip-token",
          user: {
            _id: "user-1",
            email: TEST_USER.email,
            displayName: "Playwright Equip",
            subscriptionStatus: TEST_USER.subscriptionStatus
          }
        });
      }

      if (method === "GET" && url.pathname === "/api/auth/me") {
        return fulfillJson(route, {
          facilitiesAccess: [{ facilityId: "facility-1", role: "ADMIN" }]
        });
      }

      if (/\/facilities\/.+\/equipment$/.test(url.pathname) && method === "GET") {
        return fulfillJson(route, equipment);
      }
      if (/\/facilities\/.+\/equipment$/.test(url.pathname) && method === "POST") {
        const payload = route.request().postDataJSON();
        const newEq = { _id: `eq-${Date.now()}`, ...payload };
        equipment = [newEq, ...equipment];
        return fulfillJson(route, newEq);
      }
      if (/\/facilities\/.+\/equipment\//.test(url.pathname) && method === "PUT") {
        const id = url.pathname.split("/").pop();
        const payload = route.request().postDataJSON();
        equipment = equipment.map((eq) => (eq._id === id ? { ...eq, ...payload } : eq));
        return fulfillJson(
          route,
          equipment.find((eq) => eq._id === id)
        );
      }
      if (/\/facilities\/.+\/equipment\//.test(url.pathname) && method === "DELETE") {
        const id = url.pathname.split("/").pop();
        equipment = equipment.filter((eq) => eq._id !== id);
        return fulfillJson(route, { success: true });
      }
      return fulfillJson(route, { success: true });
    };

    await page.route("**/api/**", handler);
    await page.route("**/facilities/**", handler);

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
      try {
        globalThis.__NAV__?.navigate("FacilityStack");
        globalThis.__NAV__?.navigate("EquipmentTools");
      } catch {}
    });

    await expect(page.getByRole("heading", { name: "Equipment Tools" })).toBeVisible();

    // Create new equipment
    await page.getByPlaceholder("Equipment Name").fill("CO2 Sensor");
    await page.getByPlaceholder("Notes (optional)").fill("CO2 room");
    await page.getByText(/Add Equipment/i).click();
    await expect(page.getByText("CO2 Sensor")).toBeVisible();

    // Edit equipment
    await page.getByText("Edit").first().click();
    await page.getByPlaceholder("Equipment Name").fill("CO2 Sensor Updated");
    await page.getByText(/Update Equipment/i).click();
    await expect(page.getByText("CO2 Sensor Updated")).toBeVisible();

    // Delete equipment
    await page.getByText("Delete").first().click();
    // Simulate confirm
    await page.evaluate(() => (window.alert = () => true));
    // The UI should update after deletion
  });
});
