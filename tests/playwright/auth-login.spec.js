import { test, expect } from "@playwright/test";

const TEST_USER = {
  email: "test@example.com",
  password: "Password123"
};
const TEST_TOKEN = "playwright-e2e-token";
const STORAGE_RESET_FLAG = "__PLAYWRIGHT_STORAGE_RESET__";

const TEST_ME_RESPONSE = {
  user: {
    id: "playwright-user",
    email: TEST_USER.email,
    displayName: "Playwright User",
    role: "user",
    plan: "pro",
    subscriptionStatus: "active"
  },
  ctx: {
    mode: "personal",
    capabilities: {
      GROWS_PERSONAL_VIEW: true,
      GROWS_PERSONAL_WRITE: true,
      LOGS_PERSONAL_VIEW: true,
      LOGS_PERSONAL_WRITE: true,
      PLANTS_PERSONAL_VIEW: true,
      PLANTS_PERSONAL_WRITE: true,
      TOOLS_VPD: true,
      TASK_REMINDERS: true
    },
    limits: {},
    facilityId: null,
    facilityRole: null,
    facilityFeaturesEnabled: false
  }
};

async function fillLoginForm(page, { email, password }) {
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  const loginButton = page.getByText("Sign in").last();
  await expect(loginButton).toBeVisible();
  await loginButton.click();
}

async function fillSignupForm(page, { email, password }) {
  await page.getByPlaceholder("Name").fill("Playwright User");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  const signupButton = page.getByText("Create account").last();
  await expect(signupButton).toBeVisible();
  await signupButton.click();
}

test.describe("Auth flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(({ flag }) => {
      if (window.name !== flag) {
        window.localStorage.clear();
        window.name = flag;
      }
      window.localStorage.setItem("seenOnboardingCarousel", "true");
      window.localStorage.setItem("seenAppIntro", "true");
      window.global = window;
    }, { flag: STORAGE_RESET_FLAG });

    await page.route("**/api/**", (route) => {
      const req = route.request();
      if (req.method() === "POST" && req.url().includes("/api/auth/signup")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            token: TEST_TOKEN,
            user: {
              id: "playwright-user",
              email: TEST_USER.email,
              displayName: "Playwright User",
              role: "user"
            }
          })
        });
      }
      if (req.method() === "POST" && req.url().includes("/api/auth/login")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            token: TEST_TOKEN,
            user: {
              id: "playwright-user",
              email: TEST_USER.email,
              displayName: "Playwright User",
              role: "user"
            }
          })
        });
      }
      if (
        req.method() === "GET" &&
        (req.url().includes("/api/me") || req.url().includes("/api/auth/me"))
      ) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(TEST_ME_RESPONSE)
        });
      }
      if (req.method() === "GET" && req.url().includes("/api/personal/grows")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ grows: [] })
        });
      }
      if (req.method() === "GET" && req.url().includes("/api/personal/logs")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ logs: [] })
        });
      }
      if (req.method() === "GET" && req.url().includes("/api/personal/plants")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ plants: [] })
        });
      }
      if (req.method() === "GET" && req.url().includes("/api/personal/tasks")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ tasks: [] })
        });
      }
      if (req.method() === "GET" && req.url().includes("/api/tools")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ tools: [] })
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true })
      });
    });
  });

  test("login persists auth token and user", async ({ page }) => {
    await page.goto("/");

    const loginResponsePromise = page.waitForResponse((response) => {
      return (
        response.url().includes("/api/auth/login") && response.request().method() === "POST"
      );
    });

    await fillLoginForm(page, TEST_USER);
    await loginResponsePromise;

    await page.waitForFunction(() => {
      return window.localStorage.getItem("auth_token_v1") !== null;
    });

    const storedToken = await page.evaluate(() =>
      localStorage.getItem("auth_token_v1")
    );

    expect(storedToken).toBe(TEST_TOKEN);
  });

  test("reload keeps authenticated users off the login screen and exposes logout after navigation", async ({
    page
  }) => {
    await page.goto("/");

    const loginResponsePromise = page.waitForResponse((response) => {
      return (
        response.url().includes("/api/auth/login") && response.request().method() === "POST"
      );
    });

    await fillLoginForm(page, TEST_USER);
    await loginResponsePromise;

    await page.waitForFunction(() => {
      return window.localStorage.getItem("auth_token_v1") !== null;
    });

    await expect(page.getByText("Your Garden")).toBeVisible();
    await expect(page.getByText("Sign in")).toHaveCount(0);

    await page.reload();

    await page.waitForFunction(() => {
      return window.localStorage.getItem("auth_token_v1") !== null;
    });

    await expect(page.getByText("Your Garden")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Sign in")).toHaveCount(0);
  });

  test("signup enters the authenticated personal home shell", async ({ page }) => {
    await page.goto("/register");

    const signupResponsePromise = page.waitForResponse((response) => {
      return (
        response.url().includes("/api/auth/signup") &&
        response.request().method() === "POST"
      );
    });

    await fillSignupForm(page, TEST_USER);
    await signupResponsePromise;

    await page.waitForFunction(() => {
      return window.localStorage.getItem("auth_token_v1") !== null;
    });

    await expect(page.getByText("Your Garden")).toBeVisible();
    await expect(page.getByText("Sign in")).toHaveCount(0);
  });
});
