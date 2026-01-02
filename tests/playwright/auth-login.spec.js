import { test, expect } from "@playwright/test";

const TEST_USER = {
  email: "test@example.com",
  password: "Password123"
};
const STORAGE_RESET_FLAG = "__PLAYWRIGHT_STORAGE_RESET__";

async function fillLoginForm(page, { email, password }) {
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  const loginButton = page.getByRole("button", { name: /login/i });
  await expect(loginButton).toBeVisible();
  await loginButton.click();
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
            token: "playwright-token",
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
            token: "e2e-token",
            user: {
              id: "playwright-user",
              email: TEST_USER.email,
              displayName: "Playwright User",
              role: "user"
            }
          })
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

    await page.waitForFunction(
      ({ email }) => {
        const token = globalThis.authToken;
        const user = globalThis.user;
        return token === "e2e-token" && user?.email === email;
      },
      { email: TEST_USER.email },
      { timeout: 10000 }
    );

    await page.waitForFunction(() => {
      return (
        window.localStorage.getItem("token") !== null &&
        window.localStorage.getItem("user") !== null
      );
    });

    const storedToken = await page.evaluate(() => localStorage.getItem("token"));
    const storedUser = await page.evaluate(() => localStorage.getItem("user"));

    expect(storedToken).toBe("e2e-token");
    expect(storedUser).not.toBeNull();

    const parsedUser = storedUser ? JSON.parse(storedUser) : null;
    expect(parsedUser?.email).toBe(TEST_USER.email);

    const authSnapshot = await page.evaluate(() => ({
      token: globalThis.authToken,
      user: globalThis.user
    }));

    expect(authSnapshot.token).toBe("e2e-token");
    expect(authSnapshot.user?.email).toBe(TEST_USER.email);
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

    await page.waitForFunction(
      ({ email }) =>
        globalThis.authToken === "e2e-token" && globalThis.user?.email === email,
      { email: TEST_USER.email }
    );

    await expect(page.getByTestId("dashboard-screen")).toBeVisible();
    await expect(page.getByText(/Welcome back/i)).toBeVisible();
    await expect(page.getByTestId("logout-button")).toHaveCount(0);

    await page.reload();

    await page.waitForFunction(
      ({ email }) =>
        globalThis.authToken === "e2e-token" && globalThis.user?.email === email,
      { email: TEST_USER.email }
    );

    await expect(page.getByTestId("dashboard-screen")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Welcome back/i)).toBeVisible();
    await expect(page.getByTestId("logout-button")).toHaveCount(0);

    await page.evaluate(() => {
      const scrollEl = document.querySelector('[data-testid="dashboard-scroll"]');
      scrollEl?.scrollTo(0, 600);
    });

    await page.getByTestId("tab-plants").click();
    await expect(page.getByText("Your Plants")).toBeVisible();

    await page.getByTestId("tab-home").click();
    await expect(page.getByText("GrowPath")).toBeVisible();
    await expect(page.getByTestId("logout-button")).toBeVisible();

    const scrollPosition = await page.evaluate(() => {
      const scrollEl = document.querySelector('[data-testid="dashboard-scroll"]');
      return scrollEl?.scrollTop || 0;
    });
    expect(scrollPosition).toBeLessThanOrEqual(1);

    await page.getByTestId("tab-plants").click();
    await expect(page.getByText("Your Plants")).toBeVisible();

    await page.evaluate(() => {
      const scrollEl = document.querySelector('[data-testid="growlogs-scroll"]');
      scrollEl?.scrollTo(0, 800);
    });

    await page.getByTestId("tab-plants").click();

    const growLogScroll = await page.evaluate(() => {
      const scrollEl = document.querySelector('[data-testid="growlogs-scroll"]');
      return scrollEl?.scrollTop || 0;
    });
    expect(growLogScroll).toBeLessThanOrEqual(1);

    await page.getByTestId("tab-home").click();
    await page.getByTestId("logout-button").click();
    await expect(page.getByTestId("login-form")).toBeVisible();
  });
});
