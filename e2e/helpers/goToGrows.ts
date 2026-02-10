import { Page, expect } from "@playwright/test";

  await page.goto("/home/personal/grows");

  // Wait until either we get redirected to auth OR the grows screen mounts.
  await Promise.race([
    page.waitForURL(/\/(login|auth)/, { timeout: 15_000 }),
    page.getByTestId("screen-personal-grows").waitFor({ state: "visible", timeout: 15_000 })
  ]);

  // If we ended up in auth, return (caller can handle/throw)
  const url = page.url();
  if (url.includes("/login") || url.includes("/auth")) return;

  await expect(page.getByTestId("screen-personal-grows")).toBeVisible();
}
