import { expect, test } from "@playwright/test";

const GROW_ID = "grow-task-actions-1";

function fulfillJson(route: any, body: any, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  });
}

async function installMocks(page: any) {
  const patches: any[] = [];
  const tasks: any[] = [
    {
      id: "task-open-1",
      growId: GROW_ID,
      title: "Inspect olive leaf spots",
      description: "Check undersides and recent watering before diagnosis follow-up.",
      dueDate: "2026-07-02T08:00:00.000Z",
      completed: false,
      priority: "high",
      sourceType: "ai_diagnosis",
      sourceObjectId: "diag-olive-1",
      createdAt: "2026-07-01T08:00:00.000Z"
    },
    {
      id: "task-done-1",
      growId: GROW_ID,
      title: "Review saved VPD run",
      description: "Completed from tool result.",
      dueDate: "2026-07-01T08:00:00.000Z",
      completed: true,
      priority: "medium",
      sourceToolRunId: "toolrun-vpd-1",
      createdAt: "2026-07-01T07:00:00.000Z"
    }
  ];

  await page.addInitScript(() => {
    window.localStorage.setItem("auth_token_v1", "personal-task-actions-token");
    window.localStorage.setItem("seenOnboardingCarousel", "true");
    window.localStorage.setItem("seenAppIntro", "true");
    window.global = window;
  });

  await page.route("**/api/**", async (route: any) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (
      method === "GET" &&
      (url.pathname === "/api/me" || url.pathname === "/api/auth/me")
    ) {
      return fulfillJson(route, {
        user: { id: "task-user", email: "task@example.com", plan: "pro" },
        ctx: {
          mode: "personal",
          plan: "pro",
          subscriptionStatus: "active",
          capabilities: {
            GROWS_PERSONAL_VIEW: true,
            GROWS_PERSONAL_WRITE: true
          },
          limits: {}
        }
      });
    }

    if (method === "GET" && url.pathname === "/api/personal/tasks") {
      return fulfillJson(route, {
        tasks: tasks.filter(
          (task) => task.growId === (url.searchParams.get("growId") || GROW_ID)
        )
      });
    }

    if (method === "PATCH" && url.pathname.startsWith("/api/personal/tasks/")) {
      const id = decodeURIComponent(url.pathname.split("/").pop() || "");
      const payload = request.postDataJSON();
      patches.push({ id, payload });
      const index = tasks.findIndex((task) => task.id === id);
      if (index >= 0) {
        tasks[index] = { ...tasks[index], ...payload };
        return fulfillJson(route, { task: tasks[index] });
      }
      return fulfillJson(route, { message: "not found" }, 404);
    }

    return fulfillJson(route, { ok: true });
  });

  return { patches, tasks };
}

test.describe("personal grow task actions", () => {
  for (const size of [
    { name: "desktop", width: 1280, height: 900 },
    { name: "mobile", width: 390, height: 900 }
  ]) {
    test(`complete, reopen, and snooze update grow tasks on ${size.name}`, async ({
      page
    }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      const api = await installMocks(page);

      await page.goto(`/home/personal/grows/${GROW_ID}/tasks`, {
        waitUntil: "domcontentloaded"
      });

      await expect(page.getByText("Inspect olive leaf spots")).toBeVisible();
      await expect(page.getByText("Source: ai diagnosis")).toBeVisible();
      await expect(page.getByText("Done: Review saved VPD run")).toBeVisible();
      await expect(page.getByText("Source: tool run")).toBeVisible();

      await page.getByRole("button", { name: "Complete task" }).click();
      await expect(page.getByText("Task completed.")).toBeVisible();
      await expect(page.getByText("Done: Inspect olive leaf spots")).toBeVisible();

      await page.getByRole("button", { name: "Reopen task" }).first().click();
      await expect(page.getByText("Task reopened.")).toBeVisible();
      await expect(page.getByText("Inspect olive leaf spots").first()).toBeVisible();

      await page.getByRole("button", { name: "Snooze task one day" }).click();
      await expect(page.getByText("Task snoozed until tomorrow.")).toBeVisible();
      await expect(page.getByText(/Snoozed until:/)).toBeVisible();

      expect(api.patches).toEqual(
        expect.arrayContaining([
          { id: "task-open-1", payload: { completed: true } },
          { id: "task-open-1", payload: { completed: false } },
          {
            id: "task-open-1",
            payload: expect.objectContaining({ snoozeUntil: expect.any(String) })
          }
        ])
      );

      await page.screenshot({
        path: `tmp/screenshots/personal-task-actions-${size.name}.png`,
        fullPage: true
      });
    });
  }
});
