import { expect, test } from "@playwright/test";

const FREE_USER = {
  id: "free-user",
  email: "free-grower@example.com",
  password: "Password123",
  plan: "free"
};

const PRO_USER = {
  id: "pro-user",
  email: "pro-grower@example.com",
  password: "Password123",
  plan: "pro"
};

const BASE_GROW = {
  id: "existing-grow",
  name: "Existing Grow",
  status: "vegetating",
  updatedAt: "2026-02-01T00:00:00.000Z"
};

function userCtx(user: typeof FREE_USER | typeof PRO_USER) {
  const pro = user.plan === "pro";
  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: pro ? "Pro Grower" : "Free Grower",
      role: "user",
      plan: user.plan,
      subscriptionStatus: pro ? "active" : "free"
    },
    ctx: {
      mode: "personal",
      plan: user.plan,
      subscriptionStatus: pro ? "active" : "free",
      capabilities: {
        GROWS_PERSONAL_VIEW: true,
        GROWS_PERSONAL_WRITE: pro,
        LOGS_PERSONAL_VIEW: true,
        LOGS_PERSONAL_WRITE: true,
        PLANTS_PERSONAL_VIEW: true,
        PLANTS_PERSONAL_WRITE: pro,
        GROWLOGS_MULTI: pro
      },
      limits: {
        maxGrows: pro ? 999 : 1,
        maxPlants: pro ? 999 : 1
      }
    }
  };
}

async function installPersonalAuthMocks(
  page: any,
  user: typeof FREE_USER | typeof PRO_USER
) {
  let grows = [{ ...BASE_GROW }];
  let createCount = 0;
  const token = `${user.plan}-playwright-auth-token`;

  await page.addInitScript((authToken) => {
    window.localStorage.clear();
    window.localStorage.setItem("auth_token_v1", authToken);
    window.localStorage.setItem("seenOnboardingCarousel", "true");
    window.localStorage.setItem("seenAppIntro", "true");
    window.global = window;
  }, token);

  const fulfillJson = (route: any, body: any, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body)
    });

  await page.route("**/api/**", async (route: any) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (method === "POST" && url.pathname === "/api/auth/login") {
      return fulfillJson(route, {
        token,
        user: userCtx(user).user
      });
    }

    if (
      method === "GET" &&
      (url.pathname === "/api/me" || url.pathname === "/api/auth/me")
    ) {
      return fulfillJson(route, userCtx(user));
    }

    if (method === "GET" && url.pathname === "/api/personal/grows") {
      return fulfillJson(route, { grows });
    }

    if (method === "POST" && url.pathname === "/api/personal/grows") {
      createCount += 1;
      if (user.plan === "free" && grows.length >= 1) {
        return fulfillJson(
          route,
          {
            code: "UPGRADE_REQUIRED",
            message: "Upgrade Required: Free plans are limited to one grow."
          },
          403
        );
      }

      const payload = request.postDataJSON();
      const created = {
        id: `${user.plan}-grow-${createCount}`,
        name: payload.name,
        status: "vegetating",
        updatedAt: "2026-02-02T00:00:00.000Z"
      };
      grows = [created, ...grows];
      return fulfillJson(route, { created });
    }

    if (
      [
        "/api/personal/logs",
        "/api/personal/plants",
        "/api/personal/tasks",
        "/api/tools"
      ].includes(url.pathname)
    ) {
      return fulfillJson(route, {
        items: [],
        logs: [],
        plants: [],
        tasks: [],
        tools: []
      });
    }

    return fulfillJson(route, { success: true });
  });
}

async function bootstrapAs(page: any, user: typeof FREE_USER | typeof PRO_USER) {
  await page.goto("/home/personal", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(new RegExp(`${user.plan} plan`, "i"))).toBeVisible({
    timeout: 15000
  });
}

async function openNewGrowForm(page: any) {
  await page.goto("/home/personal/grows");
  await expect(page.getByTestId("screen-personal-grows")).toBeVisible();
  await page.getByTestId("btn-new-grow").click();
  await expect(page.getByRole("heading", { name: "New Grow" })).toBeVisible();
}

async function submitGrow(page: any, name: string) {
  await page.getByTestId("input-grow-name").fill(name);
  await page.getByTestId("input-grow-anchor-date").fill("2026-02-27");
  const submit = page.getByText("Create grow").last();
  await expect(submit).toBeVisible();
  await submit.click();
}

test.describe("GrowLogsScreen Free/Pro auth setup", () => {
  test("Free user is authenticated with free limits and cannot create a second grow", async ({
    page
  }) => {
    await installPersonalAuthMocks(page, FREE_USER);
    await bootstrapAs(page, FREE_USER);

    await page.goto("/home/personal/grows");
    await expect(page.getByTestId("screen-personal-grows")).toBeVisible();
    await expect(page.getByText("Create grows with Pro")).toBeVisible();
    await expect(page.getByText("Free accounts can browse saved grows.")).toBeVisible();
    await expect(page.getByTestId("btn-new-grow")).toHaveCount(0);
  });

  test("Pro user is authenticated with multi-grow capability and can create another grow", async ({
    page
  }) => {
    await installPersonalAuthMocks(page, PRO_USER);
    await bootstrapAs(page, PRO_USER);

    await openNewGrowForm(page);
    await submitGrow(page, "Pro Second Grow");

    await expect(page.getByRole("heading", { name: "Grows" }).first()).toBeVisible({
      timeout: 15000
    });
    await expect(page.getByText("Pro Second Grow")).toBeVisible();
  });
});
