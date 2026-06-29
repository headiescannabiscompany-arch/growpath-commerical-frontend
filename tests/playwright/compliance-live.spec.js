import { test, expect } from "@playwright/test";

const TEST_USER = {
  email: "equiptest@example.com",
  password: "Password123"
};

const FACILITY_ID = "facility-1";

async function openFacilityCompliance(page) {
  await page.goto("/home/facility/compliance");
  await page.waitForTimeout(1000);
}

test.describe("Compliance Features - Live API Integration", () => {
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

  test("loads audit and compliance reporting", async ({ page }) => {
    test.skip(!authToken, "Auth token not available - skipping live test");

    await openFacilityCompliance(page);
    await expect(
      page.getByText(/Compliance|Audit Events|Verification Queue/i).first()
    ).toBeVisible();
  });

  test("creates new SOP template when the control is exposed", async ({ page }) => {
    test.skip(!authToken, "Auth token not available - skipping live test");

    await openFacilityCompliance(page);

    const createBtn = page.getByRole("button", { name: /Create SOP template/i }).first();
    await expect(createBtn).toBeVisible();

    const sopName = `SOP ${Date.now()}`;
    await page
      .getByPlaceholder(/SOP title|SOP|Title|Name|Planting Procedure/i)
      .first()
      .fill(sopName);
    await createBtn.click();

    await expect(page.getByText(new RegExp(sopName))).toBeVisible({ timeout: 5000 });
  });
});
