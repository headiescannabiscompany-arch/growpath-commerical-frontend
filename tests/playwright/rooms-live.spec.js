import { test, expect } from "@playwright/test";

const TEST_USER = {
  email: "equiptest@example.com",
  password: "Password123"
};

const FACILITY_ID = "facility-1";

async function openFacilityRooms(page) {
  await page.goto("/home/facility/rooms");
  await page.waitForTimeout(1000);
}

test.describe("Rooms Management - Live API Integration", () => {
  let authToken;

  test.beforeAll(async ({ request }) => {
    const response = await request
      .post("http://127.0.0.1:5001/api/auth/login", {
        data: { email: TEST_USER.email, password: TEST_USER.password }
      })
      .catch(() => null);

    if (response?.ok()) {
      const data = await response.json();
      authToken = data.token;
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
              email: TEST_USER.email,
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

    await openFacilityRooms(page);
    await expect(page.getByText(/Rooms|No rooms yet|Create Room/i).first()).toBeVisible();
  });

  test("creates new room", async ({ page }) => {
    test.skip(!authToken, "Auth token not available - skipping live test");

    await openFacilityRooms(page);

    const roomName = `Room ${Date.now()}`;
    const roomInput = page.getByPlaceholder(/Room name|Room Name|Name/i).first();
    if (await roomInput.isVisible().catch(() => false)) {
      await roomInput.fill(roomName);
    } else {
      await page
        .getByText(/Create Room|Add Room|New Room/i)
        .first()
        .click();
      await page
        .getByPlaceholder(/Room name|Room Name|Name/i)
        .first()
        .fill(roomName);
    }

    await page
      .getByText(/Create Room|Save|Create|Add/i)
      .first()
      .click();
    await expect(page.getByText(new RegExp(roomName))).toBeVisible({ timeout: 5000 });
  });
});
