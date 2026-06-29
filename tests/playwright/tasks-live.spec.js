import { test, expect } from "@playwright/test";

const TEST_USER = {
  email: "equiptest@example.com",
  password: "Password123"
};

const FACILITY_ID = "facility-1";

async function openFacilityTasks(page) {
  await page.goto("/home/facility/tasks");
  await page.waitForTimeout(1000);
}

test.describe("Tasks Management - Live API Integration", () => {
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

  test("loads task list", async ({ page }) => {
    test.skip(!authToken, "Auth token not available - skipping live test");

    await openFacilityTasks(page);
    await expect(
      page.getByText(/Tasks|Facility Tasks|No tasks yet/i).first()
    ).toBeVisible();
  });

  test("creates new task", async ({ page }) => {
    test.skip(!authToken, "Auth token not available - skipping live test");

    await openFacilityTasks(page);

    const createBtn = page.getByRole("button", { name: /Create facility task/i }).first();
    await expect(createBtn).toBeVisible();

    const taskName = `Task ${Date.now()}`;
    await page
      .getByPlaceholder(/Task title|New task title/i)
      .first()
      .fill(taskName);
    await createBtn.click();

    await expect(page.getByText(new RegExp(taskName))).toBeVisible({ timeout: 5000 });
  });

  test("marks task as complete when a pending task exists", async ({ page }) => {
    test.skip(!authToken, "Auth token not available - skipping live test");

    await openFacilityTasks(page);

    const completeBtn = page
      .getByRole("button", { name: /Complete|Done|Mark Done/i })
      .first();
    if (await completeBtn.isVisible().catch(() => false)) {
      await completeBtn.click();
      await expect(page.getByText(/Completed|\[Done\]/i).first()).toBeVisible({
        timeout: 5000
      });
    } else {
      await expect(
        page.getByText(/No tasks yet|Tasks|Facility Tasks/i).first()
      ).toBeVisible();
    }
  });
});
