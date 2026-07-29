#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SITE_URL = "https://growpathai.com";
const ENDPOINT = "https://api.indexnow.org/indexnow";
const dryRun = process.argv.includes("--dry-run");
const key = String(
  process.env.INDEXNOW_KEY || "growpathai-2026-indexnow-7f4b2a91c6d8e305"
).trim();

function fail(message) {
  console.error(`[indexnow] ${message}`);
  process.exit(1);
}

if (!/^[A-Za-z0-9-]{8,128}$/.test(key)) {
  fail("Set INDEXNOW_KEY to an 8-128 character IndexNow key before submitting.");
}

const sitemapPath = path.join(ROOT, "dist", "sitemap.xml");
if (!fs.existsSync(sitemapPath)) {
  fail("dist/sitemap.xml is missing. Run npm run export:web:production first.");
}

const sitemap = fs.readFileSync(sitemapPath, "utf8");
const urlList = Array.from(
  sitemap.matchAll(/<loc>(https:\/\/growpathai\.com[^<]*)<\/loc>/g)
)
  .map((match) => match[1])
  .slice(0, 10_000);

if (!urlList.length) fail("No GrowPathAI URLs were found in dist/sitemap.xml.");

const keyFile = path.join(ROOT, "dist", `${key}.txt`);
fs.writeFileSync(keyFile, key);

const payload = {
  host: "growpathai.com",
  key,
  keyLocation: `${SITE_URL}/${key}.txt`,
  urlList
};

if (dryRun) {
  console.log(`[indexnow] dry run prepared ${urlList.length} URLs.`);
  console.log(`[indexnow] key file: dist/${key}.txt`);
  process.exit(0);
}

fetch(ENDPOINT, {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify(payload)
})
  .then(async (response) => {
    if (!response.ok && response.status !== 202) {
      const body = await response.text();
      fail(`submission failed (${response.status}): ${body.slice(0, 300)}`);
    }
    console.log(`[indexnow] accepted ${urlList.length} URLs (${response.status}).`);
  })
  .catch((error) => fail(error?.message || String(error)));
