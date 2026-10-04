"use strict";

// Local, synthetic, network-free Chromium check of the actual web encoder output.
// No app account, uploaded user photo, server, or third-party request is used.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { chromium } = require("playwright");

async function bounded(operation, label) {
  let timer;
  try {
    return await Promise.race([
      operation,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out`)), 15000);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function syntheticExif() {
  const tiff = Buffer.alloc(140);
  tiff.write("II", 0, "ascii");
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(8, 4);
  tiff.writeUInt16LE(2, 8);
  const entry = (offset, tag, type, count, value) => {
    tiff.writeUInt16LE(tag, offset);
    tiff.writeUInt16LE(type, offset + 2);
    tiff.writeUInt32LE(count, offset + 4);
    tiff.writeUInt32LE(value, offset + 8);
  };
  entry(10, 0x0112, 3, 1, 6); // Rotate 90 degrees clockwise.
  entry(22, 0x8825, 4, 1, 38); // GPS IFD, explicitly synthetic 0N/0E.
  tiff.writeUInt16LE(4, 38);
  entry(40, 1, 2, 2, "N".charCodeAt(0));
  entry(52, 2, 5, 3, 92);
  entry(64, 3, 2, 2, "E".charCodeAt(0));
  entry(76, 4, 5, 3, 116);
  for (let offset = 92; offset < 140; offset += 8) tiff.writeUInt32LE(1, offset + 4);
  const payload = Buffer.concat([Buffer.from("Exif\0\0", "binary"), tiff]);
  const marker = Buffer.alloc(4);
  marker.writeUInt16BE(0xffe1, 0);
  marker.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([marker, payload]);
}

function jpegMetadataMarkers(bytes) {
  assert.equal(bytes.readUInt16BE(0), 0xffd8, "Output must be a real JPEG");
  const metadata = [];
  let offset = 2;
  while (offset < bytes.length) {
    assert.equal(bytes[offset], 0xff, "JPEG segment boundary must be valid");
    const marker = bytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) break;
    const size = bytes.readUInt16BE(offset + 2);
    assert.ok(size >= 2 && offset + size + 2 <= bytes.length);
    // APP1 carries EXIF/XMP, APP13 carries IPTC, and COM may contain identifying
    // user comments. Browser-created JFIF/sRGB color-profile segments are allowed.
    if ([0xe1, 0xed, 0xfe].includes(marker)) metadata.push(marker);
    offset += size + 2;
  }
  return metadata;
}

async function main() {
  const source = fs.readFileSync(
    path.join(__dirname, "../src/utils/evidenceImageUpload.ts"),
    "utf8"
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const browser = await chromium.launch({
    headless: true,
    timeout: 15000,
    ...(process.argv.includes("--chrome") ? { channel: "chrome" } : {})
  });
  try {
    console.log("Local image test: isolated Chromium ready.");
    const page = await bounded(browser.newPage(), "Local test page");
    await page.route("**/*", (route) => route.abort());
    const sourceJpeg = Buffer.from(
      await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 80;
        canvas.height = 40;
        const context = canvas.getContext("2d");
        context.fillStyle = "#f00";
        context.fillRect(0, 0, 40, 40);
        context.fillStyle = "#00f";
        context.fillRect(40, 0, 40, 40);
        return canvas.toDataURL("image/jpeg", 0.95).split(",")[1];
      }),
      "base64"
    );
    const selected = Buffer.concat([
      sourceJpeg.subarray(0, 2),
      syntheticExif(),
      sourceJpeg.subarray(2)
    ]);
    assert.deepEqual(jpegMetadataMarkers(selected), [0xe1]);
    assert.ok(
      selected.length < 4096,
      "Exercise a small image that normally bypasses encoding"
    );
    console.log("Local image test: synthetic EXIF/GPS fixture ready.");
    const result = await page.evaluate(
      async ({ compiled, base64 }) => {
        const exports = {};
        // Native modules are not invoked in this browser-only test.
        new Function("exports", "require", compiled)(exports, () => ({}));
        const original = new Blob(
          [Uint8Array.from(atob(base64), (letter) => letter.charCodeAt(0))],
          { type: "image/jpeg" }
        );
        const unchanged = await exports.prepareEvidenceImageForUpload(
          original,
          "fixture.jpg"
        );
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const prepared = await exports
          .prepareEvidenceImageForUpload(original, "fixture.jpg", {
            forceStripMetadata: true,
            signal: controller.signal
          })
          .finally(() => clearTimeout(timeout));
        const bitmap = await createImageBitmap(prepared.blob);
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext("2d");
        context.drawImage(bitmap, 0, 0);
        const pixel = (x, y) => Array.from(context.getImageData(x, y, 1, 1).data);
        const bytes = new Uint8Array(await prepared.blob.arrayBuffer());
        return {
          defaultPreserved: unchanged.blob === original && unchanged.optimized === false,
          optimized: prepared.optimized,
          mimeType: prepared.mimeType,
          width: bitmap.width,
          height: bitmap.height,
          top: pixel(20, 10),
          bottom: pixel(20, 70),
          bytes: Array.from(bytes)
        };
      },
      { compiled, base64: selected.toString("base64") }
    );
    assert.equal(
      result.defaultPreserved,
      true,
      "Default original-preservation must remain unchanged"
    );
    assert.equal(result.optimized, true);
    assert.equal(result.mimeType, "image/jpeg");
    assert.deepEqual(
      [result.width, result.height],
      [40, 80],
      "Apply source EXIF orientation to pixels"
    );
    assert.ok(
      result.top[0] > 220 && result.top[2] < 30,
      "Rotated upper pixels remain red"
    );
    assert.ok(
      result.bottom[2] > 220 && result.bottom[0] < 30,
      "Rotated lower pixels remain blue"
    );
    const output = Buffer.from(result.bytes);
    assert.deepEqual(
      jpegMetadataMarkers(output),
      [],
      "Processed JPEG must contain no EXIF/GPS/XMP/IPTC/comment segments"
    );
    assert.equal(output.includes(Buffer.from("Exif\0\0", "binary")), false);
    console.log(
      "PASS: real Chromium output strips synthetic EXIF/GPS, preserves rotated pixels, and leaves default uploads unchanged."
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
