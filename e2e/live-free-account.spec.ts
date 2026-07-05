import { expect, test } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL || "free@growpathai.com";
const PASSWORD = process.env.E2E_PASSWORD || "Test1234!";

async function login(page: any) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Email").fill(EMAIL);
  await page.getByPlaceholder("Password").fill(PASSWORD);
  await page.getByText("Sign in").last().click();
  await page.waitForURL((url: URL) => !url.pathname.endsWith("/login"), {
    timeout: 30000
  });
}

test("live free account can browse gated personal mode and log out", async ({
  page
}, testInfo) => {
  await login(page);

  await expect(page.getByText("Your Garden")).toBeVisible({ timeout: 30000 });
  await page.screenshot({
    path: testInfo.outputPath("live-free-home.png"),
    fullPage: true
  });

  await page.goto("/home/personal/grows", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Grows" }).first()).toBeVisible();
  await expect(page.getByText("Create grows with Pro")).toBeVisible();
  await expect(page.getByText(/Free accounts can browse/i)).toBeVisible();
  await expect(page.getByText(/Triple Bag: clones in production/i).first()).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("live-free-grows-gated.png"),
    fullPage: true
  });

  await page.goto("/home/personal/profile", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Profile" }).first()).toBeVisible();
  await expect(page.getByText("Privacy and account data")).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("live-free-profile.png"),
    fullPage: true
  });

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Log out?");
    await dialog.accept();
  });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.mouse.wheel(0, 1600);
  const logoutButton = page.getByText("Log out").last();
  await expect(logoutButton).toBeVisible();
  await logoutButton.click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});
