import { test, expect } from "@playwright/test";

const TEST_USER = {
  email: "dashboard-feed@example.com",
  password: "Password123",
  subscriptionStatus: "active"
};

const FEED_POSTS = [
  {
    _id: "post-1",
    text: "First dashboard feed post",
    createdAt: new Date().toISOString(),
    user: { username: "Creator 1", avatar: null },
    photos: []
  },
  {
    _id: "post-2",
    text: "Second dashboard feed post",
    createdAt: new Date().toISOString(),
    user: { username: "Creator 2", avatar: null },
    photos: []
  }
];

test.describe("Dashboard Feed E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.localStorage.setItem("seenOnboardingCarousel", "true");
      window.localStorage.setItem("seenAppIntro", "true");
      window.global = window;
    });
  });

  test("feed posts are rendered on the dashboard", async ({ page }) => {
    const fulfillJson = (route, body) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body)
      });

    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      const method = route.request().method();

      if (method === "POST" && url.pathname === "/api/auth/login") {
        return fulfillJson(route, {
          token: "db-feed-token",
          user: {
            _id: "user-df",
            email: TEST_USER.email,
            displayName: "Dashboard Tester",
            subscriptionStatus: TEST_USER.subscriptionStatus
          }
        });
      }

      if (url.pathname === "/api/posts/feed") {
        return fulfillJson(route, FEED_POSTS);
      }

      if (url.pathname === "/api/posts/trending") {
        return fulfillJson(route, []);
      }

      if (url.pathname === "/api/plants") {
        return fulfillJson(route, []);
      }

      if (url.pathname === "/api/subscribe/status") {
        return fulfillJson(route, { success: true, status: TEST_USER.subscriptionStatus });
      }

      return fulfillJson(route, { success: true });
    });

    await page.goto("/");

    // Login
    await page.getByPlaceholder("Email").fill(TEST_USER.email);
    await page.getByPlaceholder("Password").fill(TEST_USER.password);
    await page.getByRole("button", { name: /login/i }).click();

    // Verify on Dashboard
    await page.getByText("Latest Updates").waitFor();
    
    // Verify feed posts are rendered
    await expect(page.getByText("First dashboard feed post")).toBeVisible();
    await expect(page.getByText("Second dashboard feed post")).toBeVisible();
    await expect(page.getByText("Creator 1")).toBeVisible();
    await expect(page.getByText("Creator 2")).toBeVisible();

    // Verify AI Tokens are NOT on the dashboard
    await expect(page.getByText("AI Tokens", { exact: true })).not.toBeVisible();
  });

  test("AI Tokens are visible on the profile screen", async ({ page }) => {
    const fulfillJson = (route, body) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body)
      });

    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      const method = route.request().method();

      if (method === "POST" && url.pathname === "/api/auth/login") {
        return fulfillJson(route, {
          token: "db-feed-token",
          user: {
            _id: "user-df",
            email: TEST_USER.email,
            username: "tester",
            displayName: "Dashboard Tester",
            subscriptionStatus: TEST_USER.subscriptionStatus
          }
        });
      }

      if (url.pathname.includes("/api/user/profile/")) {
        return fulfillJson(route, {
          user: {
            _id: "user-df",
            username: "tester",
            subscriptionStatus: TEST_USER.subscriptionStatus,
            followers: [],
            following: [],
            preferences: {}
          },
          posts: [],
          growlogs: [],
          courses: []
        });
      }

      if (url.pathname === "/api/tokens/balance") {
        return fulfillJson(route, { aiTokens: 50, maxTokens: 100 });
      }

      return fulfillJson(route, { success: true });
    });

    await page.goto("/");

    // Login
    await page.getByPlaceholder("Email").fill(TEST_USER.email);
    await page.getByPlaceholder("Password").fill(TEST_USER.password);
    await page.getByRole("button", { name: /login/i }).click();

    await page.getByText("Quick Actions").waitFor();

    // Navigate to Profile
    await page.evaluate(() => {
      globalThis.__NAV__?.navigate("ProfileTab");
    });

    // Verify AI Tokens are on the profile
    await expect(page.getByText("AI Tokens", { exact: true })).toBeVisible();
    await expect(page.getByText("50 / 100")).toBeVisible();
  });

  test("Feed tab visibility based on Pro status", async ({ page }) => {
    const fulfillJson = (route, body) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body)
      });

    let currentIsPro = false;

    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      const method = route.request().method();

      if (method === "POST" && url.pathname === "/api/auth/login") {
        return fulfillJson(route, {
          token: "visibility-token",
          user: {
            _id: "user-v",
            email: TEST_USER.email,
            subscriptionStatus: currentIsPro ? "active" : "free"
          }
        });
      }

      if (url.pathname === "/api/subscribe/status") {
        return fulfillJson(route, { success: true, status: currentIsPro ? "active" : "free" });
      }

      return fulfillJson(route, { success: true });
    });

    // 1. Check as Non-Pro
    currentIsPro = false;
    await page.goto("/");
    await page.getByPlaceholder("Email").fill(TEST_USER.email);
    await page.getByPlaceholder("Password").fill(TEST_USER.password);
    await page.getByRole("button", { name: /login/i }).click();
    await page.getByText("Quick Actions").waitFor();

    // In React Native web, tabs are rendered. We check for the testID "tab-feed" or text "Feed"
    await expect(page.getByTestId("tab-feed")).not.toBeVisible();

    // 2. Check as Pro
    await page.evaluate(() => window.localStorage.clear());
    currentIsPro = true;
    await page.goto("/");
    await page.getByPlaceholder("Email").fill(TEST_USER.email);
    await page.getByPlaceholder("Password").fill(TEST_USER.password);
    await page.getByRole("button", { name: /login/i }).click();
    await page.getByText("Quick Actions").waitFor();

    await expect(page.getByTestId("tab-feed")).toBeVisible();
  });
});
