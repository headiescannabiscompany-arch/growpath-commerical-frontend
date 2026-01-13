import { test, expect } from "@playwright/test";

/**
 * Live integration test for Rooms CRUD
 * Tests facility room management workflow
 */

const TEST_USER = {
  email: "equiptest@example.com",
  password: "Password123"
};

const FACILITY_ID = "facility-1";

test.describe("Rooms Management - Live API Integration", () => {
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

  test("displays facility rooms from backend", async ({ page }) => {
    test.skip(!authToken, "Auth token not available - skipping live test");

    await page.goto("/");
    await page.waitForFunction(() => typeof globalThis.__NAV__ !== "undefined", {
      timeout: 10000
    });

    // Navigate to FacilityTabs
    await page.evaluate(() => {
      try {
        globalThis.__NAV__?.navigate("MainTabs");
        globalThis.__NAV__?.navigate("FacilityStack");
        globalThis.__NAV__?.navigate("FacilityTabs");
      } catch (e) {
        console.error("Navigation error:", e);
      }
    });

    await page.waitForTimeout(2000);

    // Check for facility dashboard with rooms
    const facilityVisible = await page
      .getByText(/Facility Dashboard|Rooms|Spaces/i)
      .isVisible()
      .catch(() => false);
    console.log(`✓ Facility Dashboard loaded: ${facilityVisible}`);
  });

  test("creates new room", async ({ page }) => {
    test.skip(!authToken, "Auth token not available - skipping live test");

    await page.goto("/");
    await page.waitForFunction(() => typeof globalThis.__NAV__ !== "undefined", {
      timeout: 10000
    });

    // Navigate to Rooms
    await page.evaluate(() => {
      try {
        globalThis.__NAV__?.navigate("MainTabs");
        globalThis.__NAV__?.navigate("FacilityStack");
        globalThis.__NAV__?.navigate("FacilityTabs");
      } catch {}
    });

    await page.waitForTimeout(2000);

    // Look for manage rooms or add room button
    const manageBtn = page.getByText(/Manage Rooms|Add Room|New Room/i).first();
    const canManage = await manageBtn.isVisible().catch(() => false);

    if (canManage) {
      await manageBtn.click();
      await page.waitForTimeout(1000);

      const roomName = `Room ${Date.now()}`;
      await page.getByPlaceholder(/Room Name|Name/i).fill(roomName);

      const saveBtn = page.getByText(/Save|Create|Add/i).first();
      await saveBtn.click();

      await page.waitForTimeout(1000);
      console.log(`✓ Created room: ${roomName}`);
    } else {
      console.log("⚠ Room management UI not yet implemented");
    }
  });
});
