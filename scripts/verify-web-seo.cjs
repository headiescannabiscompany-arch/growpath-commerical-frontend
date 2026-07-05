#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");

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
  requireIncludes(robots, "Sitemap: https://growpathai.com/sitemap.xml", "robots.txt");

  const sitemap = read("sitemap.xml");
  for (const url of [
    "https://growpathai.com",
    "https://growpathai.com/register",
    "https://growpathai.com/store",
    "https://growpathai.com/courses",
    "https://growpathai.com/feed",
    "https://growpathai.com/forum",
    "https://growpathai.com/privacy",
    "https://growpathai.com/terms",
    "https://growpathai.com/support"
  ]) {
    requireIncludes(sitemap, `<loc>${url}</loc>`, "sitemap.xml");
  }

  const home = read("index.html");
  requireIncludes(
    home,
    "<title>GrowPathAI | AI grow planning, tracking, and facility tools</title>",
    "root HTML"
  );
  requireIncludes(
    home,
    '<meta name="robots" content="index,follow" />',
    "root HTML"
  );
  requireIncludes(
    home,
    '<link rel="canonical" href="https://growpathai.com" />',
    "root HTML"
  );
  requireIncludes(home, '<meta property="og:title"', "root HTML");

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

  const manifest = JSON.parse(read("site.webmanifest"));
  if (manifest.name !== "GrowPathAI" || manifest.start_url !== "/") {
    throw new Error("site.webmanifest does not describe the GrowPathAI web app");
  }

  console.log("Web SEO verification passed.");
}

try {
  main();
} catch (err) {
  console.error(`Web SEO verification failed: ${err?.message || err}`);
  process.exit(1);
}
