#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.resolve(ROOT, process.argv[2] || "dist");

function read(relPath) {
  const fullPath = path.join(DIST, relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing web SEO artifact: dist/${relPath}`);
  }
  return fs.readFileSync(fullPath, "utf8");
}

function requireIncludes(contents, needle, label) {
  if (!contents.includes(needle)) {
    throw new Error(`${label} missing: ${needle}`);
  }
}

function main() {
  const robots = read("robots.txt");
  requireIncludes(robots, "User-agent: *", "robots.txt");
  requireIncludes(robots, "Allow: /", "robots.txt");
  requireIncludes(robots, "Disallow: /home/", "robots.txt");
  requireIncludes(robots, "Disallow: /admin", "robots.txt");
  requireIncludes(robots, "Disallow: /facilities", "robots.txt");
  requireIncludes(robots, "Disallow: /onboarding/", "robots.txt");
  requireIncludes(robots, "Sitemap: https://growpathai.com/sitemap.xml", "robots.txt");

  const sitemap = read("sitemap.xml");
  const indexNowKey = "growpathai-2026-indexnow-7f4b2a91c6d8e305";
  if (read(`${indexNowKey}.txt`).trim() !== indexNowKey) {
    throw new Error("IndexNow ownership key file is invalid");
  }
  for (const url of [
    "https://growpathai.com",
    "https://growpathai.com/features",
    "https://growpathai.com/pricing",
    "https://growpathai.com/personal-grower",
    "https://growpathai.com/commercial-cultivation",
    "https://growpathai.com/facility-management",
    "https://growpathai.com/nurseries-breeders",
    "https://growpathai.com/grow-stores",
    "https://growpathai.com/creators-educators",
    "https://growpathai.com/about",
    "https://growpathai.com/contact",
    "https://growpathai.com/ai-cultivation-disclaimer",
    "https://growpathai.com/register",
    "https://growpathai.com/store",
    "https://growpathai.com/courses",
    "https://growpathai.com/communities",
    "https://growpathai.com/field-observations",
    "https://growpathai.com/forum",
    "https://growpathai.com/privacy",
    "https://growpathai.com/terms",
    "https://growpathai.com/support",
    "https://growpathai.com/vs/growtrackr",
    "https://growpathai.com/grow-journal-app"
  ]) {
    requireIncludes(sitemap, `<loc>${url}</loc>`, "sitemap.xml");
  }
  if (sitemap.includes("<loc>https://growpathai.com/feed</loc>")) {
    throw new Error("Campaign workspace must not be included in the public sitemap");
  }
  const campaignWorkspace = read(path.join("feed", "index.html"));
  requireIncludes(campaignWorkspace, 'content="noindex,follow"', "campaign workspace");
  const features = read(path.join("features", "index.html"));
  for (const href of ["/communities", "/field-observations"]) {
    requireIncludes(features, `href="${href}"`, "Features public discovery links");
  }

  const home = read("index.html");
  requireIncludes(
    home,
    "<title>GrowPathAI | The grow journal that remembers every run</title>",
    "root HTML"
  );
  requireIncludes(home, '<meta name="robots" content="index,follow" />', "root HTML");
  requireIncludes(
    home,
    '<link rel="canonical" href="https://growpathai.com" />',
    "root HTML"
  );
  requireIncludes(home, '<meta property="og:title"', "root HTML");
  requireIncludes(home, '<script type="application/ld+json">', "root HTML");
  requireIncludes(home, '"@type":"SoftwareApplication"', "root HTML");
  requireIncludes(home, '<main id="seo-content"', "root HTML");
  requireIncludes(
    home,
    "<h1>The grow journal that remembers every run.</h1>",
    "root HTML"
  );

  const courses = read(path.join("courses", "index.html"));
  requireIncludes(courses, "<title>GrowPathAI Courses</title>", "courses HTML");
  requireIncludes(
    courses,
    '<link rel="canonical" href="https://growpathai.com/courses" />',
    "courses HTML"
  );

  const privateShell = read(path.join("home", "personal", "index.html"));
  requireIncludes(
    privateShell,
    '<meta name="robots" content="noindex,follow" />',
    "private shell HTML"
  );

  for (const privatePath of [
    ["admin", "index.html"],
    ["profile", "index.html"],
    ["facilities", "index.html"],
    ["onboarding", "index.html"],
    ["courses", "create", "index.html"]
  ]) {
    const html = read(path.join(...privatePath));
    requireIncludes(
      html,
      '<meta name="robots" content="noindex,follow" />',
      `${privatePath.join("/")} private HTML`
    );
  }

  for (const publicPath of [
    "features",
    "pricing",
    "personal-grower",
    "commercial-cultivation",
    "facility-management",
    "nurseries-breeders",
    "grow-stores",
    "creators-educators",
    "about",
    "contact",
    "ai-cultivation-disclaimer"
  ]) {
    const html = read(path.join(publicPath, "index.html"));
    requireIncludes(html, '<meta name="robots" content="index,follow" />', publicPath);
    requireIncludes(
      html,
      `<link rel="canonical" href="https://growpathai.com/${publicPath}" />`,
      publicPath
    );
    requireIncludes(html, '<main id="seo-content"', publicPath);
    requireIncludes(html, '"@type":"WebPage"', publicPath);
    requireIncludes(html, '"@type":"BreadcrumbList"', publicPath);
  }

  const manifest = JSON.parse(read("site.webmanifest"));
  if (manifest.name !== "GrowPathAI" || manifest.start_url !== "/") {
    throw new Error("site.webmanifest does not describe the GrowPath web app");
  }
  for (const route of [
    "pricing",
    "about",
    "features",
    "vs/plntrk",
    "vs/grow-with-jane",
    "vs/growtrackr",
    "grow-journal-app"
  ]) {
    const html = read(path.join(route, "index.html"));
    if ((html.match(/rel="canonical"/g) || []).length !== 1)
      throw new Error("Duplicate canonical: " + route);
    requireIncludes(html, 'href="https://growpathai.com/' + route + '"', route);
  }
  const pricing = read(path.join("pricing", "index.html"));
  requireIncludes(pricing, '"@type":"FAQPage"', "pricing");
  for (const price of ["0", "10", "50", "100"])
    requireIncludes(pricing, '"price":"' + price + '"', "pricing");
  requireIncludes(read("llms.txt"), "# GrowPathAI", "llms");
  for (const route of ["vs/growtrackr", "grow-journal-app"]) {
    requireIncludes(read("llms.txt"), route, "llms new page");
  }
  const about = read(path.join("about", "index.html"));
  requireIncludes(about, 'src="/images/founder-jay.jpg"', "founder portrait");
  requireIncludes(about, 'alt="Jay, founder of GrowPathAI"', "founder portrait alt");
  const portrait = fs.readFileSync(path.join(DIST, "images", "founder-jay.jpg"));
  if (portrait[0] !== 0xff || portrait[1] !== 0xd8 || portrait.length > 50000) {
    throw new Error("Founder portrait is missing, invalid, or unexpectedly large");
  }

  console.log("Web SEO verification passed.");
}

try {
  main();
} catch (err) {
  console.error(`Web SEO verification failed: ${err?.message || err}`);
  process.exit(1);
}
