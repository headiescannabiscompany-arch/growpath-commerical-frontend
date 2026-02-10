import { test, expect } from "@playwright/test";
import { goToPersonalGrows } from "./helpers/goToGrows";

test("Personal Grows: list → create → open", async ({ page }) => {
  await goToPersonalGrows(page);

  if (page.url().includes("/login") || page.url().includes("/auth")) {
    throw new Error(
      "E2E hit login screen. Either run with a pre-authenticated session, or add login testIDs so we can automate login."
    );
  }

  await page.waitForResponse((r) => r.url().includes("/api/grows") && r.status() === 200);

  const createFirst = page.getByTestId("btn-create-first-grow");
  const newGrow = page.getByTestId("btn-new-grow");

  if (await createFirst.isVisible().catch(() => false)) {
    await createFirst.click();
  } else {
    await newGrow.click();
  }

  await expect(page.getByText("New grow")).toBeVisible();

  const growName = `E2E Grow ${Date.now()}`;
  await page.getByTestId("input-grow-name").fill(growName);

  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/api/grows") && (r.status() === 200 || r.status() === 201)
    ),
    page.getByTestId("btn-save-grow").click()
  ]);

  await expect(page.getByText("Grows")).toBeVisible();
  await expect(page.getByText(growName)).toBeVisible();

  await page.getByText(growName).click();
  await expect(page.getByText("Grow")).toBeVisible();
});
