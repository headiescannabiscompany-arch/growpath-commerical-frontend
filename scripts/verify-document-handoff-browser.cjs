// Local synthetic UI acceptance only: every network request is fulfilled or
// blocked here. No real login, passkey, document, provider or hosted backend.
const { chromium } = require("@playwright/test");
const fs = require("node:fs/promises");
const path = require("node:path");
const assert = require("node:assert/strict");
const root = path.resolve(
  __dirname,
  "..",
  process.argv[2] || "dist-a04-handoff-20261006"
);
const origin = "http://localhost:19426";
const assetId = "111111111111111111111111";
const previousExecutionId = "444444444444444444444444";
const user = {
  id: "777777777777777777777777",
  _id: "777777777777777777777777",
  email: "document-ui@qa.invalid",
  displayName: "Synthetic document owner",
  role: "admin",
  plan: "free",
  subscriptionStatus: "active",
  emailVerified: true,
  mode: "personal",
  hasCompletedOnboarding: true
};
const ctx = {
  mode: "personal",
  capabilities: {},
  limits: {},
  facilityId: null,
  facilityRole: null,
  facilityFeaturesEnabled: false
};
async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const viewport =
    process.argv[3] === "mobile"
      ? { width: 390, height: 844 }
      : { width: 1280, height: 900 };
  const context = await browser.newContext({
    viewport,
    serviceWorkers: "block"
  });
  const page = await context.newPage();
  const calls = [],
    unexpected = [];
  try {
    await context.addInitScript(() => {
      localStorage.setItem("auth_token_v1", "synthetic-local-only");
      localStorage.setItem("seenOnboardingCarousel", "true");
      localStorage.setItem("seenAppIntro", "true");
      // Test double for the user's device ceremony. This is not authentication evidence.
      Object.defineProperty(navigator.credentials, "get", {
        value: async () => ({
          id: "YQ",
          rawId: new Uint8Array([97]).buffer,
          type: "public-key",
          authenticatorAttachment: "platform",
          getClientExtensionResults: () => ({}),
          response: {
            clientDataJSON: new Uint8Array([1]).buffer,
            authenticatorData: new Uint8Array([2]).buffer,
            signature: new Uint8Array([3]).buffer,
            userHandle: null
          }
        })
      });
    });
    await context.route("**/*", async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      const json = (value, status = 200) =>
        route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(value),
          headers: {
            "access-control-allow-origin": origin,
            "access-control-allow-headers": "*",
            "access-control-allow-methods": "*"
          }
        });
      if (request.method() === "OPTIONS") return json({});
      if (url.pathname.startsWith("/api/")) {
        const p = url.pathname;
        if (p === "/api/presence/heartbeat" && request.method() === "POST")
          return json({ ok: true });
        if (["/api/me", "/api/auth/me"].includes(p))
          return json({ user, ctx, capabilities: {}, limits: {} });
        if (p === "/api/admin/passkeys")
          return json({
            ok: true,
            configured: true,
            enrolled: true,
            enrollmentEnabled: false,
            enforcementEnabled: true,
            passkeys: [],
            stepUpExpiresAt: null
          });
        if (p.endsWith("/passkeys/authentication/options"))
          return json({
            challengeId: "synthetic",
            optionsJSON: {
              challenge: "c3ludGhldGlj",
              rpId: "localhost",
              userVerification: "required",
              allowCredentials: []
            }
          });
        if (p.endsWith("/passkeys/authentication/verify"))
          return json({
            stepUpToken: "synthetic-proof",
            expiresAt: new Date(Date.now() + 300000).toISOString()
          });
        if (p.endsWith("/facility-documents/recovery"))
          return json({
            ok: true,
            rows: [
              {
                assetId,
                code: "REVOKED_CLEANUP_RECHECK_REQUIRED",
                instruction: "Synthetic interrupted cleanup — local UI test only",
                cleanupClaim: {
                  reviewId: "555555555555555555555555",
                  executionId: previousExecutionId
                }
              }
            ],
            nextAfterId: null
          });
        if (p.endsWith("/cleanup-handoff")) {
          assert.equal(request.headers()["x-admin-step-up"], "synthetic-proof");
          const body = request.postDataJSON();
          calls.push({ kind: "handoff", body });
          if (calls.length === 1)
            return json({ message: "Synthetic lost response" }, 503);
          return json({
            ok: true,
            reassigned: true,
            alreadyReassigned: true,
            released: false,
            reviewId: body.reviewId,
            executionId: body.executionId,
            activationAllowed: false,
            cleanupAuthorized: false
          });
        }
        if (p.endsWith("/cleanup")) {
          calls.push({ kind: "cleanup", body: request.postDataJSON() });
          return json({ ok: true, released: true, activationAllowed: false });
        }
        if (request.method() !== "GET") unexpected.push(`${request.method()} ${p}`);
        // Unrelated Admin/read widgets fail closed rather than fabricating their data.
        return json({ message: "Not part of this local fixture" }, 404);
      }
      if (url.origin !== origin) return route.abort();
      let relative = decodeURIComponent(url.pathname).replace(/^\/+/, "");
      if (!relative || !path.extname(relative)) relative = "index.html";
      const file = path.resolve(root, relative);
      if (!file.startsWith(root + path.sep)) return route.abort();
      try {
        const body = await fs.readFile(file);
        const types = {
          ".html": "text/html",
          ".js": "text/javascript",
          ".css": "text/css",
          ".png": "image/png",
          ".svg": "image/svg+xml",
          ".woff2": "font/woff2",
          ".ttf": "font/ttf"
        };
        return route.fulfill({
          body,
          contentType: types[path.extname(file)] || "application/octet-stream"
        });
      } catch {
        return route.fulfill({ status: 404, body: "Local fixture asset missing" });
      }
    });
    await page.goto(`${origin}/admin`);
    await page
      .getByText("Open restricted controls", { exact: true })
      .click({ timeout: 20000 });
    await page
      .getByRole("button", { name: "Set up or verify a passkey", exact: true })
      .click({ timeout: 20000 });
    await page.getByRole("button", { name: "Verify passkey", exact: true }).click();
    await page
      .getByText("Passkey verified for a short Admin session.", { exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Open / refresh document review", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Review cleanup reassignment", exact: true })
      .click();
    const confirmation = page.getByLabel("Cleanup reassignment confirmation", {
      exact: true
    });
    await confirmation.fill(`REASSIGN REVOKED ${assetId} ${previousExecutionId}`);
    await page
      .getByRole("button", { name: "Confirm cleanup reassignment", exact: true })
      .click();
    await page.getByText(/Not confirmed\. Controls may/).waitFor();
    await page
      .getByRole("button", { name: "Open / refresh document review", exact: true })
      .click();
    await confirmation.fill(`REASSIGN REVOKED ${assetId} ${previousExecutionId}`);
    await page
      .getByRole("button", { name: "Confirm cleanup reassignment", exact: true })
      .click();
    await page.getByText(/Cleanup reassigned\. Reassignment did not/).waitFor();
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0], calls[1]);
    const remove = page.getByRole("button", {
      name: "Permanently remove reviewed revoked copy",
      exact: true
    });
    assert.equal(await remove.isDisabled(), true);
    await page
      .getByLabel("Document review confirmation", { exact: true })
      .fill(`DELETE REVOKED ${assetId} ${calls[1].body.reviewId}`);
    await remove.click();
    await page.getByText(/Server confirmed removal/).waitFor();
    assert.equal(calls.length, 3);
    assert.equal(calls[2].body.executionId, calls[1].body.executionId);
    assert.deepEqual(unexpected, []);
    console.log(
      "PASS: exact exported Admin UI, synthetic passkey double, lost-response retry and separate removal; all network isolated, no hosted mutation."
    );
  } catch (error) {
    console.error((await page.locator("body").innerText()).slice(0, 6000));
    throw error;
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
