import { test, expect } from "@playwright/test";
import { goToPersonalGrows } from "./helpers/goToGrows";

type ApiTraceEntry = {
  method: string;
  url: string;
  status: number;
  body: string;
};

async function safeBodySnippet(resp: any): Promise<string> {
  try {
    const text = await resp.text();
    return String(text || "").replace(/\s+/g, " ").slice(0, 300);
  } catch {
    return "";
  }
}

function formatTrace(trace: ApiTraceEntry[]) {
  if (!trace.length) return "(no matching API responses captured)";
  return trace
    .slice(-10)
    .map((t) => `${t.method} ${t.status} ${t.url}${t.body ? ` | ${t.body}` : ""}`)
    .join("\n");
}

async function waitForApiResponse(
  page: any,
  label: string,
  trace: ApiTraceEntry[],
  predicate: (resp: any) => boolean,
  timeout = 30000
) {
  try {
    return await page.waitForResponse(predicate, { timeout });
  } catch {
    throw new Error(`${label} timed out after ${timeout}ms.\nRecent API trace:\n${formatTrace(trace)}`);
  }
}

async function loginIfNeeded(page: any) {
  const needsLogin = page.url().includes("/login") || page.url().includes("/auth");
  if (!needsLogin) return;

  const email = process.env.E2E_EMAIL || "free@growpath.com";
  const password = process.env.E2E_PASSWORD || "Test1234!";

  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);

  const loginResponsePromise = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      r.url().includes("/api/auth/login") &&
      (r.status() === 200 || r.status() === 201 || r.status() === 401 || r.status() === 403),
    { timeout: 30000 }
  );

  await page.getByRole("button", { name: "Sign in" }).click();
  const loginResponse = await loginResponsePromise;
  const loginStatus = loginResponse.status();
  let loginBody = "";
  try {
    loginBody = (await loginResponse.text()).replace(/\s+/g, " ").slice(0, 300);
  } catch {
    // ignore
  }

  if (loginStatus >= 400) {
    throw new Error(
      `Login failed with status ${loginStatus} for ${email}. Response: ${loginBody || "(empty)"}`
    );
  }

  await page.waitForURL((url: URL) => !/\/(\(auth\)\/)?(login|auth)(\/|$)/.test(url.pathname), {
    timeout: 30000
  });
}

test("Personal Grows: list -> create -> open", async ({ page }) => {
  const apiTrace: ApiTraceEntry[] = [];
  const isTrackedApi = (url: string) =>
    url.includes("/api/me") || url.includes("/api/personal/grows") || url.includes("/api/auth/login");

  page.on("response", async (resp) => {
    const url = resp.url();
    if (!isTrackedApi(url)) return;
    apiTrace.push({
      method: resp.request().method(),
      url,
      status: resp.status(),
      body: await safeBodySnippet(resp)
    });
  });
  page.on("requestfailed", (req) => {
    const url = req.url();
    if (!isTrackedApi(url)) return;
    apiTrace.push({
      method: req.method(),
      url,
      status: 0,
      body: `requestfailed: ${req.failure()?.errorText || "unknown"}`
    });
  });

  await goToPersonalGrows(page);
  await loginIfNeeded(page);
  await goToPersonalGrows(page);

  const createFirst = page.getByTestId("btn-create-first-grow");
  const newGrow = page.getByTestId("btn-new-grow");
  const createGrowLink = page.getByRole("link", { name: /\+ New Grow/i });

  if (await createFirst.isVisible().catch(() => false)) {
    await createFirst.click();
  } else if (await newGrow.isVisible().catch(() => false)) {
    await newGrow.click();
  } else {
    await createGrowLink.click();
  }

  await expect(page.getByRole("heading", { name: "New Grow" })).toBeVisible();

  const growName = `E2E Grow ${Date.now()}`;
  await page.getByTestId("input-grow-name").fill(growName);
  await page.getByTestId("input-grow-anchor-date").fill("2026-03-01");

  const createResponsePromise = waitForApiResponse(
    page,
    "Create grow response",
    apiTrace,
    (r) =>
      r.request().method() === "POST" &&
      r.url().includes("/api/personal/grows") &&
      (r.status() === 200 || r.status() === 201),
    45000
  );

  const [createResponse] = await Promise.all([
    createResponsePromise,
    page.getByTestId("btn-save-grow").click()
  ]);

  let createJson: any = null;
  try {
    createJson = await createResponse.json();
  } catch {
    // non-json responses are still available in API trace
  }

  if (createJson && typeof createJson === "object" && "success" in createJson) {
    expect(createJson.success).toBe(true);
  }

  await expect(page.getByText("Grows")).toBeVisible();
  await expect(page.getByText(growName)).toBeVisible();

  await page.getByText(growName).click();
  await expect(page.getByText("Grow")).toBeVisible();
});
