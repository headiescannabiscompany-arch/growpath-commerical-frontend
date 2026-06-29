import { test, expect } from "@playwright/test";

const TEST_USER = {
  email: "equiptest@example.com",
  password: "Password123"
};

const FACILITY_ID = "facility-1";

async function openVendorDashboard(page) {
  await page.goto("/");
  await page.waitForFunction(() => typeof globalThis.__NAV__ !== "undefined", {
    timeout: 10000
  });

  await page.evaluate(() => {
    globalThis.__NAV__?.navigate("MainTabs");
    globalThis.__NAV__?.navigate("FacilityStack");
    globalThis.__NAV__?.navigate("FacilityTabs");
    globalThis.__NAV__?.navigate("FacilityHome");
  });

  await page.waitForTimeout(1000);
}

test.describe("Commercial Features - Live API Integration", () => {
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
              displayName: "Equipment Tester",
              isCommercial: true
            })
          );
        }

        window.global = window;
      },
      { token: authToken, facilityId: FACILITY_ID }
    );
  });

  test("loads vendor dashboard", async ({ page }) => {
    test.skip(!authToken, "Auth token not available - skipping live test");

    await openVendorDashboard(page);
    await expect(
      page.getByText(/Vendor Dashboard|Total Vendors|Vendors/i).first()
    ).toBeVisible();
  });

  test("creates vendor relationship", async ({ page }) => {
    test.skip(!authToken, "Auth token not available - skipping live test");

    await openVendorDashboard(page);

    const vendorName = `Vendor ${Date.now()}`;
    await page
      .getByPlaceholder(/Vendor Name|Vendor|Name|Company/i)
      .first()
      .fill(vendorName);
    await page
      .getByPlaceholder(/Contact Info|Contact/i)
      .first()
      .fill("ops@example.com");
    await page
      .getByText(/Add Vendor|Save|Create/i)
      .first()
      .click();

    await expect(page.getByText(new RegExp(vendorName))).toBeVisible({ timeout: 5000 });
  });
});
