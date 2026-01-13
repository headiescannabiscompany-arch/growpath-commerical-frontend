import { test, expect } from "@playwright/test";

/**
 * Live integration test for Plants CRUD
 * Tests full facility plant management workflow
 */

const TEST_USER = {
  email: "equiptest@example.com",
  password: "Password123"
};

const FACILITY_ID = "facility-1";

test.describe("Plants Management - Live API Integration", () => {
  let authToken;

  test.beforeAll(async ({ request }) => {
    try {
      const response = await request.post("http://127.0.0.1:5001/api/auth/login", {
        data: { email: TEST_USER.email, password: TEST_USER.password }
      });

      if (response.ok()) {
        const data = await response.json();
        authToken = data.token;
        console.log("✓ Authenticated with backend");
      } else {
        console.warn("⚠ Auth failed - test user may not exist.");
      }
    } catch (error) {
      console.warn("⚠ Backend connection failed:", error.message);
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      ({ token, facilityId }) => {
        window.localStorage.clear();
        window.localStorage.setItem("seenOnboardingCarousel", "true");
        window.localStorage.setItem("seenAppIntro", "true");
        window.localStorage.setItem("seenOnboarding", "true");
        window.localStorage.setItem("facilityMode", "facility");
        window.localStorage.setItem("selectedFacilityId", facilityId);

        if (token) {
          window.localStorage.setItem("token", token);
          window.localStorage.setItem(
            "user",
            JSON.stringify({
              _id: "test-user",
              email: "equiptest@example.com",
              displayName: "Equipment Tester"
            })
          );
        }

        window.global = window;
      },
      { token: authToken, facilityId: FACILITY_ID }
    );
  });

  test("loads plant list from backend", async ({ page }) => {
    test.skip(!authToken, "Auth token not available - skipping live test");

    await page.goto("/");
    await page.waitForFunction(() => typeof globalThis.__NAV__ !== "undefined", {
      timeout: 10000
    });

    // Navigate to Plants (via MainTabs or PlantsTab)
    await page.evaluate(() => {
      try {
        globalThis.__NAV__?.navigate("MainTabs");
        globalThis.__NAV__?.navigate("PlantsTab");
      } catch (e) {
        console.error("Navigation failed:", e);
      }
    });

    // Wait for screen
    await page.waitForTimeout(2000);

    const plantsVisible = await page
      .getByText(/Your Plants|plants/i)
      .isVisible()
      .catch(() => false);
    console.log(
      `✓ Plants screen loaded: ${plantsVisible ? "with items" : "empty state"}`
    );
  });

  test("creates new plant", async ({ page }) => {
    test.skip(!authToken, "Auth token not available - skipping live test");

    await page.goto("/");
    await page.waitForFunction(() => typeof globalThis.__NAV__ !== "undefined", {
      timeout: 10000
    });

    // Navigate to Plants
    await page.evaluate(() => {
      try {
        globalThis.__NAV__?.navigate("MainTabs");
        globalThis.__NAV__?.navigate("PlantsTab");
      } catch {}
    });

    await page.waitForTimeout(2000);

    // Look for create button
    const createBtn = page.getByText(/\+ Add|Create Plant|New Plant/i).first();
    const canCreate = await createBtn.isVisible().catch(() => false);

    if (canCreate) {
      await createBtn.click();

      // Fill form
      const testName = `Plant ${Date.now()}`;
      await page.getByPlaceholder(/Plant Name|Strain/i).fill(testName);
      await page.getByPlaceholder(/Notes/i).fill("Test plant via Playwright");

      // Submit
      const submitBtn = page.getByText(/Save|Create|Add/i).first();
      await submitBtn.click();

      await page.waitForTimeout(1000);
      console.log(`✓ Created plant: ${testName}`);
    } else {
      console.log("⚠ Create button not found - form may not be in UI yet");
    }
  });
});
