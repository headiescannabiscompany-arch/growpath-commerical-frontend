// Exported UI acceptance with synthetic responses only. No hosted network, account,
// scanner, provider, or native/handset evidence is produced by this harness.
const { chromium, expect } = require("@playwright/test");
const fs = require("node:fs/promises");
const path = require("node:path");
const assert = require("node:assert/strict");
const root = path.resolve(
  __dirname,
  "..",
  process.argv[2] || "dist-a04-document-formats-20261007"
);
const origin = "http://localhost:19427";
const fac = "111111111111111111111111",
  courseId = "222222222222222222222222",
  lessonId = "333333333333333333333333";
const assetId = "444444444444444444444444";
const docUrl = `/api/course-media/${assetId}/file`;
const docx = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const xlsx = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const mimes = ["application/pdf", "text/plain", "text/csv", docx, xlsx];
const base = `/api/facility/${fac}/course-documents`;
const courses = `/api/facility/${fac}/courses`;
const user = {
  id: "777777777777777777777777",
  email: "document-author@qa.invalid",
  displayName: "Synthetic author",
  role: "user",
  plan: "facility",
  subscriptionStatus: "active",
  emailVerified: true,
  mode: "facility",
  hasCompletedOnboarding: true
};
const ctx = {
  mode: "facility",
  plan: "facility",
  facilityId: fac,
  facilityRole: "OWNER",
  facilityFeaturesEnabled: true,
  capabilities: {},
  limits: {}
};
const permissions = {
  canCreateDraft: true,
  canEditCourse: true,
  canEditLessons: true,
  canSetPrice: true,
  canPublish: true,
  canUnpublish: true,
  canArchive: true
};
const course = {
  _id: courseId,
  facilityId: fac,
  authoringSource: "facility_workspace",
  title: "Synthetic document UI",
  published: false,
  visibility: "facilityOnly",
  permissions,
  lessons: [
    {
      _id: lessonId,
      title: "Existing lesson",
      content: "Preserve this content",
      pdfUrl: "/api/course-media/888888888888888888888888/file",
      documentUrls: ["/api/course-media/999999999999999999999999/file"]
    }
  ]
};
const status = (active = false) => ({
  ok: true,
  assetId,
  status: active ? "active" : "scan_pending",
  activationAllowed: active,
  ...(active ? { url: docUrl } : {})
});
async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const compact = process.argv[3] === "mobile";
  const context = await browser.newContext({
    viewport: compact ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    serviceWorkers: "block"
  });
  const page = await context.newPage();
  const uploads = [],
    saves = [],
    unexpected = [],
    lookups = [],
    promotions = [];
  let mode = "reject",
    recentMime = xlsx,
    policy = mimes;
  try {
    await context.addInitScript(() => {
      localStorage.setItem("auth_token_v1", "synthetic-local-only");
      localStorage.setItem("seenOnboardingCarousel", "true");
      localStorage.setItem("seenAppIntro", "true");
    });
    page.on("dialog", (dialog) => dialog.accept());
    await context.route("**/*", async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        p = url.pathname;
      const json = (data, code = 200) =>
        route.fulfill({
          status: code,
          contentType: "application/json",
          body: JSON.stringify(data),
          headers: {
            "access-control-allow-origin": origin,
            "access-control-allow-headers": "*",
            "access-control-allow-methods": "*"
          }
        });
      if (req.method() === "OPTIONS") return json({});
      if (p.startsWith("/api/")) {
        if (["/api/me", "/api/auth/me"].includes(p)) return json({ user, ctx });
        if (p === "/api/presence/heartbeat") return json({ ok: true });
        if (p === "/api/facilities")
          return json({ facilities: [{ id: fac, name: "Synthetic local Facility" }] });
        if (p === `${base}/capabilities`)
          return json({ ok: true, enabled: true, maxBytes: 10485760, mimeTypes: policy });
        if (p === base && req.method() === "POST") {
          uploads.push({
            key: req.headers()["idempotency-key"],
            body: req.postDataBuffer().toString()
          });
          if (mode === "reject")
            return json(
              {
                code: "DOCUMENT_FILE_REJECTED",
                message: "Synthetic unsupported content"
              },
              422
            );
          return json({ message: "Synthetic lost response" }, 503);
        }
        if (p.startsWith(`${base}/uploads/by-key/`)) {
          lookups.push(p.split("/").pop());
          return json(status());
        }
        if (p === `${base}/${assetId}/promote`) {
          promotions.push(req.method());
          return json(status(true));
        }
        if (p === `${base}/${assetId}`) return json(status(true));
        if (p === `${base}/uploads/recent`)
          return json({
            ok: true,
            items: [
              {
                ...status(true),
                filename: recentMime === xlsx ? "synthetic.xlsx" : "synthetic.docx",
                mimeType: recentMime,
                bytes: 32,
                createdAt: "2026-10-07T12:00:00.000Z"
              }
            ]
          });
        if (p === courses && req.method() === "GET")
          return json({
            courses: [course],
            permissions,
            limits: {
              maxPaidCourses: 10,
              maxLessonsPerCourse: 50,
              currentPublishedPaidCourses: 0
            }
          });
        if (p === `${courses}/${courseId}` && req.method() === "GET")
          return json({ course });
        if (
          (p === `${courses}/${courseId}/lessons/${lessonId}` &&
            req.method() === "PUT") ||
          (p === courses && req.method() === "POST")
        ) {
          saves.push(req.postDataJSON());
          return json({ course });
        }
        if (req.method() !== "GET") unexpected.push(`${req.method()} ${p}`);
        return json({ message: "Outside isolated acceptance scope" }, 404);
      }
      if (url.origin !== origin) return route.abort();
      let relative = decodeURIComponent(p).replace(/^\/+/, "");
      if (!relative || !path.extname(relative)) relative = "index.html";
      const file = path.resolve(root, relative);
      if (!file.startsWith(root + path.sep)) return route.abort();
      try {
        return route.fulfill({
          body: await fs.readFile(file),
          contentType:
            {
              ".html": "text/html",
              ".js": "text/javascript",
              ".css": "text/css",
              ".png": "image/png",
              ".svg": "image/svg+xml",
              ".woff2": "font/woff2",
              ".ttf": "font/ttf"
            }[path.extname(file)] || "application/octet-stream"
        });
      } catch {
        return route.fulfill({ status: 404, body: "Local fixture asset missing" });
      }
    });
    const edit = `${origin}/home/facility/courses?action=edit-lesson&courseId=${courseId}&lessonId=${lessonId}`;
    const picker = () =>
      page.getByRole("button", { name: "Choose and scan document", exact: true });
    async function choose(name, mimeType) {
      const pending = page.waitForEvent("filechooser");
      await picker().click();
      const chooser = await pending;
      assert.equal(chooser.isMultiple(), false);
      assert.deepEqual(
        (await chooser.element().getAttribute("accept")).split(",").sort(),
        [...policy].sort()
      );
      await chooser.setFiles({
        name,
        mimeType,
        buffer: Buffer.from("Synthetic browser transport bytes only")
      });
    }
    await page.goto(edit);
    await picker().waitFor({ timeout: 20000 });
    await expect(page.getByText(/Legacy DOC\/XLS files are not accepted/)).toBeVisible();
    await choose("synthetic.docx", docx);
    await expect(
      page.getByText(/This file is invalid or uses unsupported content/)
    ).toBeVisible();
    await expect(picker()).toBeEnabled();
    assert.equal(uploads.length, 1);
    mode = "lost";
    await choose("synthetic.docx", docx);
    await expect(page.getByText(/Document verification is unavailable/)).toBeVisible();
    assert.equal(uploads.length, 2);
    assert.notEqual(uploads[0].key, uploads[1].key);
    assert.ok(uploads[1].body.includes(`Content-Type: ${docx}`));
    assert.ok(uploads[1].body.includes('filename="synthetic.docx"'));
    assert.equal(await picker().count(), 0);
    await page
      .getByRole("button", { name: "Check document status", exact: true })
      .click();
    await expect(
      page.getByText(/Document verified and selected: synthetic.docx/)
    ).toBeVisible();
    assert.deepEqual(lookups, [uploads[1].key]);
    assert.deepEqual(promotions, ["POST"]);
    await page.getByLabel("Save lesson changes", { exact: true }).click();
    await expect.poll(() => saves.length).toBe(1);
    assert.equal(saves[0].pdfUrl, course.lessons[0].pdfUrl);
    assert.deepEqual(saves[0].documentUrls, [...course.lessons[0].documentUrls, docUrl]);
    assert.equal(uploads.length, 2);
    await page.goto(`${origin}/home/facility/courses?action=create`);
    await picker().waitFor();
    await page
      .getByRole("button", { name: "Recover a previous document upload", exact: true })
      .click();
    await page.getByRole("button", { name: /Recheck synthetic.xlsx/ }).click();
    await expect(
      page.getByText("Verified document selected: synthetic.xlsx", { exact: true })
    ).toBeVisible();
    await page
      .getByLabel("Course title", { exact: true })
      .fill("Synthetic recovered document draft");
    await page.getByLabel("Create course draft", { exact: true }).click();
    await expect.poll(() => saves.length).toBe(2);
    assert.equal(saves[1].documents[0].fileType, xlsx);
    assert.equal(saves[1].documents[0].storageUrl, docUrl);
    assert.equal(saves[1].documents[0].fileName, "synthetic.xlsx");
    assert.equal(uploads.length, 2);
    policy = ["application/pdf"];
    await page.goto(edit);
    await picker().waitFor();
    await expect(
      page.getByText("Supported here: PDF. Maximum 10 MB per file.", { exact: true })
    ).toBeVisible();
    assert.equal(
      await page.getByText(/Legacy DOC\/XLS files are not accepted/).count(),
      0
    );
    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    assert.equal(horizontalOverflow, false);
    assert.deepEqual(unexpected, []);
    console.log(
      `PASS ${compact ? "compact 390x844" : "desktop 1280x900"}: exported picker filter, rejected-file retry, ambiguous-response lookup without resend, explicit scan check, lesson PDF preservation, recovered XLSX course MIME, PDF-only policy, no horizontal page overflow. Synthetic network only; not hosted/native/scanner evidence.`
    );
  } catch (error) {
    console.error((await page.locator("body").innerText()).slice(0, 6500));
    throw error;
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});
