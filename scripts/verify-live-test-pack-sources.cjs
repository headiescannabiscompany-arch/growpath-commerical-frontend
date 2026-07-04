#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const fixturePath = path.join(ROOT, "tests", "fixtures", "growpath-live-test-packs.json");
const allowPlaceholders = process.argv.includes("--allow-placeholders");

function isPlaceholder(value) {
  return typeof value === "string" && /^TODO_/.test(value);
}

function isExternalUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function visit(value, pointer, findings) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => visit(item, `${pointer}/${index}`, findings));
    return;
  }

  if (!value || typeof value !== "object") return;

  for (const [key, child] of Object.entries(value)) {
    const childPointer = `${pointer}/${key}`;
    if (
      [
        "sourceUrl",
        "photoSetUrl",
        "sourceLink",
        "photoSourceLink",
        "sourcePhotoUrl"
      ].includes(key)
    ) {
      if (isPlaceholder(child)) {
        findings.placeholders.push({ path: childPointer, value: child });
      } else if (!isExternalUrl(child)) {
        findings.invalidUrls.push({ path: childPointer, value: child });
      }
    }

    if (["uploadedAssetUri", "localFilePath"].includes(key)) {
      findings.rehostedAssets.push({ path: childPointer, value: child });
    }

    visit(child, childPointer, findings);
  }
}

function summarizeByPack(fixture, findings) {
  return fixture.packs.map((pack, index) => {
    const prefix = `/packs/${index}/`;
    const placeholders = findings.placeholders.filter((item) =>
      item.path.startsWith(prefix)
    );
    const invalidUrls = findings.invalidUrls.filter((item) =>
      item.path.startsWith(prefix)
    );
    return {
      id: pack.id,
      accountType: pack.accountType,
      sourceRequiredBeforeSeeding:
        pack.realGrowData?.sourceRequiredBeforeSeeding === true,
      placeholderCount: placeholders.length,
      invalidUrlCount: invalidUrls.length
    };
  });
}

function main() {
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  const findings = {
    placeholders: [],
    invalidUrls: [],
    rehostedAssets: []
  };

  if (fixture.rightsPolicy?.copyOrRehostPhotos !== false) {
    throw new Error("Fixture rights policy must keep copyOrRehostPhotos=false.");
  }

  visit(fixture, "", findings);

  const summary = {
    fixture: path.relative(ROOT, fixturePath),
    checkedAt: new Date().toISOString(),
    allowPlaceholders,
    packSummary: summarizeByPack(fixture, findings),
    placeholderCount: findings.placeholders.length,
    invalidUrlCount: findings.invalidUrls.length,
    rehostedAssetCount: findings.rehostedAssets.length
  };

  console.log(JSON.stringify(summary, null, 2));

  if (findings.rehostedAssets.length) {
    console.error("Live test packs must not contain uploadedAssetUri/localFilePath.");
    console.error(JSON.stringify(findings.rehostedAssets.slice(0, 20), null, 2));
    process.exit(1);
  }

  if (findings.invalidUrls.length) {
    console.error(
      "Live test pack source fields must be external URLs or TODO placeholders."
    );
    console.error(JSON.stringify(findings.invalidUrls.slice(0, 20), null, 2));
    process.exit(1);
  }

  if (!allowPlaceholders && findings.placeholders.length) {
    console.error(
      "Live test pack source links are still placeholders. Paste source/photo URLs or rerun with --allow-placeholders for planning checks."
    );
    console.error(JSON.stringify(findings.placeholders.slice(0, 20), null, 2));
    process.exit(1);
  }
}

main();
