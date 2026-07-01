import { expect, test } from "@playwright/test";

function fulfillJson(route: any, body: any, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  });
}

async function installMocks(page: any) {
  let exportCalls = 0;
  let deleteCalls = 0;
  let deletePayload: any = null;
  let exportAuthHeader = "";
  let deleteAuthHeader = "";
  await page.addInitScript(() => {
    window.localStorage.setItem("auth_token_v1", "profile-privacy-token");
    window.localStorage.setItem("seenOnboardingCarousel", "true");
    window.localStorage.setItem("seenAppIntro", "true");
    window.global = window;
  });

  await page.exposeFunction("getExportCalls", () => exportCalls);
  await page.exposeFunction("getDeleteCalls", () => deleteCalls);
  await page.exposeFunction("getDeletePayload", () => deletePayload);
  await page.exposeFunction("getExportAuthHeader", () => exportAuthHeader);
  await page.exposeFunction("getDeleteAuthHeader", () => deleteAuthHeader);

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
          id: "profile-privacy-user",
          _id: "profile-privacy-user",
          email: "privacy@example.com",
          plan: "pro"
        },
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

    if (url.pathname.startsWith("/api/privacy/")) {
      return fulfillJson(
        route,
        { error: { message: "Legacy privacy endpoint must not be used" } },
        410
      );
    }

    if (method === "GET" && url.pathname === "/api/account/export") {
      exportCalls += 1;
      exportAuthHeader = request.headers().authorization || "";
      return fulfillJson(route, {
        exportedAt: "2026-06-30T00:00:00.000Z",
        user: { email: "privacy@example.com" },
        grows: [{ name: "Export Grow" }],
        growLogs: [],
        tasks: [],
        retentionNotice: "This export excludes password hashes."
      });
    }

    if (method === "DELETE" && url.pathname === "/api/account/delete") {
      deleteCalls += 1;
      deleteAuthHeader = request.headers().authorization || "";
      deletePayload = request.postDataJSON();
      return fulfillJson(route, {
        ok: true,
        deleted: true,
        deletedAt: "2026-07-01T00:00:00.000Z",
        retainedRecords:
          "Grow history, logs, and audit-linked records may remain in anonymized form."
      });
    }

    return fulfillJson(route, { ok: true });
  });
}

test.describe("profile privacy controls", () => {
  for (const size of [
    { name: "desktop", width: 1280, height: 1000 },
    { name: "mobile", width: 390, height: 1000 }
  ]) {
    test(`shows export and guarded deletion on ${size.name}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await installMocks(page);

      await page.goto("/home/personal/profile", { waitUntil: "domcontentloaded" });

      await expect(page.getByText("Privacy and account data")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Export account data" })
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Delete account" })).toBeDisabled();

      await page.getByRole("button", { name: "Export account data" }).click();
      await expect(page.getByText("Data export downloaded.")).toBeVisible();
      await expect(await page.evaluate(() => (window as any).getExportCalls())).toBe(1);
      await expect(await page.evaluate(() => (window as any).getExportAuthHeader())).toBe(
        "Bearer profile-privacy-token"
      );

      await page.getByLabel("Delete account confirmation").fill("DELETE");
      await expect(page.getByRole("button", { name: "Delete account" })).toBeEnabled();

      page.once("dialog", async (dialog) => {
        expect(dialog.message()).toContain("anonymizes your account");
        await dialog.accept();
      });
      await page.getByRole("button", { name: "Delete account" }).click();
      await expect(page).toHaveURL(/\/login/);
      await expect(await page.evaluate(() => (window as any).getDeleteCalls())).toBe(1);
      await expect(await page.evaluate(() => (window as any).getDeleteAuthHeader())).toBe(
        "Bearer profile-privacy-token"
      );
      await expect(await page.evaluate(() => (window as any).getDeletePayload())).toEqual(
        { reason: "user_requested_from_profile" }
      );

      await page.screenshot({
        path: `tmp/screenshots/profile-privacy-${size.name}.png`,
        fullPage: true
      });
    });
  }
});
