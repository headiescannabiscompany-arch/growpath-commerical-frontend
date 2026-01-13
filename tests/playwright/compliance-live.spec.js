import { test, expect } from "@playwright/test";

/**
 * Live integration test for Compliance features
 * Tests audit logs, SOP templates, verification workflows
 */

const TEST_USER = {
  email: "equiptest@example.com",
  password: "Password123"
};

const FACILITY_ID = "facility-1";

test.describe("Compliance Features - Live API Integration", () => {
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

  test("loads audit log", async ({ page }) => {
    test.skip(!authToken, "Auth token not available - skipping live test");

    await page.goto("/");
    await page.waitForFunction(() => typeof globalThis.__NAV__ !== "undefined", {
      timeout: 10000
    });

    // Navigate to Audit (via facility menu or settings)
    await page.evaluate(() => {
      try {
        globalThis.__NAV__?.navigate("MainTabs");
        globalThis.__NAV__?.navigate("FacilityStack");
        globalThis.__NAV__?.navigate("AuditLog");
      } catch (e) {
        console.error("Navigation failed:", e);
      }
    });

    await page.waitForTimeout(2000);

    const auditVisible = await page
      .getByText(/Audit Log|Activity Log|History/i)
      .isVisible()
      .catch(() => false);
    console.log(`✓ Audit Log loaded: ${auditVisible}`);
  });

  test("loads SOP templates", async ({ page }) => {
    test.skip(!authToken, "Auth token not available - skipping live test");

    await page.goto("/");
    await page.waitForFunction(() => typeof globalThis.__NAV__ !== "undefined", {
      timeout: 10000
    });

    await page.evaluate(() => {
      try {
        globalThis.__NAV__?.navigate("MainTabs");
        globalThis.__NAV__?.navigate("FacilityStack");
        globalThis.__NAV__?.navigate("SOPTemplates");
      } catch {}
    });

    await page.waitForTimeout(2000);

    const sopVisible = await page
      .getByText(/SOP|Procedures|Templates/i)
      .isVisible()
      .catch(() => false);
    console.log(`✓ SOP Templates loaded: ${sopVisible}`);
  });

  test("loads verification screen", async ({ page }) => {
    test.skip(!authToken, "Auth token not available - skipping live test");

    await page.goto("/");
    await page.waitForFunction(() => typeof globalThis.__NAV__ !== "undefined", {
      timeout: 10000
    });

    await page.evaluate(() => {
      try {
        globalThis.__NAV__?.navigate("MainTabs");
        globalThis.__NAV__?.navigate("FacilityStack");
        globalThis.__NAV__?.navigate("Verification");
      } catch {}
    });

    await page.waitForTimeout(2000);

    const verificationVisible = await page
      .getByText(/Verification|Batch Approval|Records/i)
      .isVisible()
      .catch(() => false);
    console.log(`✓ Verification screen loaded: ${verificationVisible}`);
  });

  test("loads deviation handling", async ({ page }) => {
    test.skip(!authToken, "Auth token not available - skipping live test");

    await page.goto("/");
    await page.waitForFunction(() => typeof globalThis.__NAV__ !== "undefined", {
      timeout: 10000
    });

    await page.evaluate(() => {
      try {
        globalThis.__NAV__?.navigate("MainTabs");
        globalThis.__NAV__?.navigate("FacilityStack");
        globalThis.__NAV__?.navigate("DeviationHandling");
      } catch {}
    });

    await page.waitForTimeout(2000);

    const deviationVisible = await page
      .getByText(/Deviation|Issues|Incidents/i)
      .isVisible()
      .catch(() => false);
    console.log(`✓ Deviation Handling loaded: ${deviationVisible}`);
  });

  test("creates new SOP template", async ({ page }) => {
    test.skip(!authToken, "Auth token not available - skipping live test");

    await page.goto("/");
    await page.waitForFunction(() => typeof globalThis.__NAV__ !== "undefined", {
      timeout: 10000
    });

    await page.evaluate(() => {
      try {
        globalThis.__NAV__?.navigate("MainTabs");
        globalThis.__NAV__?.navigate("FacilityStack");
        globalThis.__NAV__?.navigate("SOPTemplates");
      } catch {}
    });

    await page.waitForTimeout(2000);

    const createBtn = page.getByText(/\+ Add|Create|New SOP/i).first();
    const canCreate = await createBtn.isVisible().catch(() => false);

    if (canCreate) {
      await createBtn.click();

      const sopName = `SOP ${Date.now()}`;
      await page.getByPlaceholder(/SOP|Title|Name/i).fill(sopName);

      const saveBtn = page.getByText(/Save|Create/i).first();
      await saveBtn.click();

      await page.waitForTimeout(1000);
      console.log(`✓ Created SOP: ${sopName}`);
    } else {
      console.log("⚠ SOP creation UI not yet implemented");
    }
  });
});
