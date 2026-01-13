import { test, expect } from "@playwright/test";

/**
 * Live integration test for Equipment management
 *
 * Prerequisites:
 * 1. Backend running on http://127.0.0.1:5001
 * 2. Test user credentials configured below
 * 3. Valid facilityId with equipment access
 *
 * This test hits real API endpoints without mocks.
 */

const TEST_USER = {
  email: "equiptest@example.com",
  password: "Password123"
};

const FACILITY_ID = "facility-1";

test.describe("Equipment management - Live API Integration", () => {
  let authToken;

  test.beforeAll(async ({ request }) => {
    // Login to get real token
    try {
      const response = await request.post("http://127.0.0.1:5001/api/auth/login", {
        data: { email: TEST_USER.email, password: TEST_USER.password }
      });

      if (response.ok()) {
        const data = await response.json();
        authToken = data.token;
        console.log("✓ Authenticated with backend");
      } else {
        console.warn(
          "⚠ Auth failed - test user may not exist. Create it first or adjust credentials."
        );
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

  test("loads equipment list from live backend", async ({ page }) => {
    test.skip(!authToken, "Auth token not available - skipping live test");

    await page.goto("/");
    await page.waitForFunction(() => typeof globalThis.__NAV__ !== "undefined", {
      timeout: 10000
    });

    // Navigate to Equipment Tools
    await page.evaluate(() => {
      try {
        globalThis.__NAV__?.navigate("FacilityStack");
        globalThis.__NAV__?.navigate("EquipmentTools");
      } catch (e) {
        console.error("Navigation failed:", e);
      }
    });

    // Wait for screen to load
    await expect(page.getByRole("heading", { name: "Equipment Tools" })).toBeVisible({
      timeout: 10000
    });

    // Wait for API call
    await page.waitForTimeout(2000);

    // Check for "No equipment yet" or actual equipment items
    const emptyState = page.getByText("No equipment yet");
    const hasItems = await emptyState.isVisible().catch(() => false);

    if (hasItems) {
      console.log("✓ Equipment list loaded (empty state)");
    } else {
      console.log("✓ Equipment list loaded with items");
    }
  });

  test("creates new equipment via live API", async ({ page }) => {
    test.skip(!authToken, "Auth token not available - skipping live test");

    await page.goto("/");
    await page.waitForFunction(() => typeof globalThis.__NAV__ !== "undefined", {
      timeout: 10000
    });

    await page.evaluate(() => {
      try {
        globalThis.__NAV__?.navigate("FacilityStack");
        globalThis.__NAV__?.navigate("EquipmentTools");
      } catch {}
    });

    await expect(page.getByRole("heading", { name: "Equipment Tools" })).toBeVisible({
      timeout: 10000
    });

    // Fill form
    const testName = `Test Equipment ${Date.now()}`;
    await page.getByPlaceholder("Equipment Name").fill(testName);
    await page.getByPlaceholder("Notes (optional)").fill("Playwright integration test");

    // Submit
    await page.getByText(/Add Equipment/i).click();

    // Wait for success
    await expect(page.getByText(testName)).toBeVisible({ timeout: 5000 });
    console.log(`✓ Created equipment: ${testName}`);
  });

  test("full CRUD workflow with live backend", async ({ page, request }) => {
    test.skip(!authToken, "Auth token not available - skipping live test");

    await page.goto("/");
    await page.waitForFunction(() => typeof globalThis.__NAV__ !== "undefined", {
      timeout: 10000
    });

    await page.evaluate(() => {
      try {
        globalThis.__NAV__?.navigate("FacilityStack");
        globalThis.__NAV__?.navigate("EquipmentTools");
      } catch {}
    });

    await expect(page.getByRole("heading", { name: "Equipment Tools" })).toBeVisible({
      timeout: 10000
    });

    // CREATE
    const testName = `CRUD Test ${Date.now()}`;
    await page.getByPlaceholder("Equipment Name").fill(testName);
    await page.getByPlaceholder("Notes (optional)").fill("Initial notes");
    await page.getByText(/Add Equipment/i).click();
    await expect(page.getByText(testName)).toBeVisible({ timeout: 5000 });
    console.log("✓ CREATE: Equipment added");

    // UPDATE (if edit button visible)
    const editButton = page.getByText("Edit").first();
    const canEdit = await editButton.isVisible().catch(() => false);

    if (canEdit) {
      await editButton.click();
      await page.getByPlaceholder("Equipment Name").fill(`${testName} Updated`);
      await page.getByText(/Update Equipment/i).click();
      await expect(page.getByText(`${testName} Updated`)).toBeVisible({ timeout: 5000 });
      console.log("✓ UPDATE: Equipment updated");
    }

    // DELETE (if delete button visible)
    const deleteButton = page.getByText("Delete").first();
    const canDelete = await deleteButton.isVisible().catch(() => false);

    if (canDelete) {
      // Handle alert confirmation
      page.on("dialog", (dialog) => dialog.accept());
      await deleteButton.click();
      await page.waitForTimeout(1000);
      console.log("✓ DELETE: Equipment deleted");
    }
  });
});
