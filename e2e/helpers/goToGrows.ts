import { Page, expect } from "@playwright/test";

export async function goToPersonalGrows(page: Page) {
  await page.goto("/home/personal/grows", { waitUntil: "domcontentloaded" });

  // Wait until the router settles on either grows or auth.
  await page.waitForURL(/\/(home\/personal\/grows|login|auth)(\?|$)/, {
    timeout: 15_000
  });

  if (/\/(login|auth)(\?|$)/.test(page.url())) return;

  // Best practice: assert a stable testID instead of text.
  await expect(page.getByTestId("screen-personal-grows")).toBeVisible({
    timeout: 15_000
  });
}
