"use strict";
// Explicit local release verification. No serving, publishing, installs or secrets.
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os");
const crypto = require("node:crypto"),
  { spawn } = require("node:child_process");
const repo = path.resolve(__dirname, ".."),
  root = fs.mkdtempSync(path.join(os.tmpdir(), "r09-production-export-"));
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
const env = Object.fromEntries(
  ["SystemRoot", "WINDIR", "PATH", "TEMP", "TMP"]
    .filter((k) => process.env[k] !== undefined)
    .map((k) => [k, process.env[k]])
);
Object.assign(env, {
  NODE_ENV: "production",
  EXPO_OFFLINE: "1",
  EXPO_NO_DOTENV: "1",
  EXPO_NO_TELEMETRY: "1",
  CI: "1",
  EXPO_HOME: path.join(root, "expo-state"),
  BABEL_CACHE_PATH: path.join(root, "babel.json"),
  EXPO_PUBLIC_API_URL: "https://api.growpathai.com",
  GROWPATH_SITE_URL: "https://growpathai.com",
  NODE_OPTIONS: `--require=${path.join(repo, "tests/fixtures/courseGiftReleaseExportOffline.cjs")}`
});
const out = path.join(root, "web");
const child = spawn(
  process.execPath,
  [
    path.join(repo, "scripts/export-production-web.cjs"),
    "--target",
    "production",
    "--out",
    out
  ],
  {
    cwd: repo,
    env,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"]
  }
);
child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);
let stopping = false;
const timer = setTimeout(
  () => {
    stopping = true;
    child.kill();
  },
  8 * 60 * 1000
);
const read = (p) => fs.readFileSync(path.join(out, p), "utf8");
function assert(value, label) {
  if (!value) throw Error(label);
}
function scan(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? scan(path.join(dir, e.name)) : [path.join(dir, e.name)]
    );
}
child.on("error", (e) => {
  console.error(e.message);
  process.exitCode = 1;
});
child.on("close", (code) => {
  clearTimeout(timer);
  try {
    assert(code === 0 && !stopping, "Full production export failed");
    const privatePages = [
      "claim-course-gift/index.html",
      "course-gifts/checkout/index.html"
    ].map((p) => {
      const html = read(p);
      const checks = {
        noindex: /noindex,nofollow,noarchive/.test(html),
        noReferrer: /name="referrer" content="no-referrer"/.test(html),
        noCanonical: !/rel="canonical"/.test(html),
        noOgUrl: !/property="og:url"/.test(html),
        noStructuredData: !/application\/ld\+json/.test(html),
        bootstrap: /_expo\/static\/js\/web/.test(html)
      };
      assert(Object.values(checks).every(Boolean), `Private shell failed: ${p}`);
      return { path: p, sha256: sha(html), ...checks };
    });
    const files = scan(out)
      .map((p) => {
        const bytes = fs.readFileSync(p);
        return {
          path: path.relative(out, p).replaceAll("\\", "/"),
          bytes: bytes.length,
          sha256: sha(bytes)
        };
      })
      .sort((a, b) => a.path.localeCompare(b.path));
    const bundles = files.filter((f) => /^_expo\/static\/js\/web\/.*\.js$/.test(f.path));
    const text = bundles.map((f) => read(f.path)).join("\n");
    assert(text.includes("https://api.growpathai.com"), "Production API missing");
    assert(!text.includes("sk_live_SYNTHETIC_NOT_A_KEY"), "Synthetic test input leaked");
    assert(
      !read("sitemap.xml").includes("claim-course-gift") &&
        !read("sitemap.xml").includes("course-gifts/checkout"),
      "Private route in sitemap"
    );
    assert(
      read("robots.txt").includes("Disallow: /course-gifts/"),
      "Private robots rule missing"
    );
    const rootSource = fs.readFileSync(path.join(repo, "src/app/_layout.tsx"), "utf8");
    assert(
      rootSource.includes(
        'import CourseGiftWebBoundary from "@/components/courseGifts/CourseGiftWebBoundary"'
      ) && !rootSource.includes("PreparedProductionCourseGiftWebBoundary"),
      "Normal root must remain OFF"
    );
    console.log(
      "R09_EXPORT_EVIDENCE=" +
        JSON.stringify({
          status: "PASS",
          files: files.length,
          bytes: files.reduce((n, f) => n + f.bytes, 0),
          manifestSha256: sha(JSON.stringify(files)),
          privatePages,
          bundles,
          normalRootOff: true,
          fullExport: true,
          browserStarted: false,
          hosted: false
        })
    );
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    const resolved = fs.realpathSync(root);
    if (
      path.dirname(resolved) !== fs.realpathSync(os.tmpdir()) ||
      !path.basename(resolved).startsWith("r09-production-export-")
    )
      throw Error("Refuse unexpected cleanup");
    fs.rmSync(resolved, { recursive: true, force: true });
    console.log("R09_EXPORT_TEMP_CLEANED");
  }
});
