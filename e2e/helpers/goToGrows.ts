import { Page, expect } from "@playwright/test";

export async function goToPersonalGrows(page: Page) {
  await page.goto("/home/personal/grows", { waitUntil: "domcontentloaded" });

  const AUTH_URL = /\/(\(auth\)\/)?(login|auth)(\/|$)/;
  const growsScreen = page.getByTestId("screen-personal-grows");

  // Wait until we either land on grows OR get redirected to auth.
  await Promise.race([
    growsScreen.waitFor({ state: "visible", timeout: 30_000 }),
    page.waitForURL(AUTH_URL, { timeout: 30_000 })
  ]);

  if (AUTH_URL.test(page.url())) return;

  await expect(growsScreen).toBeVisible({ timeout: 5_000 });
}
