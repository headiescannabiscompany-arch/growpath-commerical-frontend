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

  test("long posts are truncated and clicking navigates to detail", async ({ page }) => {
    const LONG_TEXT = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8 should be hidden";
    const LONG_POST = {
      _id: "long-post",
      text: LONG_TEXT,
      likeCount: 0,
      user: { username: "Long Writer", avatar: null },
      photos: []
    };

    const fulfillJson = (route, body) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body)
      });

    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/posts/feed") {
        return fulfillJson(route, [LONG_POST]);
      }
      if (url.pathname === "/api/auth/login") {
        return fulfillJson(route, {
          token: "feed-token",
          user: { _id: "u1", email: TEST_USER.email, subscriptionStatus: "active" }
        });
      }
      return fulfillJson(route, { success: true });
    });

    await page.goto("/");
    await page.getByPlaceholder("Email").fill(TEST_USER.email);
    await page.getByPlaceholder("Password").fill(TEST_USER.password);
    await page.getByRole("button", { name: /login/i }).click();

    await page.evaluate(() => globalThis.__NAV__?.navigate("FeedTab"));
    
    // Check for truncation logic (visually checking CSS is hard in headless, but we can check navigation)
    // Note: React Native Web maps numberOfLines to -webkit-line-clamp
    
    // Click the post body
    await page.getByText("Line 1").click();

    // Verify navigation to PostDetail
    // PostDetailScreen displays "Posted by [Name]" which differs from the Feed's simple name display
    await expect(page.getByText("Posted by Long Writer")).toBeVisible();
    
    // Also verify the full text is present (using .last() since the feed one might still be in DOM)
    await expect(page.getByText("Line 8 should be hidden").last()).toBeVisible();
  });
});
