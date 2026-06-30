import { expect, test } from "@playwright/test";

const POST_ID = "forum-post-report-1";

function fulfillJson(route: any, body: any, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  });
}

async function installMocks(page: any) {
  let reportCalls = 0;
  await page.addInitScript(() => {
    window.localStorage.setItem("auth_token_v1", "forum-report-token");
    window.localStorage.setItem("seenOnboardingCarousel", "true");
    window.localStorage.setItem("seenAppIntro", "true");
    window.global = window;
  });

  await page.exposeFunction("getReportCalls", () => reportCalls);

  await page.route("**/api/**", async (route: any) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (
      method === "GET" &&
      (url.pathname === "/api/me" || url.pathname === "/api/auth/me")
    ) {
      return fulfillJson(route, {
        user: {
          id: "forum-report-user",
          email: "forum-report@example.com",
          plan: "pro"
        },
        ctx: {
          mode: "personal",
          plan: "pro",
          subscriptionStatus: "active",
          capabilities: {
            FORUM_VIEW: true,
            FORUM_POST: true
          },
          limits: {}
        }
      });
    }

    if (method === "GET" && url.pathname === `/api/forum/${POST_ID}`) {
      return fulfillJson(route, {
        _id: POST_ID,
        title: "Leaf spot question",
        body: "Seeing spots and want a second opinion.",
        author: { name: "Community member" },
        likeCount: 2,
        createdAt: "2026-06-30T00:00:00.000Z"
      });
    }

    if (method === "GET" && url.pathname === `/api/forum/${POST_ID}/comments`) {
      return fulfillJson(route, []);
    }

    if (method === "POST" && url.pathname === `/api/forum/report/${POST_ID}`) {
      reportCalls += 1;
      return fulfillJson(route, {
        message: "Reported",
        reportId: "report-1",
        moderationStatus: "reported"
      });
    }

    return fulfillJson(route, { ok: true });
  });
}

test.describe("forum moderation report action", () => {
  for (const size of [
    { name: "desktop", width: 1280, height: 900 },
    { name: "mobile", width: 390, height: 900 }
  ]) {
    test(`reports a forum post on ${size.name}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await installMocks(page);

      await page.goto(`/home/personal/forum/post/${POST_ID}`, {
        waitUntil: "domcontentloaded"
      });

      await expect(page.getByText("Leaf spot question")).toBeVisible();
      await expect(page.getByRole("button", { name: "Report forum post" })).toBeVisible();
      await page.getByRole("button", { name: "Report forum post" }).click();
      await expect(page.getByText("Report sent for moderation review.")).toBeVisible();
      await expect(await page.evaluate(() => (window as any).getReportCalls())).toBe(1);

      await page.screenshot({
        path: `tmp/screenshots/forum-report-${size.name}.png`,
        fullPage: true
      });
    });
  }
});
