import { expect, test } from "@playwright/test";

type Mode = "personal" | "facility";

const PERSONAL_USER = {
  id: "personal-user",
  email: "personal-shell@example.com",
  password: "Password123",
  plan: "free",
  mode: "personal" as Mode
};

const FACILITY_USER = {
  id: "facility-user",
  email: "facility-shell@example.com",
  password: "Password123",
  plan: "facility",
  mode: "facility" as Mode
};

const ACTIVE_GROW = {
  id: "grow-shell-1",
  name: "Auth Shell Grow",
  status: "vegetating",
  updatedAt: "2026-03-01T00:00:00.000Z"
};

function mePayload(user: typeof PERSONAL_USER | typeof FACILITY_USER) {
  const personalCapabilities = {
    GROWS_PERSONAL_VIEW: true,
    GROWS_PERSONAL_WRITE: true,
    LOGS_PERSONAL_VIEW: true,
    LOGS_PERSONAL_WRITE: true,
    PLANTS_PERSONAL_VIEW: true,
    TOOLS_VPD: true,
    TOOL_NPK: false,
    AI_ASSISTANT: false
  };

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.mode === "facility" ? "Facility Operator" : "Personal Grower",
      plan: user.plan
    },
    ctx: {
      mode: user.mode,
      plan: user.plan,
      facilityId: user.mode === "facility" ? "facility-1" : null,
      facilityRole: user.mode === "facility" ? "MANAGER" : null,
      capabilities:
        user.mode === "facility"
          ? {
              FACILITY_ACCESS: true,
              TASKS_READ: true,
              GROWS_READ: true,
              COMPLIANCE_READ: true
            }
          : personalCapabilities,
      limits: user.mode === "facility" ? {} : { maxGrows: 1, maxPlants: 3 }
    }
  };
}

async function installAuthMeMocks(
  page: any,
  user: typeof PERSONAL_USER | typeof FACILITY_USER
) {
  let meRequests = 0;
  const token = `${user.mode}-shell-e2e-auth-token`;

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem("seenOnboardingCarousel", "true");
    window.localStorage.setItem("seenAppIntro", "true");
    window.global = window;
  });

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
        user: mePayload(user).user
      });
    }

    if (
      method === "GET" &&
      (url.pathname === "/api/me" || url.pathname === "/api/auth/me")
    ) {
      meRequests += 1;
      return fulfillJson(route, mePayload(user));
    }

    if (method === "GET" && url.pathname === "/api/personal/grows") {
      return fulfillJson(route, { grows: [ACTIVE_GROW] });
    }

    if (method === "GET" && url.pathname === "/api/personal/logs") {
      return fulfillJson(route, {
        logs: [
          {
            id: "log-1",
            growId: ACTIVE_GROW.id,
            title: "Canopy check",
            notes: "Even canopy",
            date: "2026-03-02",
            createdAt: "2026-03-02T00:00:00.000Z",
            updatedAt: "2026-03-02T00:00:00.000Z"
          }
        ]
      });
    }

    if (method === "GET" && url.pathname === "/api/personal/plants") {
      return fulfillJson(route, {
        plants: [{ id: "plant-1", growId: ACTIVE_GROW.id, name: "Plant A" }]
      });
    }

    if (method === "GET" && url.pathname === "/api/personal/tasks") {
      return fulfillJson(route, {
        tasks: [
          {
            id: "task-1",
            growId: ACTIVE_GROW.id,
            title: "Water plants",
            description: "Check dryback first",
            dueDate: "2026-03-03",
            completed: false,
            createdAt: "2026-03-01T00:00:00.000Z"
          }
        ]
      });
    }

    if (method === "GET" && url.pathname === "/api/tools") {
      return fulfillJson(route, { tools: [] });
    }

    return fulfillJson(route, { success: true });
  });

  return {
    getMeRequests: () => meRequests
  };
}

async function loginAs(page: any, user: typeof PERSONAL_USER | typeof FACILITY_USER) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Email").fill(user.email);
  await page.getByPlaceholder("Password").fill(user.password);
  await page.getByText("Sign in").last().click();
}

test.describe("auth/me shell selection and capability gating", () => {
  test("personal /api/me bootstraps Personal shell and critical home data", async ({
    page
  }) => {
    const api = await installAuthMeMocks(page, PERSONAL_USER);

    await loginAs(page, PERSONAL_USER);

    await expect(page.getByText("Your Garden")).toBeVisible({ timeout: 30000 });
    await expect(
      page.getByText(/personal-shell@example\.com \| free plan/i)
    ).toBeVisible();
    await expect(page.getByText(ACTIVE_GROW.name)).toBeVisible();
    await expect(page.getByText("Water plants")).toBeVisible();
    await expect(page.getByText(/Canopy check/)).toBeVisible();
    expect(api.getMeRequests()).toBeGreaterThan(0);
  });

  test("personal capabilities from /api/me lock unsupported tools", async ({ page }) => {
    await installAuthMeMocks(page, PERSONAL_USER);
    await loginAs(page, PERSONAL_USER);
    await expect(page.getByText("Your Garden")).toBeVisible({ timeout: 30000 });

    await page.goto("/home/personal/tools", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Tools / AI" })).toBeVisible();
    await expect(page.getByText("VPD Calculator")).toBeVisible();
    await expect(page.getByText("NPK Recipe Calculator")).toBeVisible();
    await expect(page.getByText("Locked").first()).toBeVisible();
    await expect(page.getByText("Upgrade or enable capability").first()).toBeVisible();
  });

  test("facility /api/me selects Facility shell instead of Personal shell", async ({
    page
  }) => {
    const api = await installAuthMeMocks(page, FACILITY_USER);

    await loginAs(page, FACILITY_USER);

    await expect(page.getByText("Operations Live")).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("facility-1")).toBeVisible();
    await expect(page.getByText("Your Garden")).toHaveCount(0);
    expect(api.getMeRequests()).toBeGreaterThan(0);
  });
});
