import { expect, test } from "@playwright/test";

function fulfillJson(route: any, body: any, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  });
}

test("personal Forum renders linked quick actions without a web style crash", async ({
  page
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.addInitScript(() => {
    window.localStorage.setItem("auth_token_v1", "community-route-token");
    window.localStorage.setItem("seenOnboardingCarousel", "true");
    window.localStorage.setItem("seenAppIntro", "true");
    window.global = window;
  });

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (
      request.method() === "GET" &&
      (url.pathname === "/api/me" || url.pathname === "/api/auth/me")
    ) {
      return fulfillJson(route, {
        user: {
          id: "community-route-user",
          email: "community-route@example.com",
          plan: "pro"
        },
        ctx: {
          mode: "personal",
          plan: "pro",
          subscriptionStatus: "active",
          capabilities: {
            FORUM_VIEW: true,
            FORUM_POST: true,
            GROWS_PERSONAL_VIEW: true
          },
          limits: {}
        }
      });
    }

    if (request.method() === "GET" && url.pathname === "/api/forum/feed/latest") {
      return fulfillJson(route, {
        posts: [
          {
            id: "community-route-thread",
            title: "Community route verification",
            body: "Forum content remains visible after its data finishes loading.",
            author: { displayName: "GrowPath QA" },
            growInterests: ["Vegetables"],
            commentCount: 0,
            createdAt: "2026-08-02T20:00:00.000Z"
          }
        ]
      });
    }

    if (request.method() === "GET" && url.pathname === "/api/guilds") {
      return fulfillJson(route, { guilds: [] });
    }

    return fulfillJson(route, { items: [] });
  });

  await page.goto("/home/personal/community", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Forum / Q&A" })).toBeVisible();
  await expect(page.getByText("Community route verification")).toBeVisible();
  await expect(page.getByLabel("Ask forum for diagnosis help")).toBeVisible();
  await expect(page.getByLabel("Share a grow update to forum")).toBeVisible();
  await expect(page.getByRole("tab")).toHaveCount(6);
  await expect(page.getByRole("tab", { name: "Forum" })).toBeVisible();
  expect(pageErrors).toEqual([]);
});
