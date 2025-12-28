import { test, expect } from "@playwright/test";

const TEST_USER = {
  email: "pro@example.com",
  password: "Password123",
  subscriptionStatus: "active"
};

const NEW_POST_TEXT = "Playwright feed story";
const INITIAL_POSTS = [
  {
    _id: "seed-post",
    text: "Existing guild update",
    likeCount: 2,
    user: { username: "Seed User", avatar: null },
    photos: []
  }
];

const NEW_POST = {
  _id: "fresh-post",
  text: NEW_POST_TEXT,
  likeCount: 0,
  user: { username: "Playwright", avatar: null },
  photos: []
};

test.describe("Feed behavior", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.localStorage.setItem("seenOnboardingCarousel", "true");
      window.localStorage.setItem("seenAppIntro", "true");
      window.global = window;
    });
  });

  test("newly created post appears at the top of the feed", async ({ page }) => {
    let feedPosts = [...INITIAL_POSTS];

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
          token: "feed-token",
          user: {
            _id: "user-1",
            email: TEST_USER.email,
            displayName: "Playwright Pro",
            subscriptionStatus: TEST_USER.subscriptionStatus
          }
        });
      }

      if (url.pathname === "/api/subscribe/status") {
        return fulfillJson(route, { success: true, status: TEST_USER.subscriptionStatus });
      }

      if (url.pathname === "/api/posts/feed") {
        const currentPage = Number(url.searchParams.get("page") || "1");
        const start = (currentPage - 1) * 15;
        const end = start + 15;
        return fulfillJson(route, feedPosts.slice(start, end));
      }

      if (url.pathname === "/api/posts" && method === "POST") {
        feedPosts = [NEW_POST, ...feedPosts];
        return fulfillJson(route, NEW_POST);
      }

      if (url.pathname === "/api/posts/trending") {
        return fulfillJson(route, []);
      }

      if (url.pathname === "/api/plants") {
        return fulfillJson(route, []);
      }

      return fulfillJson(route, { success: true });
    });

    await page.goto("/");

    await page.waitForFunction(() => typeof globalThis.__NAV__ !== "undefined");

    const loginResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/auth/login") &&
        response.request().method() === "POST"
    );

    await page.getByPlaceholder("Email").fill(TEST_USER.email);
    await page.getByPlaceholder("Password").fill(TEST_USER.password);
    await page.getByRole("button", { name: /login/i }).click();
    await loginResponse;

    await page.getByText("Quick Actions").waitFor();

    await page.evaluate(() => {
      globalThis.__NAV__?.navigate("Feed");
    });

    await expect(page.getByTestId("feed-card-seed-post")).toBeVisible();

    await page.getByTestId("feed-create-post").click();

    await page.getByPlaceholder("Say something about your grow...").fill(NEW_POST_TEXT);

    await page.getByTestId("create-post-submit").click();

    await expect(page.getByTestId("feed-card-fresh-post")).toBeVisible();
    await expect(page.locator('[data-testid^="feed-card-"]').first()).toContainText(
      NEW_POST_TEXT
    );
  });
});
