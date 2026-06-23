import { expect, test } from "@playwright/test";

async function loginSeedFacilityUser(page: any) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Email").fill("facility@growpath.com");
  await page.getByPlaceholder("Password").fill("Test1234!");
  await page.getByText("Sign in").last().click();
  await page.waitForURL((url: URL) => !url.pathname.endsWith("/login"), {
    timeout: 30000
  });
}

test("Facility workflow: auto-select facility, create room, create task", async ({ page }) => {
  await loginSeedFacilityUser(page);
  await expect(page.getByText("Facility Dashboard")).toBeVisible({ timeout: 30000 });

  await page.getByRole("tab", { name: /Rooms/ }).click();
  await expect(page.getByRole("heading", { name: "Rooms" })).toBeVisible({
    timeout: 30000
  });

  const roomName = `E2E Room ${Date.now()}`;
  await page.getByPlaceholder("Room name").fill(roomName);
  await page.getByText("Create Room").click();
  await expect(page.getByText("Room created.")).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(roomName).first()).toBeVisible();

  await page.getByRole("tab", { name: /Tasks/ }).click();
  await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible({
    timeout: 30000
  });

  const taskTitle = `E2E Task ${Date.now()}`;
  await page.getByPlaceholder("Task title").fill(taskTitle);
  await page.getByPlaceholder("Notes").fill("Created by Playwright live workflow.");
  await page.getByPlaceholder("YYYY-MM-DD").fill("2026-06-23");
  await page.getByText("Create Task").click();
  await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 30000 });
});
